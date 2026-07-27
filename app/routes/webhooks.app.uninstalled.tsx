import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, session, topic } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    if (session) {
      await db.session.deleteMany({ where: { shop } });
      await db.settings.deleteMany({ where: { shop } });
    }

    return new Response();
  } catch (error) {
    console.error("app/uninstalled webhook failed:", error);
    return new Response(null, { status: 200 });
  }
};