const { Session } = require("@shopify/shopify-api");
const { db } = require("./db");

// Simple SQLite-backed session storage that matches the
// SessionStorage interface expected by @shopify/shopify-api
class SQLiteSessionStorage {
  async storeSession(session) {
    const content = JSON.stringify(session.toPropertyArray ? session.toPropertyArray() : session);
    db.prepare(
      `INSERT INTO shopify_sessions (id, shop, content) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET content = excluded.content, shop = excluded.shop`
    ).run(session.id, session.shop, content);
    return true;
  }

  async loadSession(id) {
    const row = db.prepare("SELECT content FROM shopify_sessions WHERE id = ?").get(id);
    if (!row) return undefined;
    const raw = JSON.parse(row.content);
    return new Session(raw);
  }

  async deleteSession(id) {
    db.prepare("DELETE FROM shopify_sessions WHERE id = ?").run(id);
    return true;
  }

  async deleteSessions(ids) {
    const stmt = db.prepare("DELETE FROM shopify_sessions WHERE id = ?");
    const txn = db.transaction((idList) => {
      for (const id of idList) stmt.run(id);
    });
    txn(ids);
    return true;
  }

  async findSessionsByShop(shop) {
    const rows = db.prepare("SELECT content FROM shopify_sessions WHERE shop = ?").all(shop);
    return rows.map((r) => new Session(JSON.parse(r.content)));
  }
}

module.exports = { SQLiteSessionStorage };
