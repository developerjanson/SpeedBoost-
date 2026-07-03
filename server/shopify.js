require("dotenv").config();
const { shopifyApi, LATEST_API_VERSION } = require("@shopify/shopify-api");
require("@shopify/shopify-api/adapters/node");
const { SQLiteSessionStorage } = require("./sessionStorage");

const HOST = (process.env.HOST || "").replace(/\/$/, "");

if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET || !HOST) {
  console.warn(
    "[WARNING] SHOPIFY_API_KEY / SHOPIFY_API_SECRET / HOST .env file mein set nahi hain. " +
      "App start hogi lekin OAuth kaam nahi karega jab tak ye set na ho."
  );
}

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  scopes: (process.env.SCOPES || "read_products,write_products").split(","),
  hostName: HOST.replace(/^https?:\/\//, ""),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage: new SQLiteSessionStorage(),
});

module.exports = { shopify, HOST };
