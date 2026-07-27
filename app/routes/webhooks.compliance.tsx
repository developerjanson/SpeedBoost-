import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    if (topic === "SHOP_REDACT") {
      await db.session.deleteMany({ where: { shop } });
      await db.settings.deleteMany({ where: { shop } });
    }

    return new Response();
  } catch (error) {
    console.error("compliance webhook failed:", error);
    return new Response(null, { status: 200 });
  }
};