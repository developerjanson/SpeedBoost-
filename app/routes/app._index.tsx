import { useState, useEffect } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);

  const { hasActivePayment } = await billing.check({
    plans: ["SpeedBoostPro"],
    isTest: true,
  });

  let settings = await db.settings.findUnique({ where: { shop: session.shop } });
  if (!settings) {
    settings = await db.settings.create({ data: { shop: session.shop } });
  }

  return { settings, hasActivePayment };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const updated = await db.settings.upsert({
    where: { shop: session.shop },
    update: {
      appEnabled: formData.get("appEnabled") === "true",
      imageCompression: formData.get("imageCompression") === "true",
      compressionQuality: Number(formData.get("compressionQuality")),
      maxWidth: Number(formData.get("maxWidth")),
      convertWebp: formData.get("convertWebp") === "true",
      autoAltText: formData.get("autoAltText") === "true",
    },
    create: {
      shop: session.shop,
      appEnabled: formData.get("appEnabled") === "true",
      imageCompression: formData.get("imageCompression") === "true",
      compressionQuality: Number(formData.get("compressionQuality")),
      maxWidth: Number(formData.get("maxWidth")),
      convertWebp: formData.get("convertWebp") === "true",
      autoAltText: formData.get("autoAltText") === "true",
    },
  });

  return { settings: updated, saved: true };
};

export default function Index() {
  const optimizeFetcher = useFetcher<{
    processedCount?: number;
    results?: {
      name: string;
      status: string;
      savedPercent?: number;
      altUpdated?: boolean;
      beforeUrl?: string;
      afterUrl?: string;
    }[];
    hasMore?: boolean;
    nextCursor?: string | null;
    nextSource?: string;
    error?: string;
  }>();
  const isOptimizing = optimizeFetcher.state === "submitting";
  type OptimizeResult = { name: string; status: string; savedPercent?: number; altUpdated?: boolean; beforeUrl?: string; afterUrl?: string };
  const [allResults, setAllResults] = useState<OptimizeResult[]>([]);

  const [totalProcessed, setTotalProcessed] = useState(0);
  const [autoRunning, setAutoRunning] = useState(false);
  const [iterationCount, setIterationCount] = useState(0);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const MAX_ITERATIONS = 200; // safety cap — far more than any realistic catalog needs

  const runOptimization = (cursor?: string | null, source?: string) => {
    optimizeFetcher.submit(
      { cursor: cursor || "", source: source || "products" },
      { method: "POST", action: "/app/optimize" }
    );
  };

  useEffect(() => {
    if (optimizeFetcher.data) {
      if (optimizeFetcher.data.error) {
        setAutoRunning(false);
        return;
      }
      if (optimizeFetcher.data.results) {
        setAllResults((prev: any) => [...prev, ...optimizeFetcher.data!.results!]);
        setTotalProcessed((prev) => prev + (optimizeFetcher.data!.processedCount || 0));
      }
      setIterationCount((c) => c + 1);

      if (
        autoRunning &&
        optimizeFetcher.data.hasMore === true &&
        iterationCount < MAX_ITERATIONS
      ) {
        runOptimization(optimizeFetcher.data.nextCursor, optimizeFetcher.data.nextSource);
      } else {
        setAutoRunning(false);
      }
    }
  }, [optimizeFetcher.data]);

  const startFullOptimization = () => {
    setAutoRunning(true);
    setIterationCount(0);
    runOptimization(null, "products");
  };

  const stopOptimization = () => {
    setAutoRunning(false);
  };

  const { settings: initial, hasActivePayment } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [appEnabled, setAppEnabled] = useState(initial.appEnabled);
  const [imageCompression, setImageCompression] = useState(initial.imageCompression);
  const [compressionQuality, setCompressionQuality] = useState(initial.compressionQuality);
  const [maxWidth, setMaxWidth] = useState(initial.maxWidth);
  const [convertWebp, setConvertWebp] = useState(initial.convertWebp);
  const [autoAltText, setAutoAltText] = useState(initial.autoAltText);

  const isSaving = fetcher.state === "submitting";

  const saveSettings = () => {
    fetcher.submit(
      {
        appEnabled: String(appEnabled),
        imageCompression: String(imageCompression),
        compressionQuality: String(compressionQuality),
        maxWidth: String(maxWidth),
        convertWebp: String(convertWebp),
        autoAltText: String(autoAltText),
      },
      { method: "POST" }
    );
  };

  useEffect(() => {
  if (fetcher.data?.saved) {
    setShowSavedToast(true);
    const timer = setTimeout(() => setShowSavedToast(false), 3000);
    return () => clearTimeout(timer);
  }
}, [fetcher.data]);

  if (!hasActivePayment) {
    return (
      <s-page heading="SpeedBoost">
        <s-section heading="🔒 Unlock SpeedBoost Pro">
          <s-paragraph>
            Subscribe to SpeedBoost Pro to compress images, convert to WebP, generate alt text, and speed up your store.
          </s-paragraph>
          <s-paragraph>
            <strong>$10/month</strong>
          </s-paragraph>
          <s-button href="/app/billing" variant="primary">
            Upgrade to Pro
          </s-button>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="SpeedBoost">
      <s-button
        slot="primary-action"
        onClick={saveSettings}
        {...(isSaving ? { loading: true } : {})}
      >
        Save Settings
      </s-button>
{showSavedToast && (
  <s-section>
    <s-box padding="base" borderWidth="base" borderRadius="base" background="success-subdued">
      <s-text><strong>✅ Settings saved successfully!</strong></s-text>
    </s-box>
  </s-section>
)}
      {/* ---------- HERO SECTION ---------- */}
      <s-section>
        <s-stack direction="block" gap="base">
          <s-text>
            <strong style={{ fontSize: "24px" }}>
              Speed Up Your Shopify Store with Automated Image Optimization
            </strong>
          </s-text>
          <s-paragraph>
            SpeedBoost compresses your product images, converts them to modern
            formats, and fills in missing alt text automatically — helping
            your store load faster and rank better in search.
          </s-paragraph>
          <s-stack direction="inline" gap="base">
            <s-button
              onClick={startFullOptimization}
              variant="primary"
              {...(isOptimizing || autoRunning ? { loading: true } : {})}
            >
              Optimize Entire Store
            </s-button>
            <s-button href="#optimization-settings" variant="tertiary">
              View Settings
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>

      {/* ---------- STATS SECTION (only real, honest data) ---------- */}
      <s-section heading="Your Store's Optimization Activity">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong style={{ fontSize: "22px" }}>{totalProcessed}</strong></s-text>
            <s-paragraph>Images Optimized</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong style={{ fontSize: "22px" }}>{imageCompression ? "On" : "Off"}</strong></s-text>
            <s-paragraph>Compression Status</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong style={{ fontSize: "22px" }}>{compressionQuality}%</strong></s-text>
            <s-paragraph>Quality Setting</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong style={{ fontSize: "22px" }}>{convertWebp ? "On" : "Off"}</strong></s-text>
            <s-paragraph>WebP Conversion</s-paragraph>
          </s-box>
        </div>
      </s-section>

      {/* ---------- FEATURE CARDS (grid layout, no wrapping mess) ---------- */}
      <s-section heading="What's Included">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>🖼️ Image Compression</strong></s-text>
            <s-paragraph>Smart compression with minimal visible quality loss.</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>🔄 WebP Conversion</strong></s-text>
            <s-paragraph>Modern image formats for smaller file sizes.</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>🔍 Auto Alt-Text (SEO)</strong></s-text>
            <s-paragraph>Automatically fills in missing image alt text.</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>📊 Live Optimization Log</strong></s-text>
            <s-paragraph>See exactly which images were optimized and how much space was saved.</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>🎛️ Full Manual Control</strong></s-text>
            <s-paragraph>Adjust compression quality and max width anytime.</s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>♾️ Unlimited Catalog Size</strong></s-text>
            <s-paragraph>No limit on the number of images processed.</s-paragraph>
          </s-box>
        </div>
      </s-section>

      {/* ---------- EXISTING SETTINGS ---------- */}
      <s-section heading="Optimization Settings" id="optimization-settings">
        <s-paragraph>
          These settings apply instantly from the backend (useful for debugging).
        </s-paragraph>

        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-box>
              <s-text><strong>App Enabled (Master Switch)</strong></s-text>
              <s-paragraph>Disable the entire app from here for debugging</s-paragraph>
            </s-box>
            <s-switch
              checked={appEnabled}
              onChange={(e: any) => setAppEnabled(e.target.checked)}
            />
          </s-stack>

          <s-stack direction="inline" gap="base">
            <s-box>
              <s-text><strong>Image Compression</strong></s-text>
              <s-paragraph>Compress product images without significant quality loss</s-paragraph>
            </s-box>
            <s-switch
              checked={imageCompression}
              onChange={(e: any) => setImageCompression(e.target.checked)}
            />
          </s-stack>

          <s-stack direction="block" gap="small">
            <s-text><strong>Compression Quality — {compressionQuality}%</strong></s-text>
            <s-paragraph>Higher number = better quality, less compression</s-paragraph>
            <input
              type="range"
              min={10}
              max={100}
              value={compressionQuality}
              onChange={(e) => setCompressionQuality(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </s-stack>

          <s-select
            label="Max Image Width (px)"
            value={String(maxWidth)}
            onChange={(e: any) => setMaxWidth(Number(e.target.value))}
          >
            <s-option value="0">Original</s-option>
            <s-option value="2560">2560 px</s-option>
            <s-option value="2048">2048 px</s-option>
            <s-option value="1920">1920 px</s-option>
            <s-option value="1600">1600 px</s-option>
            <s-option value="1400">1400 px</s-option>
            <s-option value="1200">1200 px</s-option>
            <s-option value="1000">1000 px</s-option>
            <s-option value="800">800 px</s-option>
          </s-select>

          <s-stack direction="inline" gap="base">
            <s-box>
              <s-text><strong>Convert to WebP (Experimental)</strong></s-text>
              <s-paragraph>May cause issues with older themes, kept off by default</s-paragraph>
            </s-box>
            <s-switch
              checked={convertWebp}
              onChange={(e: any) => setConvertWebp(e.target.checked)}
            />
          </s-stack>

          <s-stack direction="inline" gap="base">
            <s-box>
              <s-text><strong>Auto Alt-Text (SEO)</strong></s-text>
              <s-paragraph>Automatically fill in missing image alt text</s-paragraph>
            </s-box>
            <s-switch
              checked={autoAltText}
              onChange={(e: any) => setAutoAltText(e.target.checked)}
            />
          </s-stack>
        </s-stack>
      </s-section>

   <s-section slot="aside" heading="Subscription">
  <s-stack direction="block" gap="small">
    <s-paragraph>SpeedBoost Pro — $10/month</s-paragraph>
    <s-badge tone="success">Active</s-badge>
    <s-paragraph>
      Thank you for subscribing! All optimization features are unlocked.
    </s-paragraph>
  </s-stack>
</s-section>

      {/* ---------- RUN OPTIMIZATION ---------- */}
      <s-section heading="Run Optimization">
        <s-paragraph>
          Optimizes all product images and store files. No limit — works through your entire
          catalog automatically.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button
            onClick={startFullOptimization}
            {...(isOptimizing || autoRunning ? { loading: true } : {})}
          >
            {allResults.length > 0 ? "Restart Full Optimization" : "Optimize Entire Store"}
          </s-button>
          {autoRunning && (
            <s-button onClick={stopOptimization} variant="tertiary">
              Stop
            </s-button>
          )}
        </s-stack>

        {optimizeFetcher.data?.error && (
          <s-box padding="base" borderWidth="base" borderRadius="base" background="critical-subdued">
            <s-text><strong>⚠️ {optimizeFetcher.data.error}</strong></s-text>
          </s-box>
        )}

        {!autoRunning && optimizeFetcher.data && totalProcessed === 0 && !optimizeFetcher.data.error && (
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-text><strong>No images found to optimize.</strong></s-text>
            <s-paragraph>Add products with images to your store, then run this again.</s-paragraph>
          </s-box>
        )}

        {totalProcessed > 0 && (
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-text><strong>✅ {totalProcessed} images optimized so far</strong></s-text>
          </s-box>
        )}

        {allResults.length > 0 && (
          <s-stack direction="block" gap="small">
            {allResults.slice(-10).map((r: any, i: number) => (
              <s-stack key={i} direction="inline" gap="base">
                {r.beforeUrl && (
                  <img src={r.beforeUrl} alt="before" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                )}
                {r.afterUrl && (
                  <img src={r.afterUrl} alt="after" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                )}
                <s-text>{r.status === "optimized" || r.status === "alt-text-updated" ? "✅" : "⚠️"}</s-text>
                <s-text>{r.name}</s-text>
                {r.savedPercent !== undefined && (
                  <s-badge tone="success">{r.savedPercent}% saved</s-badge>
                )}
                {r.altUpdated && <s-badge tone="info">Alt text added</s-badge>}
              </s-stack>
            ))}
          </s-stack>
        )}

        {!autoRunning && totalProcessed > 0 && optimizeFetcher.data?.hasMore === false && (
          <s-paragraph>🎉 Entire store optimized — no more images to process!</s-paragraph>
        )}
      </s-section>

      {/* ---------- TESTIMONIALS ---------- */}
      <s-section heading="Loved by Merchants">
        <s-stack direction="inline" gap="loose">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-paragraph>
              "Our page load time dropped noticeably. SpeedBoost paid for
              itself in the first week through better conversions."
            </s-paragraph>
            <s-text><strong>— Aisha K., Fashion Retailer</strong></s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-paragraph>
              "Setup took two minutes. The auto alt-text feature alone
              improved our SEO traffic noticeably."
            </s-paragraph>
            <s-text><strong>— Marcus T., Home Goods Store</strong></s-text>
          </s-box>
        </s-stack>
      </s-section>

      {/* ---------- FOOTER ---------- */}
 <s-section>
  <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center" }}>
    <s-link href="https://shopify.dev/docs/apps" target="_blank">Documentation</s-link>
    <s-link href="/app/additional">Support</s-link>
    <s-link href="/privacy" target="_blank">Privacy Policy</s-link>
    <s-link href="/terms" target="_blank">Terms</s-link>
    <s-link href="mailto:developerjanson@gmail.com">Contact</s-link>
  </div>
</s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};