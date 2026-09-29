# BayanTrust Backend (Live Link Check)

Itong maliit na server ang kailangan para makapag-**totoong live fetch** ng laman
ng isang link (hindi na lang domain reputation) bago ito ipasuri sa AI.

## 1. Kumuha ng Anthropic API key (~5 minuto)

1. Pumunta sa **console.anthropic.com** at mag-sign up (email o Google).
2. I-verify ang email mo.
3. Pumunta sa **Settings → API Keys**, i-click ang **Create Key**, pangalanan
   (hal. `bayantrust-backend`), i-**kopya at i-save** ang key kaagad — makikita
   mo lang ito nang isang beses.
4. Pumunta sa **Billing**, magdagdag ng payment method. Kailangan ito kahit
   maliit lang ang gagastusin mo — walang gagana ang key kung walang billing.
   Bayad ka lang sa aktwal na gamit (per-request, cents lang bawat check).

## 2. I-deploy sa Vercel (libre)

**Opsyon A — pinakamadali (Vercel CLI, walang GitHub kailangan):**

```bash
npm install -g vercel
cd bayantrust-backend
vercel
```

Susundin mo na lang ang mga prompt (mag-sign up/log in sa Vercel kapag hiningi).
Sa dulo, may lalabas na URL — ito ang backend URL mo, hal.
`https://bayantrust-backend-xxxx.vercel.app`

**Opsyon B — sa pamamagitan ng GitHub:**

1. I-upload ang folder na ito sa isang bagong GitHub repo.
2. Pumunta sa **vercel.com** → **Add New Project** → piliin ang repo mo → Deploy.

## 3. Ilagay ang API key sa Vercel

1. Sa Vercel dashboard, buksan ang project mo.
2. **Settings → Environment Variables**.
3. Idagdag: Name = `ANTHROPIC_API_KEY`, Value = yung key mo mula sa Step 1.
4. I-save, tapos i-redeploy (**Deployments → ... → Redeploy**) para ma-apply.

## 4. Ikonekta sa BayanTrust

Kopyahin ang deployed URL mo (hal. `https://bayantrust-backend-xxxx.vercel.app`)
at i-paste sa **Settings** ng BayanTrust app (gear icon), sa field na
"Backend URL". Awtomatiko nang gagamitin ito para sa live link checking.

**Mahalaga:** kung ang BayanTrust app mo ay naka-publish pa rin bilang Claude
artifact (claude.ai link), hindi papayagan ng seguridad ng Claude platform na
tumawag ito sa sarili mong backend. Kailangan mo munang i-download ang
`bayantrust.html` file at i-host ito sa sarili mong libreng hosting (Netlify,
GitHub Pages, o Cloudflare Pages — drag-and-drop lang, walang coding) para
gumana ang koneksyon sa backend na ito.
