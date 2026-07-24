import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // Final cleanup — delete any remaining shop data (in case uninstall webhook was missed)
  await db.session.deleteMany({ where: { shop } });
  await db.settings.deleteMany({ where: { shop } });

  return new Response();
};