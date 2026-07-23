export default function AdditionalPage() {
  return (
    <s-page heading="Help & Support">
      <s-section heading="Frequently Asked Questions">
        <s-stack direction="block" gap="loose">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>How does image compression work?</strong></s-text>
            <s-paragraph>
              SpeedBoost automatically compresses your product images and store
              files using industry-standard algorithms, reducing file size
              without a noticeable drop in visual quality. You control the
              compression level from the Settings page.
            </s-paragraph>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>Will this affect my existing product images?</strong></s-text>
            <s-paragraph>
              No. SpeedBoost creates optimized versions of your images and
              replaces them safely. Original quality settings can always be
              adjusted, and no data is deleted permanently.
            </s-paragraph>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>What is WebP conversion?</strong></s-text>
            <s-paragraph>
              WebP is a modern image format that offers significantly smaller
              file sizes than JPEG or PNG. This feature is experimental and may
              not be compatible with every theme, so it's disabled by default.
            </s-paragraph>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>How often should I run optimization?</strong></s-text>
            <s-paragraph>
              We recommend running a full store optimization after adding new
              products in bulk, or periodically (e.g. monthly) to keep newly
              uploaded images optimized.
            </s-paragraph>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Need more help?">
        <s-paragraph>
          If you run into any issues or have feature requests, our support
          team is happy to help.
        </s-paragraph>
        <s-button href="mailto:support@speedboostapp.com" variant="primary">
          Contact Support
        </s-button>
      </s-section>

      <s-section slot="aside" heading="Resources">
        <s-unordered-list>
          <s-list-item>
            <s-link href="/app" >
              Back to Dashboard
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link
              href="https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav"
              target="_blank"
            >
              Shopify App Design Guidelines
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}