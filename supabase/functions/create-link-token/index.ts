// create-link-token — Creates a Plaid Link token for initializing Plaid Link
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, userEmail } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';
    const baseUrl = `https://${PLAID_ENV}.plaid.com`;

    // Support OAuth redirect URI for banks that use OAuth (e.g., Chase)
    const redirectUri = body.redirectUri || null;

    const linkConfig: Record<string, any> = {
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      user: { client_user_id: userId, email_address: userEmail },
      client_name: 'Hushh',
      products: ['auth', 'transactions', 'investments', 'assets'],
      country_codes: ['US'],
      language: 'en',
    };

    // Add redirect_uri for OAuth flow — required for banks like Chase, Wells Fargo
    if (redirectUri) {
      linkConfig.redirect_uri = redirectUri;
    }

    const response = await fetch(`${baseUrl}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkConfig),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[create-link-token] Plaid error:', data);
      return new Response(
        JSON.stringify({ error: data.error_message || 'Failed to create link token', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ link_token: data.link_token, expiration: data.expiration }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[create-link-token] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
