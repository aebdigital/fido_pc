// ApplyPark ARES API for Slovak company lookup (same as iOS app)
// Uses Supabase Edge Function as proxy to avoid CORS issues

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export async function searchRpoEntitiesByName(query) {
  if (!query || query.length < 3) return [];

  // ApplyPark API only works with IČO (numeric), not name search
  // Check if query is numeric (IČO)
  const isNumeric = /^\d+$/.test(query.trim());

  if (!isNumeric) {
    // For non-numeric queries, we can't use ApplyPark (it requires exact IČO)
    // Return empty - user must enter IČO
    console.log('ApplyPark API requires IČO (numeric). For name search, enter the company IČO.');
    return [];
  }

  try {
    // Use Supabase Edge Function as proxy to avoid CORS
    const response = await fetch(`${SUPABASE_URL}/functions/v1/applypark-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ ico: query.trim() })
    });

    if (!response.ok) {
      console.error('ApplyPark search failed', response.status);
      return [];
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      return [];
    }

    return results.map((company) => {
      // Get first address if available
      const addr = company.address?.[0];

      return {
        id: company.ico || query,
        name: company.companyName || '',
        ico: company.ico || '',
        dic: company.dic || '',
        dicDph: company.dicDph || '', // VAT registration number
        address: addr ? {
          street: addr.street || '',
          buildingNumber: addr.buildingNumber || '',
          postalCode: addr.zipCode || '',
          municipality: addr.city || '',
          country: addr.country || 'Slovensko'
        } : undefined
      };
    });
  } catch (error) {
    console.error('ApplyPark search error', error);
    return [];
  }
}
