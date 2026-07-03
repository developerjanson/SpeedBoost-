const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "app_data.sqlite"));
db.pragma("journal_mode = WAL");

// Shopify OAuth sessions (used by our custom session storage)
db.exec(`
CREATE TABLE IF NOT EXISTS shopify_sessions (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  content TEXT NOT NULL
);
`);

// Per-shop app settings (yehi backend se toggle hone wale switches hain)
db.exec(`
CREATE TABLE IF NOT EXISTS shop_settings (
  shop TEXT PRIMARY KEY,
  app_enabled INTEGER DEFAULT 1,          -- master ON/OFF switch (debug ke liye disable)
  compress_images INTEGER DEFAULT 1,      -- image compression on/off
  compression_quality INTEGER DEFAULT 75, -- 1-100
  max_image_width INTEGER DEFAULT 2048,   -- resize cap
  convert_to_webp INTEGER DEFAULT 0,      -- experimental, off by default (debug switch)
  auto_alt_text INTEGER DEFAULT 1,        -- SEO: missing alt text auto-fill
  lazy_load_hint INTEGER DEFAULT 1,       -- adds loading="lazy" metafield hint
  billing_active INTEGER DEFAULT 0,
  charge_id TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Log har optimization run ka, taake user/aap dekh sakein kya hua, debug ke liye
db.exec(`
CREATE TABLE IF NOT EXISTS optimization_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  product_id TEXT,
  image_id TEXT,
  status TEXT,           -- success | skipped | error
  original_kb REAL,
  optimized_kb REAL,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

function getSettings(shop) {
  let row = db.prepare("SELECT * FROM shop_settings WHERE shop = ?").get(shop);
  if (!row) {
    db.prepare("INSERT INTO shop_settings (shop) VALUES (?)").run(shop);
    row = db.prepare("SELECT * FROM shop_settings WHERE shop = ?").get(shop);
  }
  return row;
}

function updateSettings(shop, fields) {
  getSettings(shop); // ensure row exists
  const allowed = [
    "app_enabled",
    "compress_images",
    "compression_quality",
    "max_image_width",
    "convert_to_webp",
    "auto_alt_text",
    "lazy_load_hint",
    "billing_active",
    "charge_id",
  ];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (keys.length === 0) return getSettings(shop);
  const setClause = keys.map((k) => `${k} = @${k}`).join(", ");
  db.prepare(
    `UPDATE shop_settings SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE shop = @shop`
  ).run({ ...fields, shop });
  return getSettings(shop);
}

function addLog(entry) {
  db.prepare(
    `INSERT INTO optimization_logs (shop, product_id, image_id, status, original_kb, optimized_kb, message)
     VALUES (@shop, @product_id, @image_id, @status, @original_kb, @optimized_kb, @message)`
  ).run(entry);
}

function getLogs(shop, limit = 100) {
  return db
    .prepare(
      "SELECT * FROM optimization_logs WHERE shop = ? ORDER BY id DESC LIMIT ?"
    )
    .all(shop, limit);
}

module.exports = { db, getSettings, updateSettings, addLog, getLogs };
