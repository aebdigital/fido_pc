// OpenAI Receipt Analysis Service (same as iOS implementation)
// Uses GPT-4 Vision to analyze receipt images

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Get API key from environment variable
const getApiKey = () => {
  return process.env.REACT_APP_OPENAI_API_KEY || '';
};

export async function analyzeReceipt(imageBase64) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error('OpenAI API key not configured. Add REACT_APP_OPENAI_API_KEY to your .env file.');
    throw new Error('OpenAI API key not configured');
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

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API Error (${response.status}):`, errorText);
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI API');
    }

    // Parse the JSON response from GPT
    // Sometimes GPT wraps JSON in markdown code blocks, so we need to extract it
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonContent = content.split('```')[1].split('```')[0].trim();
    }

    const receiptData = JSON.parse(jsonContent);

    // Return in the format expected by the desktop app
    return {
      total_amount: receiptData.amount,
      vendor_name: receiptData.merchantName,
      date: receiptData.date,
      receipt_number: receiptData.receiptNumber,
      category: receiptData.category,
      items: receiptData.items,
      raw_text: receiptData.extractedText
    };
  } catch (error) {
    console.error('Receipt analysis failed:', error);
    throw error;
  }
}

