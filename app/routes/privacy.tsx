export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: July 24, 2026</em></p>

      <p>
        This Privacy Policy describes how SpeedBoost ("we", "our", "the app")
        collects, uses, and protects information when you install and use our
        Shopify application.
      </p>

      <h2>Information We Collect</h2>
      <p>To provide our optimization service, SpeedBoost accesses the following data through the Shopify API:</p>
      <ul>
        <li>Store domain (shop identifier)</li>
        <li>Product images and associated metadata (title, alt text)</li>
        <li>Files uploaded to your Shopify store's Files section</li>
        <li>Your app configuration settings (compression quality, feature toggles)</li>
      </ul>

      <h2>How We Use Information</h2>
      <p>
        We use the information above solely to provide the app's core
        functionality: compressing images, converting formats, and generating
        alt text on your behalf. We do not sell, rent, or share your store
        data with third parties for marketing purposes.
      </p>

      <h2>Data Storage</h2>
      <p>
        We store your app settings (such as compression preferences) and
        session credentials required to communicate with the Shopify API.
        Processed images are uploaded directly back to your Shopify store; we
        do not retain permanent copies of your images on our servers beyond
        what is needed to complete the optimization request.
      </p>

      <h2>Data Retention &amp; Deletion</h2>
      <p>
        When you uninstall SpeedBoost, we automatically delete your stored
        session and settings data from our systems.
      </p>

      <h2>Third-Party Services</h2>
      <p>
        SpeedBoost relies on Shopify's APIs to function and is hosted on
        infrastructure provided by Render. These providers may process data
        as part of delivering their services to us.
      </p>

      <h2>Your Rights</h2>
      <p>
        You may request access to, correction of, or deletion of your data at
        any time by contacting us at the email below. You may also uninstall
        the app at any time, which triggers automatic data deletion as
        described above.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact
        us at{" "}
        <a href="mailto:developerjanson@gmail.com">developerjanson@gmail.com</a>.
      </p>
    </div>
  );
}