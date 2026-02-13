/**
 * POST /api/plaid/fetch-financial-data
 * 
 * Fetches Balance, Assets & Investments in parallel using Promise.allSettled.
 * Saves whatever data is available to Supabase.
 * Handles all 8 permutations gracefully.
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

/**
 * Fetch balance from Plaid
 */
async function fetchBalance(plaidClient, accessToken) {
  const response = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
  });

  const accounts = response.data.accounts.map((account) => ({
    account_id: account.account_id,
    name: account.name,
    official_name: account.official_name,
    type: account.type,
    subtype: account.subtype,
    mask: account.mask,
    balances: {
      available: account.balances.available,
      current: account.balances.current,
      limit: account.balances.limit,
      iso_currency_code: account.balances.iso_currency_code,
    },
  }));

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + (acc.balances.current || 0),
    0,
  );

  return {
    accounts,
    total_balance: totalBalance,
    account_count: accounts.length,
    currency: accounts[0]?.balances?.iso_currency_code || 'USD',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Fetch asset report from Plaid (async — may need polling)
 */
async function fetchAssets(plaidClient, accessToken) {
  try {
    // Create asset report
    const createResponse = await plaidClient.assetReportCreate({
      access_tokens: [accessToken],
      days_requested: 90, // 3 months of history
    });

    const assetReportToken = createResponse.data.asset_report_token;

    // Try to get the report immediately (might not be ready)
    // Poll up to 3 times with 2-second delays
    let report = null;
    for (let i = 0; i < 3; i++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const getResponse = await plaidClient.assetReportGet({
          asset_report_token: assetReportToken,
        });
        report = getResponse.data.report;
        break;
      } catch (pollError) {
        // PRODUCT_NOT_READY — report is still generating
        if (pollError?.response?.data?.error_code === 'PRODUCT_NOT_READY') {
          if (i === 2) {
            // After 3 attempts, return token for later polling
            return {
              status: 'pending',
              asset_report_token: assetReportToken,
              message: 'Asset report is still generating. Check back later.',
              fetched_at: new Date().toISOString(),
            };
          }
          continue;
        }
        throw pollError;
      }
    }

    if (!report) {
      return {
        status: 'pending',
        asset_report_token: assetReportToken,
        message: 'Asset report is still generating.',
        fetched_at: new Date().toISOString(),
      };
    }

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

    return {
      status: 'complete',
      asset_report_token: assetReportToken,
      report_id: report.asset_report_id,
      date_generated: report.date_generated,
      days_requested: report.days_requested,
      items,
      fetched_at: new Date().toISOString(),
    };
  } catch (error) {
    // Check if assets product is not supported
    const errorCode = error?.response?.data?.error_code;
    if (
      errorCode === 'PRODUCTS_NOT_SUPPORTED' ||
      errorCode === 'INVALID_PRODUCT' ||
      errorCode === 'PRODUCT_NOT_ENABLED'
    ) {
      throw new Error('PRODUCT_NOT_SUPPORTED');
    }
    throw error;
  }
}

/**
 * Fetch investment holdings from Plaid
 */
async function fetchInvestments(plaidClient, accessToken) {
  try {
    const response = await plaidClient.investmentsHoldingsGet({
      access_token: accessToken,
    });

    const holdings = response.data.holdings.map((holding) => {
      const security = response.data.securities.find(
        (s) => s.security_id === holding.security_id,
      );
      return {
        security_id: holding.security_id,
        account_id: holding.account_id,
        quantity: holding.quantity,
        institution_price: holding.institution_price,
        institution_value: holding.institution_value,
        cost_basis: holding.cost_basis,
        iso_currency_code: holding.iso_currency_code,
        security: security
          ? {
              name: security.name,
              ticker_symbol: security.ticker_symbol,
              type: security.type,
              close_price: security.close_price,
              iso_currency_code: security.iso_currency_code,
            }
          : null,
      };
    });

    const accounts = response.data.accounts.map((acc) => ({
      account_id: acc.account_id,
      name: acc.name,
      type: acc.type,
      subtype: acc.subtype,
      balances: acc.balances,
    }));

    const totalValue = holdings.reduce(
      (sum, h) => sum + (h.institution_value || 0),
      0,
    );

    return {
      holdings,
      accounts,
      securities_count: response.data.securities.length,
      holdings_count: holdings.length,
      total_value: totalValue,
      currency: holdings[0]?.iso_currency_code || 'USD',
      fetched_at: new Date().toISOString(),
    };
  } catch (error) {
    // Check if investments product is not supported
    const errorCode = error?.response?.data?.error_code;
    if (
      errorCode === 'PRODUCTS_NOT_SUPPORTED' ||
      errorCode === 'INVALID_PRODUCT' ||
      errorCode === 'PRODUCT_NOT_ENABLED' ||
      errorCode === 'NO_INVESTMENT_ACCOUNTS'
    ) {
      throw new Error('PRODUCT_NOT_SUPPORTED');
    }
    throw error;
  }
}

/**
 * Parse Promise.allSettled result for a single product
 */
function parseResult(result, productName) {
  if (result.status === 'fulfilled') {
    return { data: result.value, error: null, available: true };
  }

  const errorMessage = result.reason?.message || 'Unknown error';
  const isNotSupported = errorMessage === 'PRODUCT_NOT_SUPPORTED';

  return {
    data: null,
    error: isNotSupported ? null : errorMessage,
    available: false,
    reason: isNotSupported ? 'not_supported' : 'error',
  };
}

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
    const { accessToken, userId, itemId } = req.body;

    if (!accessToken || !userId) {
      return res.status(400).json({ error: 'accessToken and userId are required' });
    }

    const plaidClient = getPlaidClient();
    const supabase = getSupabase();

    // Update status to "fetching"
    await supabase
      .from('user_financial_data')
      .update({ status: 'fetching' })
      .eq('user_id', userId);

    // Fetch all 3 in parallel — Promise.allSettled never rejects
    const [balanceResult, assetsResult, investmentsResult] = await Promise.allSettled([
      fetchBalance(plaidClient, accessToken),
      fetchAssets(plaidClient, accessToken),
      fetchInvestments(plaidClient, accessToken),
    ]);

    // Parse results
    const balance = parseResult(balanceResult, 'balance');
    const assets = parseResult(assetsResult, 'assets');
    const investments = parseResult(investmentsResult, 'investments');

    // Determine overall status
    const successCount = [balance, assets, investments].filter((r) => r.available).length;
    let status = 'failed';
    if (successCount === 3) status = 'complete';
    else if (successCount > 0) status = 'partial';

    // Build Supabase payload
    const updatePayload = {
      balances: balance.data,
      asset_report: assets.data,
      asset_report_token: assets.data?.asset_report_token || null,
      investments: investments.data,
      available_products: {
        balance: balance.available,
        assets: assets.available,
        investments: investments.available,
      },
      fetch_errors: {
        balance: balance.error,
        assets: assets.error,
        investments: investments.error,
      },
      status,
    };

    // Save to Supabase
    const { error: dbError } = await supabase
      .from('user_financial_data')
      .update(updatePayload)
      .eq('user_id', userId);

    if (dbError) {
      console.error('[Supabase] Error saving financial data:', dbError);
    }

    // Return response to client
    return res.status(200).json({
      status,
      balance: {
        available: balance.available,
        data: balance.data,
        error: balance.error,
        reason: balance.reason || null,
      },
      assets: {
        available: assets.available,
        data: assets.data,
        error: assets.error,
        reason: assets.reason || null,
      },
      investments: {
        available: investments.available,
        data: investments.data,
        error: investments.error,
        reason: investments.reason || null,
      },
      summary: {
        products_available: successCount,
        products_total: 3,
        can_proceed: successCount > 0,
      },
    });
  } catch (error) {
    console.error('[Plaid] Error fetching financial data:', error);
    return res.status(500).json({
      error: 'Failed to fetch financial data',
      details: error.message,
    });
  }
}
