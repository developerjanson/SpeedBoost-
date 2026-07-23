import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  await billing.require({
    plans: ["SpeedBoostPro"],
    onFailure: async () =>
      billing.request({
        plan: "SpeedBoostPro",
        isTest: process.env.NODE_ENV !== "production",
      }),
  });

  return redirect("/app");
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};