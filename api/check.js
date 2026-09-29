// BayanTrust backend — POST /api/check
// Body (JSON): { text: string, imageBase64?: string, imageMediaType?: string, lang?: "en"|"fil" }
// This runs on a server, so — unlike a published Claude artifact page — it is
// allowed to fetch arbitrary external URLs. If `text` contains a link, this
// function actually downloads that page and gives the AI the real, live
// content to judge, instead of just the domain name.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";

const PROMPT = {
  en: `You are a misinformation and scam checker for a Filipino audience. Assess the content below for signs of being fake news, misinformation, a scam/phishing attempt, or genuine/credible content. If live page content from a linked URL is included, judge it directly — you are seeing the real, current page, not just the URL. Consider sensational/urgent language, unverifiable claims, scam/phishing patterns, and whether it matches known facts. Reply with ONLY a JSON object: {"verdict":"real"|"verifiable"|"misleading"|"fake"|"suspicious","confidence":0-100,"explain":[2 short sentences],"evidence":[1-4 short specific observations],"political":boolean}. Content:\n\n`,
  fil: `Ikaw ay isang tagasuri ng maling impormasyon at scam para sa mga Pilipino. Suriin ang nilalaman sa ibaba. Kung kasama ang live na laman ng isang naka-link na page, husgahan ito nang direkta — nakikita mo ang totoo at kasalukuyang page, hindi lang ang URL. Isaalang-alang ang sensasyonal/nakakapanic na pananalita, hindi maberipikang claim, mga pattern ng scam/phishing. Sumagot ng JSON object LANG: {"verdict":"real"|"verifiable"|"misleading"|"fake"|"suspicious","confidence":0-100,"explain":[2 maikling pangungusap sa Filipino],"evidence":[1-4 maikling obserbasyon sa Filipino],"political":boolean}. Nilalaman:\n\n`
};

const URL_RE = /https?:\/\/[^\s]+/i;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

async function fetchLivePage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BayanTrustBot/1.0)" }
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, status: res.status };
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ""])[1].trim();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
    return { ok: true, title, text, finalUrl: res.url };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

export default async function handler(req, res) {
  const headers = corsHeaders();
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Server misconfigured: ANTHROPIC_API_KEY not set" });

  try {
    const { text = "", imageBase64, imageMediaType, lang = "en" } = req.body || {};
    const promptKey = lang === "fil" ? "fil" : "en";

    let liveNote = "";
    const m = (text || "").match(URL_RE);
    if (m) {
      const page = await fetchLivePage(m[0]);
      liveNote = page.ok
        ? `\n\n[Live fetch of ${m[0]}]\nFinal URL: ${page.finalUrl}\nPage title: ${page.title}\nPage text (truncated): ${page.text}`
        : `\n\n[Live fetch of ${m[0]} failed: ${page.error || page.status || "unknown error"} — judge on text/domain alone]`;
    }

    const content = [{ type: "text", text: PROMPT[promptKey] + text + liveNote }];
    if (imageBase64) {
      content.unshift({
        type: "image",
        source: { type: "base64", media_type: imageMediaType || "image/jpeg", data: imageBase64 }
      });
    }

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content }]
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return res.status(502).json({ error: "Anthropic API error", detail: errText });
    }
    const data = await apiRes.json();
    const raw = (data.content || []).map((b) => b.text || "").join("\n");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: "AI did not return JSON", raw });

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ ...parsed, livePageFetched: !!m, fetchedUrl: m ? m[0] : null });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
