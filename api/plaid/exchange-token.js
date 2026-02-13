/**
 * POST /api/plaid/exchange-token
 * 
 * Exchanges a Plaid public_token (from Plaid Link) for an access_token.
 * Also stores the plaid item info in Supabase.
 */
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@supabase/supabase-js';

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

// Supabase admin client (service role for writing)
const getSupabase = () => {
  return createClient(
    process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
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
    const { publicToken, userId, institutionName, institutionId } = req.body;

    if (!publicToken || !userId) {
      return res.status(400).json({ error: 'publicToken and userId are required' });
    }

    const plaidClient = getPlaidClient();

    // Exchange public_token for access_token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Save initial record to Supabase
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_financial_data')
      .upsert({
        user_id: userId,
        plaid_item_id: itemId,
        institution_name: institutionName || 'Unknown',
        institution_id: institutionId || null,
        status: 'linking',
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error saving item:', error);
      // Don't fail — we still have the access token
    }

    return res.status(200).json({
      access_token: accessToken,
      item_id: itemId,
      record_id: data?.id || null,
    });
  } catch (error) {
    console.error('[Plaid] Error exchanging token:', error?.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to exchange token',
      details: error?.response?.data?.error_message || error.message,
    });
  }
}
