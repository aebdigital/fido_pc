// Supabase Edge Function to proxy ApplyPark ARES API requests
// This avoids CORS issues when calling from browser

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const APPLYPARK_BASE_URL = 'https://doplnky.applypark.cz/api/ares/';
const APPLYPARK_TOKEN = 'EtInGbevF36MQa4MWag8FaeJtpcN0QXjXFK';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ico } = await req.json()

    if (!ico || ico.length < 3) {
      return new Response(
        JSON.stringify({ error: 'IČO must be at least 3 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call ApplyPark API
    const url = `${APPLYPARK_BASE_URL}?token=${APPLYPARK_TOKEN}&ico=${ico}&country=SK`;
    const response = await fetch(url);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'ApplyPark API error', status: response.status }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
