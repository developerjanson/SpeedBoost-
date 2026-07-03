const { shopify } = require("./shopify");
const { updateSettings } = require("./db");

const APP_PRICE = parseFloat(process.env.APP_MONTHLY_PRICE || "10.00");
const TEST_MODE = (process.env.BILLING_TEST_MODE || "true") === "true";

const CURRENT_SUBSCRIPTION_QUERY = `
  query {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
      }
    }
  }
`;

const SUBSCRIPTION_CREATE_MUTATION = `
  mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean!, $price: Decimal!) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      test: $test
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $price, currencyCode: USD }
              interval: EVERY_30_DAYS
            }
          }
        }
      ]
    ) {
      appSubscription {
        id
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

// Check karta hai ke shop ka active paid subscription hai ya nahi
async function hasActiveSubscription(session) {
  const client = new shopify.clients.Graphql({ session });
  const res = await client.query({ data: CURRENT_SUBSCRIPTION_QUERY });
  const subs = res.body?.data?.currentAppInstallation?.activeSubscriptions || [];
  return subs.some((s) => s.status === "ACTIVE");
}

// Naya recurring charge banata hai aur confirmation URL return karta hai
// (merchant ko is URL pe redirect karna hota hai charge approve karne ke liye)
async function createSubscription(session, hostUrl) {
  const client = new shopify.clients.Graphql({ session });
  const returnUrl = `${hostUrl}/api/billing/callback?shop=${session.shop}`;

  const res = await client.query({
    data: {
      query: SUBSCRIPTION_CREATE_MUTATION,
      variables: {
        name: "SpeedBoost - Monthly",
        returnUrl,
        test: TEST_MODE,
        price: APP_PRICE,
      },
    },
  });

  const result = res.body?.data?.appSubscriptionCreate;
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors.map((e) => e.message).join(", "));
  }
  return {
    confirmationUrl: result.confirmationUrl,
    subscriptionId: result.appSubscription?.id,
  };
}

// Express middleware: agar shop ka billing active nahi to use billing page pe bhej deta hai
function ensureBilling() {
  return async (req, res, next) => {
    try {
      const session = res.locals.shopify?.session;
      if (!session) return res.status(401).send("No session");

      const active = await hasActiveSubscription(session);
      updateSettings(session.shop, { billing_active: active ? 1 : 0 });

      if (!active) {
        return res.status(402).json({
          error: "billing_required",
          message: "Is feature ko use karne ke liye pehle $10/month subscription activate karein.",
        });
      }
      next();
    } catch (err) {
      console.error("Billing check error:", err);
      res.status(500).json({ error: "billing_check_failed", message: err.message });
    }
  };
}

module.exports = { hasActiveSubscription, createSubscription, ensureBilling, APP_PRICE };
