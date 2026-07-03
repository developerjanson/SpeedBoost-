# SpeedBoost — Shopify App

Image compression + store speed optimization app, built to align with Shopify's
**Built for Shopify** requirements: session token auth (Token Exchange, no OAuth
redirects), latest App Bridge, lightweight embedded page for Core Web Vitals,
and a theme app extension instead of Asset API.

---

## STEP 1 — Naya GitHub Repository

1. https://github.com/new → name `SpeedBoost` → "Add README" **uncheck** → Create.
2. Is repo ka code (README.md ke sath di gayi zip) upload/push kar dein — pichle message wale steps A/B same hain.

## STEP 2 — Partner Dashboard / Dev Dashboard mein App banayein

1. https://partners.shopify.com → Apps → Create app manually → naam **SpeedBoost**.
2. **Client ID (API key)** aur **Client secret** copy kar lein.
3. Is app ke naye flow mein **manual redirect URL fill karne ki zaroorat nahi** — sab
   kuch `shopify.app.toml` ke through "Shopify managed installation" se handle hota hai.

## STEP 3 — Code deploy (Render.com)

1. https://render.com → New → Web Service → apna `SpeedBoost` repo select karein.
2. Build: `npm install`, Start: `npm start`, Instance: Free.
3. Environment variables:
   - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET` (Partner dashboard se)
   - `HOST` = Render deploy URL (e.g. `https://speedboost.onrender.com`)
   - `SCOPES` = `read_products,write_products`
   - `APP_MONTHLY_PRICE` = `10.00`
   - `BILLING_TEST_MODE` = `true` (testing ke dauran)
4. Deploy hone do.

## STEP 4 — shopify.app.toml aur Partner Dashboard sync

1. `shopify.app.toml` mein `client_id` aur `application_url` apne Render URL se update karein.
2. GitHub pe push karein.
3. Agar Shopify CLI (Codespace mein) use kar rahe hain: `shopify app deploy` — ye
   config (webhooks, scopes, extension) Shopify ko bhej deta hai.
4. Agar CLI nahi use kar rahe: Partner Dashboard > App setup mein manually
   **App URL** field update kar dein (Redirect URL field ab zaroori nahi).

## STEP 5 — Theme App Extension deploy

`extensions/speedboost-badge/` folder ek chhota storefront app block hai (optional
badge merchant apni theme mein Theme Editor se add kar sakta hai). Ye code kabhi
bhi theme files ko directly edit nahi karta (Asset API use nahi hota), isliye
uninstall pe kuch bhi leftover nahi rehta.

```bash
shopify app deploy
```

Deploy karne ke baad merchant apni theme editor mein "App embeds" / "Add block"
se ise manually enable kar sakta hai.

## STEP 6 — Test aur Live

1. Development store pe install karein, subscription test karein.
2. Sab theek chalne par `BILLING_TEST_MODE=false` karein.
3. App Store listing ke liye Distribution settings, screenshots, privacy policy chahiye honge.

---

## "Built for Shopify" Checklist — is app mein kya cover hai

| Requirement | Status |
|---|---|
| Session token authentication (Token Exchange) | ✅ Implemented (`server/auth.js`) — no OAuth redirects |
| Latest App Bridge, embedded app | ✅ CDN script (`app-bridge.js`), always latest version |
| Lightweight admin page (LCP/CLS/INP) | ✅ Inline CSS only, no blocking external stylesheets/fonts, no layout-shifting elements |
| Theme app extensions (not Asset API) | ✅ `extensions/speedboost-badge/` — optional storefront block |
| Clean uninstall | ✅ `app/uninstalled` + `shop/redact` webhooks wipe stored data |
| Well integrated / no external signup | ✅ Everything happens inside Shopify Admin, no separate signup screen |
| Shopify design consistency | ⚠️ Currently custom lightweight CSS matching Shopify's visual style (colors, spacing). For pixel-perfect compliance, consider migrating UI to actual **Polaris React components** later — this needs the Remix/React app template rather than plain HTML, which is a bigger rebuild. Ask me if you want this done. |
| Category-specific criteria (subscriptions, etc.) | ✅ App uses Shopify's native Billing API for the $10/month charge, which is what these criteria check for |
| Minimum 50 net installs, 5 reviews, 4+ star rating | ❌ Not something code can satisfy — this only accrues after real merchants install and review the app on the App Store. Built for Shopify status is applied for *after* you hit these numbers. |

## Backend Debug Switches

Admin UI "Optimization Settings" card: App Enabled (master), Image Compression,
Compression Quality, Max Image Width, Convert to WebP, Auto Alt-Text. "Recent
Activity" shows a log of every optimization run (success/skipped/error).

## Local testing

```bash
cp .env.example .env
npm install
npm start
```
