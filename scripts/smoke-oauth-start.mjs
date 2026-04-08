import { chromium } from "@playwright/test";

const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error("Usage: node scripts/smoke-oauth-start.mjs <base-url>");
  process.exit(1);
}

const loginUrl = new URL("/login", baseUrl).toString();

async function verifyProviderRedirect(buttonName, expectedHosts) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

  try {
    await page.goto(loginUrl, { waitUntil: "networkidle", timeout: 30000 });
    const button = page.getByRole("button", { name: new RegExp(buttonName, "i") });
    await button.click({ timeout: 5000 });

    await page.waitForURL(
      (value) => {
        const current = new URL(value.toString());
        return expectedHosts.some((host) => current.hostname.includes(host));
      },
      { timeout: 15000 }
    );

    return page.url();
  } finally {
    await browser.close();
  }
}

const results = {
  loginUrl,
  apple: await verifyProviderRedirect("Continue with Apple", [
    "supabase.co",
    "appleid.apple.com",
  ]),
  google: await verifyProviderRedirect("Continue with Google", [
    "supabase.co",
    "google.com",
    "accounts.google.com",
  ]),
};

console.log(JSON.stringify(results, null, 2));
