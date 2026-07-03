const { shopify } = require("./shopify");
const { db, getSettings } = require("./db");

/**
 * Modern Shopify embedded-app auth ("Shopify managed installation"):
 * - No manual OAuth redirect/callback routes needed.
 * - Frontend (App Bridge) attaches a short-lived session token (JWT) on every
 *   request via the Authorization header.
 * - Backend verifies that token, and if it doesn't have a stored offline
 *   access token for the shop yet, exchanges the session token for one
 *   (Token Exchange). This is the pattern Shopify requires for the
 *   "session token authentication" Built for Shopify checklist item.
 */

function getOfflineSessionId(shop) {
  return shopify.session.getOfflineId(shop);
}

async function loadStoredSession(shop) {
  const id = getOfflineSessionId(shop);
  return shopify.config.sessionStorage.loadSession(id);
}

async function authenticateRequest(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const sessionToken = authHeader.replace(/^Bearer\s+/i, "");

    if (!sessionToken) {
      return res.status(401).json({ error: "missing_session_token" });
    }

    // Verify + decode the JWT session token issued by App Bridge
    const payload = await shopify.session.decodeSessionToken(sessionToken);
    const shop = payload.dest.replace("https://", "");

    // Do we already have a valid offline access token stored for this shop?
    let session = await loadStoredSession(shop);

    if (!session || !session.accessToken) {
      // Exchange the session token for a real offline access token.
      // This replaces the old OAuth redirect flow entirely.
      const { session: newSession } = await shopify.auth.tokenExchange({
        sessionToken,
        shop,
        requestedTokenType: shopify.auth.RequestedTokenType.OfflineAccessToken,
      });
      await shopify.config.sessionStorage.storeSession(newSession);
      session = newSession;

      getSettings(shop); // ensure default settings row exists on first auth
    }

    res.locals.shopify = { session, shop };
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ error: "authentication_failed", message: err.message });
  }
}

module.exports = { authenticateRequest, loadStoredSession };
