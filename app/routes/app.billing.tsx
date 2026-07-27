import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

// App handle from the Partners Dashboard app URL (e.g. .../apps/speedboost-v2-1/...)
const APP_HANDLE = "speedboost-v2-1";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // IMPORTANT: use the "redirect" returned by authenticate.admin(), NOT the
  // plain "redirect" from "react-router". The plain one does a normal HTTP 302,
  // which gets blocked by X-Frame-Options inside the embedded iframe.
  // Shopify's own redirect uses App Bridge to perform a proper top-level navigation.
  const { session, redirect } = await authenticate.admin(request);

  // Extract the store handle from the shop domain, e.g. "cool-shop" from "cool-shop.myshopify.com"
  const storeHandle = session.shop.replace(".myshopify.com", "");

  // Managed Pricing apps can't use billing.require()/billing.request() to create charges.
  // Instead, redirect the merchant to Shopify's hosted plan selection page.
  return redirect(
    `https://admin.shopify.com/store/${storeHandle}/charges/${APP_HANDLE}/pricing_plans`,
    { target: "_top" } // required since this URL is outside the embedded app's iframe scope
  );
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};