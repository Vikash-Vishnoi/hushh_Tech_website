/**
 * Plaid Service — Client-side API calls
 * 
 * Handles communication with our serverless Plaid API routes.
 * All sensitive operations (access_token exchange, data fetching)
 * happen server-side. This service only sends requests.
 */

// =====================================================
// Types
// =====================================================

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface PlaidExchangeResponse {
  access_token: string;
  item_id: string;
  record_id: string | null;
}

/** Status of a single financial product fetch */
export type ProductFetchStatus = 'idle' | 'loading' | 'success' | 'unavailable' | 'error' | 'pending';

/** Result for a single product from the API */
export interface ProductResult {
  available: boolean;
  data: any | null;
  error: string | null;
  reason: 'not_supported' | 'error' | null;
}

/** Full financial data response from API */
export interface FinancialDataResponse {
  status: 'complete' | 'partial' | 'failed';
  balance: ProductResult;
  assets: ProductResult;
  investments: ProductResult;
  summary: {
    products_available: number;
    products_total: number;
    can_proceed: boolean;
  };
}

/** Asset report poll response */
export interface AssetReportPollResponse {
  status: 'complete' | 'pending';
  data?: any;
  message?: string;
}

// =====================================================
// API Base URL
// =====================================================

const API_BASE = '/api/plaid';

// =====================================================
// Service Functions
// =====================================================

/**
 * Create a Plaid Link token for initializing Plaid Link
 */
export const createLinkToken = async (
  userId: string,
  userEmail?: string,
): Promise<PlaidLinkTokenResponse> => {
  const response = await fetch(`${API_BASE}/create-link-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userEmail }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to create link token');
  }

  return response.json();
};

/**
 * Exchange public_token for access_token after Plaid Link success
 */
export const exchangeToken = async (
  publicToken: string,
  userId: string,
  institutionName?: string,
  institutionId?: string,
): Promise<PlaidExchangeResponse> => {
  const response = await fetch(`${API_BASE}/exchange-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicToken,
      userId,
      institutionName,
      institutionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to exchange token');
  }

  return response.json();
};

/**
 * Fetch all financial data (Balance, Assets, Investments) in parallel
 */
export const fetchFinancialData = async (
  accessToken: string,
  userId: string,
  itemId?: string,
): Promise<FinancialDataResponse> => {
  const response = await fetch(`${API_BASE}/fetch-financial-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, userId, itemId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to fetch financial data');
  }

  return response.json();
};

/**
 * Poll asset report status (for async asset reports)
 */
export const checkAssetReport = async (
  assetReportToken: string,
  userId: string,
): Promise<AssetReportPollResponse> => {
  const response = await fetch(`${API_BASE}/check-asset-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetReportToken, userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to check asset report');
  }

  return response.json();
};

// =====================================================
// Utility Functions
// =====================================================

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount: number | null | undefined, currency = 'USD'): string => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get display-friendly status for a product
 */
export const getProductStatus = (product: ProductResult): ProductFetchStatus => {
  if (product.available) {
    // Check if it's a pending asset report
    if (product.data?.status === 'pending') return 'pending';
    return 'success';
  }
  if (product.reason === 'not_supported') return 'unavailable';
  if (product.error) return 'error';
  return 'idle';
};

/**
 * Get the header title based on how many products are available
 */
export const getHeaderTitle = (availableCount: number): string => {
  switch (availableCount) {
    case 3: return '✨ Complete Financial Profile';
    case 2: return '📊 Financial Profile Verified';
    case 1: return '💰 Account Verified';
    case 0: return '⚠️ Unable to Verify';
    default: return '💰 Financial Verification';
  }
};
