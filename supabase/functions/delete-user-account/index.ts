import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

import { corsGuard, getCorsHeaders } from '../_shared/cors.ts'
import { executeDeleteUserAccount } from './service.ts'

function jsonResponse(
  status: number,
  body: unknown,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  const corsFailure = corsGuard(req, { label: 'delete-user-account' })
  if (corsFailure) return corsFailure

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: getCorsHeaders(req, { allowMethods: 'POST, OPTIONS' }),
    })
  }

  const corsHeaders = getCorsHeaders(req, { allowMethods: 'POST, OPTIONS' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(500, {
      success: false,
      error: 'Server configuration error',
      details: 'Supabase environment variables are missing',
    }, corsHeaders)
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const result = await executeDeleteUserAccount(
    adminClient,
    req.headers.get('Authorization')
  )

  return jsonResponse(result.status, result.body, corsHeaders)
})
