const BASE_URL = 'https://api.statistics.sk/rpo/v1';

export async function searchRpoEntitiesByName(query) {
  if (!query || query.length < 3) return [];

  // Check if query is numeric (IČO)
  const isNumeric = /^\d+$/.test(query);

  const params = new URLSearchParams({
    limit: '10',
  });

  if (isNumeric) {
    params.append('identifier', query);
  } else {
    params.append('fullName', query);
  }

  try {
    const res = await fetch(`${BASE_URL}/search?${params.toString()}`);
    if (!res.ok) {
      console.error('RPO search failed', res.status);
      return [];
    }

    const data = await res.json();
    const results = data.results || [];

    return results.map((item) => {
      // Find active name
      const nameObj = item.fullNames?.find((n) => !n.validTo) || item.fullNames?.[0];
      const name = nameObj?.value || '';

      // Find active identifier (IČO)
      const idObj = item.identifiers?.find((i) => !i.validTo) || item.identifiers?.[0];
      const ico = idObj?.value;

      // Find active address
      const addrObj = item.addresses?.find((a) => !a.validTo) || item.addresses?.[0];

      const address = addrObj ? {
        street: addrObj.street,
        buildingNumber: addrObj.buildingNumber,
        postalCode: addrObj.postalCodes?.[0],
        municipality: addrObj.municipality?.value
      } : undefined;

      return {
        id: String(item.id),
        name,
        ico,
        dic: '', // DIČ not available in public RPO API
        address
      };
    });
  } catch (error) {
    console.error('RPO search error', error);
    return [];
  }
}
