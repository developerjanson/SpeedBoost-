const express = require("express");
const { shopify } = require("./shopify");
const { db } = require("./db");

const router = express.Router();

// Shopify webhooks raw body verify karta hai HMAC ke liye,
// isliye express.raw() zaroori hai in routes ke liye (index.js mein set hoga)

router.post("/app/uninstalled", async (req, res) => {
  try {
    const { valid, topic, shop } = await shopify.webhooks.validate({
      rawBody: req.body.toString("utf8"),
      rawRequest: req,
      rawResponse: res,
    });
    if (!valid) return res.status(401).send("Invalid webhook");

    db.prepare("DELETE FROM shopify_sessions WHERE shop = ?").run(shop);
    db.prepare("DELETE FROM shop_settings WHERE shop = ?").run(shop);
    console.log(`App uninstalled by ${shop}, data cleaned.`);
    res.status(200).send("OK");
  } catch (err) {
    console.error("app/uninstalled webhook error:", err);
    res.status(500).send("Error");
  }
});

// GDPR mandatory webhooks - Shopify app review ke liye zaroori hain
router.post("/customers/data_request", async (req, res) => {
  // Hum customer ka koi personal data store nahi karte, sirf acknowledge karte hain
  res.status(200).send("OK");
});

router.post("/customers/redact", async (req, res) => {
  res.status(200).send("OK");
});

router.post("/shop/redact", async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString("utf8"));
    const shop = body.shop_domain;
    if (shop) {
      db.prepare("DELETE FROM shopify_sessions WHERE shop = ?").run(shop);
      db.prepare("DELETE FROM shop_settings WHERE shop = ?").run(shop);
      db.prepare("DELETE FROM optimization_logs WHERE shop = ?").run(shop);
    }
    res.status(200).send("OK");
  } catch (err) {
    res.status(200).send("OK");
  }
});

module.exports = router;
