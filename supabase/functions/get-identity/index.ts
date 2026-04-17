// get-identity — Fetch account owner identity data from Plaid
// Returns: name, email, phone, address from the bank
import { corsGuard, getCorsHeaders, withCors } from '../_shared/cors.ts';
import { getPlaidConfig } from '../_shared/plaid.ts';
import { authenticateEdgeRequest } from '../_shared/security.ts';

Deno.serve(async (req) => {
  const corsFailure = corsGuard(req, { label: 'get-identity' });
  if (corsFailure) return corsFailure;

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: getCorsHeaders(req, { allowMethods: 'POST, OPTIONS' }),
    });
  }

  const corsHeaders = getCorsHeaders(req, { allowMethods: 'POST, OPTIONS' });

  try {
    const authFailure = await authenticateEdgeRequest(req, {
      label: 'get-identity',
    });
    if (authFailure) return withCors(req, authFailure, { allowMethods: 'POST, OPTIONS' });

    const body = await req.json();
    const accessToken = body.accessToken || body.access_token;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'accessToken is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const plaid = getPlaidConfig();

    const response = await fetch(`${plaid.baseUrl}/identity/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: plaid.clientId,
        secret: plaid.secret,
        access_token: accessToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error_message, error_code: data.error_code }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
