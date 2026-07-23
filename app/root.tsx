import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>SpeedBoost — Shopify Image Optimizer & Speed Booster</title>
        <meta
          name="description"
          content="Compress images, convert to WebP, and auto-generate alt text to speed up your Shopify store and improve Core Web Vitals."
        />
        <meta property="og:title" content="SpeedBoost — Shopify Image Optimizer & Speed Booster" />
        <meta
          property="og:description"
          content="Automatically compress images, convert to WebP, and generate SEO-friendly alt text — no coding required."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="SpeedBoost — Shopify Image Optimizer" />
        <meta
          name="twitter:description"
          content="Speed up your Shopify store with automatic image compression and WebP conversion."
        />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}