/**
 * POST /api/plaid/check-asset-report
 * 
 * Polls the status of an asset report that's still generating.
 * Updates Supabase when the report is ready.
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

// Supabase admin client
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
    const { assetReportToken, userId } = req.body;

    if (!assetReportToken || !userId) {
      return res.status(400).json({ error: 'assetReportToken and userId are required' });
    }

    const plaidClient = getPlaidClient();

    const response = await plaidClient.assetReportGet({
      asset_report_token: assetReportToken,
    });

    const report = response.data.report;

    // Parse the report
    const items = report.items.map((item) => ({
      institution_name: item.institution_name,
      institution_id: item.institution_id,
      accounts: item.accounts.map((acc) => ({
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        current_balance: acc.balances?.current,
        available_balance: acc.balances?.available,
        days_available: acc.days_available,
        transactions_count: acc.transactions?.length || 0,
      })),
    }));

    const assetData = {
      status: 'complete',
      asset_report_token: assetReportToken,
      report_id: report.asset_report_id,
      date_generated: report.date_generated,
      days_requested: report.days_requested,
      items,
      fetched_at: new Date().toISOString(),
    };

    // Update Supabase
    const supabase = getSupabase();
    await supabase
      .from('user_financial_data')
      .update({
        asset_report: assetData,
        'available_products': { assets: true },
      })
      .eq('user_id', userId);

    return res.status(200).json({
      status: 'complete',
      data: assetData,
    });
  } catch (error) {
    const errorCode = error?.response?.data?.error_code;

    // Still generating
    if (errorCode === 'PRODUCT_NOT_READY') {
      return res.status(200).json({
        status: 'pending',
        message: 'Asset report is still generating. Try again in a few seconds.',
      });
    }

    console.error('[Plaid] Error checking asset report:', error?.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to check asset report',
      details: error?.response?.data?.error_message || error.message,
    });
  }
}
