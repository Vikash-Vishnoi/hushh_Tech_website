/**
 * POST /api/plaid/create-link-token
 * 
 * Creates a Plaid Link token for the client to initialize Plaid Link.
 * Requests all 3 products: auth (for balance), assets, investments.
 * Plaid Link will only show institutions that support at least one.
 */
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

// Plaid client setup
const getPlaidClient = () => {
  const env = process.env.PLAID_ENV || 'sandbox';
  const clientId = env === 'production'
    ? process.env.PLAID_CLIENT_ID_PRODUCTION
    : process.env.PLAID_CLIENT_ID_SANDBOX;
  const secret = env === 'production'
    ? process.env.PLAID_SECRET_PRODUCTION
    : process.env.PLAID_SECRET_SANDBOX;

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });

  return new PlaidApi(configuration);
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userEmail } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const plaidClient = getPlaidClient();

    // Request all 3 products — Plaid will only connect what's supported
    const request = {
      user: {
        client_user_id: userId,
        email_address: userEmail || undefined,
      },
      client_name: 'Hushh Technologies',
      products: [Products.Auth, Products.Investments, Products.Assets],
      country_codes: [CountryCode.Us],
      language: 'en',
      // Optional products — try these but don't fail if not available
      optional_products: [Products.Investments, Products.Assets],
    };

    const response = await plaidClient.linkTokenCreate(request);

    return res.status(200).json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error('[Plaid] Error creating link token:', error?.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to create link token',
      details: error?.response?.data?.error_message || error.message,
    });
  }
}
