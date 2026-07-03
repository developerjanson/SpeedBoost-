require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { shopify, HOST } = require("./shopify");
const { authenticateRequest } = require("./auth");
const { getSettings, updateSettings, getLogs } = require("./db");
const { createSubscription, hasActiveSubscription, ensureBilling, APP_PRICE } = require("./billing");
const { runFullOptimization } = require("./optimizer");
const webhooksRouter = require("./webhooks");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Webhooks (raw body, before json parser) ----------
app.use("/webhooks", express.raw({ type: "*/*" }), webhooksRouter);

app.use(express.json());
app.use(cors());

// ---------- API routes: all authenticated via session token (Authorization header) ----------
// No manual /api/auth or /api/auth/callback routes — Shopify manages install/auth
// via App Bridge + Token Exchange (see server/auth.js).

app.get("/api/settings", authenticateRequest, (req, res) => {
  res.json(getSettings(res.locals.shopify.shop));
});

app.post("/api/settings", authenticateRequest, (req, res) => {
  res.json(updateSettings(res.locals.shopify.shop, req.body));
});

app.get("/api/logs", authenticateRequest, (req, res) => {
  res.json(getLogs(res.locals.shopify.shop));
});

app.get("/api/billing/status", authenticateRequest, async (req, res) => {
  const active = await hasActiveSubscription(res.locals.shopify.session);
  updateSettings(res.locals.shopify.shop, { billing_active: active ? 1 : 0 });
  res.json({ active, price: APP_PRICE });
});

app.post("/api/billing/subscribe", authenticateRequest, async (req, res) => {
  try {
    const { confirmationUrl } = await createSubscription(res.locals.shopify.session, HOST);
    res.json({ confirmationUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/billing/callback", (req, res) => {
  res.redirect(`/?shop=${req.query.shop || ""}&billing=complete`);
});

app.post("/api/optimize/run", authenticateRequest, ensureBilling(), async (req, res) => {
  try {
    const result = await runFullOptimization(res.locals.shopify.session);
    res.json(result);
  } catch (err) {
    console.error("Optimization error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Embedded frontend ----------
// Single lightweight HTML/JS page, no build step, no blocking external
// stylesheets/fonts — kept minimal on purpose for Core Web Vitals (LCP/CLS/INP).
app.use(express.static(path.join(__dirname, "..", "public"), { maxAge: "1d" }));

app.get("*", (req, res) => {
  const html = fs
    .readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8")
    .replace(/%%SHOPIFY_API_KEY%%/g, process.env.SHOPIFY_API_KEY || "");
  res.set("Content-Type", "text/html");
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`SpeedBoost running on port ${PORT}`);
});
