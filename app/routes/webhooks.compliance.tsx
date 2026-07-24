import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  if (topic === "SHOP_REDACT") {
    // Final cleanup after 48-hour grace period post-uninstall
    await db.session.deleteMany({ where: { shop } });
    await db.settings.deleteMany({ where: { shop } });
  }

  // customers/data_request and customers/redact: this app stores no
  // customer personal data (only shop-level settings), so no action needed.

  return new Response();
};