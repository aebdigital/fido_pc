import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
        const { imageBase64 } = await req.json()

        if (!imageBase64) {
            return new Response(
                JSON.stringify({ error: 'Image data is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
        if (!OPENAI_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'OpenAI API key not configured in Supabase' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Remove data URL prefix if present
        const base64Data = imageBase64.includes('base64,')
            ? imageBase64.split('base64,')[1]
            : imageBase64;

        const payload = {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Analyze this receipt image and extract the following information in JSON format:

{
  "merchantName": "string or null",
  "amount": number or null,
  "date": "YYYY-MM-DD" or null,
  "receiptNumber": "string or null",
  "category": "string or null (e.g., 'Materials', 'Tools', 'Labor', 'Other')",
  "items": [
    {
      "name": "string",
      "quantity": number or null,
      "price": number or null
    }
  ] or null,
  "extractedText": "string - all visible text from the receipt"
}

Rules:
- Extract the merchant/store name
- Find the total amount (look for "Total", "Sum", "Amount Due", "Celkom", "Spolu", etc.)
- Extract the date of purchase
- Find receipt/transaction number if visible
- Categorize as construction-related: Materials, Tools, Labor, or Other
- List individual items if clearly visible
- Include ALL visible text in extractedText field
- Return only valid JSON, no additional text`
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Data}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(
                JSON.stringify({ error: 'OpenAI API error', detail: errorText }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return new Response(
                JSON.stringify({ error: 'No response from OpenAI' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse the JSON response from GPT
        let jsonContent = content;
        if (content.includes('```json')) {
            jsonContent = content.split('```json')[1].split('```')[0].trim();
        } else if (content.includes('```')) {
            jsonContent = content.split('```')[1].split('```')[0].trim();
        }

        const receiptData = JSON.parse(jsonContent);

        return new Response(
            JSON.stringify(receiptData),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
