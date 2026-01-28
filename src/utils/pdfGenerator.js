import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { InterRegular } from './fonts/InterRegular';
import { InterBold } from './fonts/InterBold';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES, UNIT_TYPES } from '../config/constants';
import { unitToDisplaySymbol } from '../services/workItemsMapping';
import { sortItemsByMasterList } from './itemSorting';

// SEPA countries list (European Payments Council members)
const SEPA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT',
  'LV', 'LI', 'LT', 'LU', 'MT', 'MC', 'NL', 'NO', 'PL', 'PT', 'RO', 'SM', 'SK', 'SI', 'ES', 'SE',
  'CH', 'GB'
]);

// Helper to load image from URL and convert to Base64
const loadImageToBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load image:', url, error);
    return null;
  }
};



// Validate IBAN using modulo 97 check (ISO 13616)
const isValidIBAN = (iban) => {
  if (!iban) return false;

  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  if (cleanIBAN.length < 4) return false;

  // Move first 4 characters to end
  const rearranged = cleanIBAN.slice(4) + cleanIBAN.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      // Letter A-Z
      numericString += (code - 55).toString();
    } else if (code >= 48 && code <= 57) {
      // Digit 0-9
      numericString += char;
    } else {
      return false; // Invalid character
    }
  }

  // Calculate modulo 97 using string-based division (handles large numbers)
  let remainder = 0;
  for (const digit of numericString) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  return remainder === 1;
};

// Check if IBAN country is in SEPA zone
const isIBANInSEPACountry = (iban) => {
  if (!iban) return false;
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  if (cleanIBAN.length < 2) return false;
  const countryCode = cleanIBAN.slice(0, 2);
  return SEPA_COUNTRIES.has(countryCode);
};

// Normalize text for QR code (replace Unicode characters that can break scanning)
const normalizeForQR = (text) => {
  if (!text) return '';
  // Ensure text is a string
  const str = String(text);
  return str
    // Normalize newlines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace various Unicode dashes with ASCII hyphen
    .replace(/\u2010/g, '-') // hyphen
    .replace(/\u2011/g, '-') // non-breaking hyphen
    .replace(/\u2012/g, '-') // figure dash
    .replace(/\u2013/g, '-') // en dash
    .replace(/\u2014/g, '-') // em dash
    .replace(/\u2015/g, '-') // horizontal bar
    // Replace other problematic characters
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"'); // smart double quotes
};

// Generate EPC QR code for SEPA payment (Slovak "Pay by Square" compatible)
const generatePaymentQRCode = async (iban, bic, amount, invoiceNumber, recipientName) => {
  try {
    // Validate IBAN
    if (!isValidIBAN(iban)) {
      console.warn('Invalid IBAN, skipping QR code generation');
      return null;
    }

    // Check if IBAN is from SEPA country
    if (!isIBANInSEPACountry(iban)) {
      console.warn('IBAN is not from a SEPA country, skipping QR code generation');
      return null;
    }

    // Clean and normalize inputs
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    const cleanBIC = normalizeForQR(bic || '');
    const cleanName = normalizeForQR(recipientName?.substring(0, 70) || '');
    const cleanInvoiceNumber = normalizeForQR(invoiceNumber || '');

    // EPC QR code format (European Payments Council)
    // This is the standard format used in Slovakia for payment QR codes
    const epcData = [
      'BCD',                           // Service Tag
      '002',                           // Version
      '1',                             // Character set (1 = UTF-8)
      'SCT',                           // Identification (SEPA Credit Transfer)
      cleanBIC,                        // BIC/SWIFT of beneficiary bank
      cleanName,                       // Name of beneficiary (max 70 chars)
      cleanIBAN,                       // IBAN of beneficiary
      `EUR${amount?.toFixed(2) || '0.00'}`, // Amount in EUR
      '',                              // Purpose (optional)
      cleanInvoiceNumber,              // Remittance reference (variable symbol)
      '',                              // Remittance text (optional)
      ''                               // Beneficiary to originator info (optional)
    ].join('\n');

    const qrDataUrl = await QRCode.toDataURL(epcData, {
      width: 150,
      margin: 1,
      errorCorrectionLevel: 'M'
    });

    return qrDataUrl;
  } catch (error) {
    console.warn('Failed to generate payment QR code:', error);
    return null;
  }
};

// Helper to determine work item unit based on propertyId and fields
// Returns just the unit (like 'm2', 'ks', 'h') without €/ prefix
const getWorkItemUnit = (item) => {
  // If already has unit in calculation, extract just the unit part
  if (item.calculation?.unit) {
    let unit = item.calculation.unit;
    // Remove €/ prefix if present
    if (unit.startsWith('€/')) unit = unit.substring(2);
    // Convert iOS unit values to display symbols
    return unitToDisplaySymbol(unit);
  }
  if (item.unit) {
    let unit = item.unit;
    if (unit.startsWith('€/')) unit = unit.substring(2);
    // Convert iOS unit values to display symbols
    return unitToDisplaySymbol(unit);
  }

  const propertyId = item.propertyId;
  const fields = item.fields || {};

  // Check based on propertyId
  if (propertyId === WORK_ITEM_PROPERTY_IDS.PREPARATORY) return 'h';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WIRING) return 'pc';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.PLUMBING) return 'pc';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE) return 'km';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.CORNER_BEAD) return 'm';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_SASH) return 'm';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.SILICONING) return 'm';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) return 'pc';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) return 'm';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION) return 'pc';
  if (propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    // Convert iOS unit values (e.g., "squareMeter") to display symbols (e.g., "m²")
    return unitToDisplaySymbol(item.selectedUnit) || UNIT_TYPES.METER_SQUARE;
  }

  // Check based on fields to determine unit
  if (fields[WORK_ITEM_NAMES.DURATION_EN] || fields[WORK_ITEM_NAMES.DURATION_SK]) return 'h';
  if (fields[WORK_ITEM_NAMES.COUNT] || fields[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || fields[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK]) return 'pc';
  if (fields[WORK_ITEM_NAMES.LENGTH] && !fields[WORK_ITEM_NAMES.WIDTH] && !fields[WORK_ITEM_NAMES.HEIGHT]) return 'm';
  if (fields[WORK_ITEM_NAMES.CIRCUMFERENCE]) return 'm';

  // Default to m2 for area-based work
  return 'm2';
};


// Helper to get work item name from propertyId
const getWorkItemNameByPropertyId = (propertyId) => {
  const propertyIdToName = {
    [WORK_ITEM_PROPERTY_IDS.PREPARATORY]: 'Preparatory and demolition works',
    [WORK_ITEM_PROPERTY_IDS.WIRING]: 'Electrical installation work',
    [WORK_ITEM_PROPERTY_IDS.PLUMBING]: 'Plumbing work',
    [WORK_ITEM_PROPERTY_IDS.BRICK_PARTITIONS]: 'Brick partitions',
    [WORK_ITEM_PROPERTY_IDS.BRICK_LOAD_BEARING]: 'Brick load-bearing wall',
    [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_PARTITION]: 'Plasterboarding',
    [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_OFFSET]: 'Plasterboarding',
    [WORK_ITEM_PROPERTY_IDS.PLASTERBOARDING_CEILING]: 'Plasterboarding',
    [WORK_ITEM_PROPERTY_IDS.NETTING_WALL]: 'Netting',
    [WORK_ITEM_PROPERTY_IDS.NETTING_CEILING]: 'Netting',
    [WORK_ITEM_PROPERTY_IDS.PLASTERING_WALL]: 'Plastering',
    [WORK_ITEM_PROPERTY_IDS.PLASTERING_CEILING]: 'Plastering',
    [WORK_ITEM_PROPERTY_IDS.FACADE_PLASTERING]: 'Facade Plastering',
    [WORK_ITEM_PROPERTY_IDS.CORNER_BEAD]: 'Installation of corner bead',
    [WORK_ITEM_PROPERTY_IDS.WINDOW_SASH]: 'Plastering of window sash',
    [WORK_ITEM_PROPERTY_IDS.PENETRATION_COATING]: 'Penetration coating',
    [WORK_ITEM_PROPERTY_IDS.PAINTING_WALL]: 'Painting',
    [WORK_ITEM_PROPERTY_IDS.PAINTING_CEILING]: 'Painting',
    [WORK_ITEM_PROPERTY_IDS.LEVELLING]: 'Levelling',
    [WORK_ITEM_PROPERTY_IDS.FLOATING_FLOOR]: 'Floating floor',
    [WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60]: 'Tiling under 60cm',
    [WORK_ITEM_PROPERTY_IDS.PAVING_UNDER_60]: 'Paving under 60cm',
    [WORK_ITEM_PROPERTY_IDS.GROUTING]: 'Grouting',
    [WORK_ITEM_PROPERTY_IDS.SILICONING]: 'Siliconing',
    [WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION]: 'Sanitary installations',
    [WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION]: 'Window installation',
    [WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION]: 'Installation of door jamb',
    [WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK]: 'Custom work and material',
    [WORK_ITEM_PROPERTY_IDS.COMMUTE]: 'Commute'
  };
  return propertyIdToName[propertyId] || null;
};

// Register Inter font with jsPDF
const registerInterFont = (doc) => {
  doc.addFileToVFS('Inter-Regular.ttf', InterRegular);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', InterBold);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
  doc.setFont('Inter');
};

// With custom font (Inter), we can now keep Slovak characters
const sanitizeText = (text) => {
  if (!text) return '';
  return String(text);
};

// Fix for Slovak work names showing in English mode
// Maps standard Slovak work names to English equivalent
const SLOVAK_WORK_NAMES_FIX = {
  'Prípravné a búracie práce': 'Preparatory and demolition works',
  'Elektroinštalačné práce': 'Electrical installation work',
  'Vodoinštalačné práce': 'Plumbing work',
  'Murovanie priečok': 'Brick partitions',
  'Murovanie nosného muriva': 'Brick load-bearing wall',
  'Sádrokartón': 'Plasterboarding',
  'Sieťkovanie': 'Netting',
  'Omietka': 'Plastering',
  'Fasádne omietky': 'Facade Plastering',
  'Nivelačka': 'Levelling',
  'Pomocné a ukončovacie práce': 'Auxiliary and finishing work',
  'Osadenie okna': 'Window installation',
  'Osadenie zárubne': 'Installation of door jamb',
  'Samonivelizačná hmota': 'Self-leveling compound',
  'Pomocný a spojovací materiál': 'Auxiliary and connecting material',
  'Lepidlo, obklad a dlažba': 'Adhesive, tiling and paving',
  'Dlažba, veľkoformát': 'Pavings, large format'
};

// Fix for Slovak units showing in English mode
const SLOVAK_UNIT_FIX = {
  'hod': 'h',
  'ks': 'pc',
  'bal': 'pkg',
  'deň': 'day',
  'dní': 'days'
};

export const generateInvoicePDF = async ({
  invoice,
  contractor,
  client,
  projectBreakdown,
  vatRate,
  totalWithoutVAT,
  vat,
  totalWithVAT,
  formatDate,
  formatPrice,
  t, // Add t function here
  options = {}
}) => {
  const { isPriceOffer = false, projectNotes = '', projectNumber = '', offerValidityPeriod = 30 } = options;

  // Internal helper for PDF currency formatting (7,00 €)
  const formatCurrency = (amount) => {
    return (amount || 0).toFixed(2).replace('.', ',') + ' €';
  };

  // Helper to remove trailing zeros (12.00 -> 12, 12.10 -> 12.1)
  const formatSmartDecimal = (num, decimals = 2) => {
    if (num === null || num === undefined) return '0';
    return parseFloat(num.toFixed(decimals)).toString();
  };

  // Pre-load footer icons
  const userIconData = await loadImageToBase64('/user_18164876.png');
  const phoneIconData = await loadImageToBase64('/phone-receiver-silhouette_1257.png');
  const mailIconData = await loadImageToBase64('/mail.png');

  try {
    const doc = new jsPDF();
    registerInterFont(doc);

    // === HEADER SECTION ===

    // Logo - Top Right (preserve aspect ratio)
    const maxLogoSize = 45; // reduced from 62
    if (contractor?.logo) {
      try {
        let format = 'JPEG';
        if (typeof contractor.logo === 'string' && contractor.logo.startsWith('data:image/')) {
          if (contractor.logo.includes('png')) format = 'PNG';
        }

        // Use jsPDF's getImageProperties to get dimensions and preserve aspect ratio
        const imgProps = doc.getImageProperties(contractor.logo);
        let logoWidth = maxLogoSize;
        let logoHeight = maxLogoSize;

        if (imgProps.width && imgProps.height) {
          const aspectRatio = imgProps.width / imgProps.height;
          if (aspectRatio > 1) {
            // Wider than tall
            logoWidth = maxLogoSize;
            logoHeight = maxLogoSize / aspectRatio;
          } else {
            // Taller than wide or square
            logoHeight = maxLogoSize;
            logoWidth = maxLogoSize * aspectRatio;
          }
        }

        const logoX = 197.65 - logoWidth; // 210 - 12.35 margin
        const logoY = 8 + (maxLogoSize - logoHeight) / 2; // Moved up from 12.35 to 8
        doc.addImage(contractor.logo, format, logoX, logoY, logoWidth, logoHeight);
      } catch (e) {
        console.warn('Failed to add logo to PDF:', e);
      }
    }

    // Invoice number / Price Offer title - left side
    doc.setFontSize(25);
    doc.setFont('Inter', 'bold');

    if (isPriceOffer) {
      // New format: CP {number} - {name} as MAIN TITLE (same style as invoice)
      const title = `${t('Price Offer Abbr')} ${projectNumber || ''} - ${invoice.projectName || ''}`;
      doc.text(sanitizeText(title), 12.35, 20);

      // Project Notes - same style as invoice subtitle (fontSize 14, 4px below title)
      if (projectNotes) {
        doc.setFontSize(14);
        doc.setFont('Inter', 'normal');
        const splitNotes = doc.splitTextToSize(sanitizeText(projectNotes), 120);
        doc.text(splitNotes, 12.35, 26);
      }
    } else {
      doc.text(sanitizeText(`${t('Invoice')} ${invoice.invoiceNumber}`), 12.35, 20);
      doc.setFontSize(14);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(`${t('Price offer')} ${projectNumber || invoice.invoiceNumber}`), 12.35, 26);
    }

    // === CLIENT SECTION (Odberatel) - Left side under header ===
    let clientY = 45;

    // Odberatel heading - 30% bigger (10 * 1.3 = 13)
    doc.setFontSize(13);
    doc.setFont('Inter', 'bold');
    doc.text(sanitizeText(t('Customer')), 12.35, clientY);

    doc.setFontSize(10);
    doc.setFont('Inter', 'normal');
    clientY += 6;

    // First, calculate how many lines the address will have
    const contentStartY = clientY;
    let addressLines = [];

    if (client) {
      if (client.name) addressLines.push(client.name);
      if (client.street) addressLines.push(client.street);
      const additionalInfo = client.additionalInfo || client.second_row_street;
      if (additionalInfo) addressLines.push(additionalInfo);
      const cityPostal = [client.postal_code || client.postalCode, client.city].filter(Boolean).join(' ');
      if (cityPostal) addressLines.push(cityPostal);
      if (client.country) addressLines.push(client.country);
      // Add Email and Phone if available
      if (client.email) addressLines.push(client.email);
      if (client.phone) addressLines.push(client.phone);
    }

    // Calculate the bottom Y position based on address content
    const lineHeight = 5;
    const minLines = 5;
    const actualLines = Math.max(addressLines.length, minLines);
    const addressBottomY = contentStartY + (actualLines * lineHeight);

    // --- Draw LEFT COLUMN: Address (top-aligned) ---
    let addressY = contentStartY;
    addressLines.forEach(line => {
      doc.text(sanitizeText(line), 12.35, addressY);
      addressY += lineHeight;
    });
    if (addressLines.length === 0 && !client) {
      doc.text(sanitizeText('-'), 12.35, contentStartY);
    }

    // --- Draw MIDDLE COLUMN: Business IDs (bottom-aligned) ---
    const businessX = 75;
    const businessId = client?.business_id || client?.businessId;
    const taxId = client?.tax_id || client?.taxId;
    const vatId = client?.vat_registration_number || client?.vatId || client?.vatNumber;

    let businessLines = [];
    if (businessId) businessLines.push(`IČO: ${businessId}`);
    if (taxId) businessLines.push(`DIČ: ${taxId}`);
    if (vatId) businessLines.push(`IČ DPH: ${vatId}`);

    // Calculate start Y so bottom aligns with address bottom
    const businessStartY = addressBottomY - (businessLines.length * lineHeight);
    let businessY = businessStartY;
    businessLines.forEach(line => {
      doc.text(sanitizeText(line), businessX, businessY);
      businessY += lineHeight;
    });

    // --- Draw RIGHT COLUMN: Dates (bottom-aligned) ---
    const rightBlockX = 197.65;
    const labelX = rightBlockX - 60;

    let dateLines = [];
    if (isPriceOffer) {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + parseInt(offerValidityPeriod || 30));
      dateLines = [
        { label: `${t('Issue Date')}:`, value: formatDate(today.toISOString()) },
        { label: `${t('Valid until')}:`, value: formatDate(validUntil.toISOString()) }
      ];
    } else {
      const paymentText = invoice.paymentMethod === 'cash' ? t('Hotovosť') : t('Prevodom');
      dateLines = [
        { label: `${t('Issue Date')}:`, value: formatDate(invoice.issueDate) },
        { label: `${t('Due Date')}:`, value: formatDate(invoice.dueDate) },
        { label: `${t('Date of Dispatch')}:`, value: formatDate(invoice.dispatchDate || invoice.issueDate) },
        { label: `${t('Payment Method')}:`, value: paymentText }
      ];
    }

    // Calculate start Y so bottom aligns with address bottom
    const datesStartY = addressBottomY - (dateLines.length * lineHeight);
    let dateY = datesStartY;
    dateLines.forEach(line => {
      doc.text(sanitizeText(line.label), labelX, dateY, { align: 'left' });
      doc.text(sanitizeText(line.value), rightBlockX, dateY, { align: 'right' });
      dateY += lineHeight;
    });

    // Update clientY to the bottom of the section
    clientY = addressBottomY;

    // === FOUR INFO BOXES - Only for Invoice ===
    let tableStartY = clientY + 6;
    let boxY = 0;
    let boxHeight = 0;

    if (!isPriceOffer) {
      boxY = clientY + 4;
      const ibanBoxWidth = 60;
      const boxWidth = 40;
      boxHeight = 11; // reduced from 14 for a tighter look
      const boxStartX = 12.35;
      const gap = 4;
      const borderRadius = 5; // Pills style

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);

      // Get bank account for first box
      const contractorBankAccount = contractor?.bank_account_number || contractor?.bankAccount || '';

      // Box 1: Cislo uctu / IBAN (wider)
      doc.roundedRect(boxStartX, boxY, ibanBoxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(7);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(t('Bank Account / IBAN')), boxStartX + 4, boxY + 3.5); // centered vertically more
      doc.setFontSize(8);
      doc.setFont('Inter', 'bold');
      // Truncate IBAN if too long
      const ibanDisplay = contractorBankAccount.length > 30 ? contractorBankAccount.substring(0, 30) + '...' : contractorBankAccount;
      doc.text(sanitizeText(ibanDisplay || '-'), boxStartX + 4, boxY + 7.5); // reduced gap between label and value

      // Box 2: Variabilny symbol
      const box2X = boxStartX + ibanBoxWidth + gap;
      doc.roundedRect(box2X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(7);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(t('Variable Symbol')), box2X + 4, boxY + 3.5);
      doc.setFontSize(8);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(invoice.invoiceNumber), box2X + 4, boxY + 7.5);

      // Box 3: Datum splatnosti
      const box3X = box2X + boxWidth + gap;
      doc.roundedRect(box3X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(7);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(t('Due Date')), box3X + 4, boxY + 3.5);
      doc.setFontSize(8);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(formatDate(invoice.dueDate)), box3X + 4, boxY + 7.5);

      // Box 4: Suma na uhradu
      const box4X = box3X + boxWidth + gap;
      doc.roundedRect(box4X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(7);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(t('Amount Due')), box4X + 4, boxY + 3.5);
      doc.setFontSize(8);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(formatCurrency(totalWithVAT)), box4X + 4, boxY + 7.5);

      tableStartY = boxY + boxHeight + 6;
    } else {
      // For Price Offer, start table closer to client section
      tableStartY = clientY + 6;
    }

    // === ITEMS TABLE ===

    // Build detailed breakdown from project
    const tableData = [];

    // Debug: Log breakdown contents for custom work items
    const customWorkItems = projectBreakdown?.items?.filter(i => i.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) || [];
    const customMaterialItems = projectBreakdown?.materialItems?.filter(i => i.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) || [];
    console.log('[PDF] Custom work items in breakdown:', customWorkItems.length, customWorkItems);
    console.log('[PDF] Custom material items in breakdown:', customMaterialItems.length, customMaterialItems);

    // Add work items with category header
    if (projectBreakdown && projectBreakdown.items && projectBreakdown.items.length > 0) {
      tableData.push([
        { content: sanitizeText(t('Work (Table Header)')).charAt(0).toUpperCase() + sanitizeText(t('Work (Table Header)')).slice(1).toLowerCase(), colSpan: 6, styles: { fontStyle: 'normal', fillColor: [240, 240, 240], fontSize: 8 } }
      ]);

      const sortedItems = sortItemsByMasterList(projectBreakdown.items, options.priceList, 'work');

      sortedItems.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const workCost = item.calculation?.workCost || 0;
        const pricePerUnit = quantity > 0 ? workCost / quantity : 0;

        let unit = getWorkItemUnit(item);
        // Fix for Slovak units in English mode
        if (SLOVAK_UNIT_FIX[unit]) unit = SLOVAK_UNIT_FIX[unit];

        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = workCost * itemVatRate;

        // Get the work item name - try multiple sources
        let rawName = item.name || getWorkItemNameByPropertyId(item.propertyId) || '';
        // Fix for Slovak work names in English mode
        if (SLOVAK_WORK_NAMES_FIX[rawName]) rawName = SLOVAK_WORK_NAMES_FIX[rawName];

        const itemName = rawName;
        let displayName;
        // For plasterboarding items, build full translated name with subtitle and type
        if (item.propertyId && item.propertyId.startsWith('plasterboarding_') && item.subtitle && item.selectedType) {
          displayName = `${t(itemName)} ${t(item.subtitle)}, ${t(item.selectedType)}`;
        } else if (item.propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION && (item.selectedType || item.subtitle)) {
          // For sanitary installation, show the type name (e.g., "Rohový ventil") instead of generic name
          // Use selectedType first, fall back to subtitle (both are set when loading from DB)
          displayName = t(item.selectedType || item.subtitle);
        } else if ((item.propertyId === 'plinth_cutting' || item.propertyId === 'plinth_bonding') && item.subtitle) {
          // For plinth items, show name with subtitle (e.g., "Sokel - rezanie a brúsenie")
          displayName = `${t(itemName)} - ${t(item.subtitle)}`;
        } else if (item.isLargeFormat) {
          // For Large Format, show base name + "veľkoformát" (e.g., "Obklad Veľkoformát" not "Obklad do 60cm Veľkoformát")
          const baseName = item.propertyId === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60 ? 'Tiling' : 'Paving';
          displayName = `${t(baseName)} ${t(WORK_ITEM_NAMES.LARGE_FORMAT)}`;
        } else if (item.propertyId === WORK_ITEM_PROPERTY_IDS.WIRING || item.propertyId === WORK_ITEM_PROPERTY_IDS.PLUMBING) {
          // For electrical and plumbing work, show just the name without subtitle
          displayName = t(itemName);
        } else if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
          // Use specific fallback based on selectedType: 'Custom work' or 'Custom material'
          const fallbackName = item.selectedType === 'Material' ? 'Custom material' : 'Custom work';

          // Use user-entered name from fields, OR from item name if it's not generic
          // This handles cases where fields might be missing but the item name was preserved (e.g. edited title)
          const fieldName = item.fields?.[WORK_ITEM_NAMES.NAME];
          // Check if item.name is a specific user-entered string and not a generic fallback
          const isGenericName = !itemName ||
            itemName === 'Custom work' || itemName === 'Custom material' ||
            itemName === 'Vlastná práca' || itemName === 'Vlastný materiál' ||
            itemName === 'Custom work and material';

          displayName = fieldName || (!isGenericName ? itemName : null) || t(fallbackName);
        } else {
          // Add subtitle for work types (wall/ceiling distinction, etc.)
          displayName = item.subtitle ? `${t(itemName)} ${t(item.subtitle)}` : t(itemName);
        }

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${formatSmartDecimal(quantity, 2)}${t(unit)}`),
          sanitizeText(formatCurrency(pricePerUnit)),
          sanitizeText(`${Math.round(itemVatRate * 100)} %`),
          sanitizeText(formatCurrency(vatAmount)),
          sanitizeText(formatCurrency(workCost))
        ]);
      });
    }

    // Add material items with category header
    if (projectBreakdown && projectBreakdown.materialItems && projectBreakdown.materialItems.length > 0) {
      tableData.push([
        { content: sanitizeText(t('Material (Table Header)')).charAt(0).toUpperCase() + sanitizeText(t('Material (Table Header)')).slice(1).toLowerCase(), colSpan: 6, styles: { fontStyle: 'normal', fillColor: [240, 240, 240], fontSize: 8 } }
      ]);

      const sortedMaterials = sortItemsByMasterList(projectBreakdown.materialItems, options.priceList, 'material');

      sortedMaterials.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const materialCost = item.calculation?.materialCost || 0;
        const pricePerUnit = quantity > 0 ? materialCost / quantity : 0;
        let unit = item.calculation?.unit || item.unit || '';
        // Strip €/ prefix from unit if present (e.g. "€/m2" -> "m2")
        if (unit.startsWith('€/')) unit = unit.substring(2);
        // Convert iOS unit values to display symbols
        unit = unitToDisplaySymbol(unit);
        // Fix for Slovak units in English mode
        if (SLOVAK_UNIT_FIX[unit]) unit = SLOVAK_UNIT_FIX[unit];

        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = materialCost * itemVatRate;
        // Handle ceramic subtitle translation with correct gender based on propertyId
        let translatedSubtitle = '';
        if (item.subtitle) {
          if (item.subtitle.toLowerCase().includes('ceramic')) {
            // Use masculine for tiling (Obklad), feminine for paving (Dlažba)
            const isTiling = item.propertyId === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60;
            const genderKey = isTiling ? 'ceramic masculine' : 'ceramic feminine';
            translatedSubtitle = t(genderKey);
          } else {
            translatedSubtitle = t(item.subtitle);
          }
        }

        if (SLOVAK_WORK_NAMES_FIX[item.name]) item.name = SLOVAK_WORK_NAMES_FIX[item.name];

        let displayName;
        if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
          // Use specific fallback based on selectedType: 'Custom work' or 'Custom material'
          const fallbackName = item.selectedType === 'Material' ? 'Custom material' : 'Custom work';

          // Use user-entered name from fields, OR from item name if it's not generic
          const fieldName = item.fields?.[WORK_ITEM_NAMES.NAME];
          const itemName = item.name; // Use item.name from loop scope
          const isGenericName = !itemName ||
            itemName === 'Custom work' || itemName === 'Custom material' ||
            itemName === 'Vlastná práca' || itemName === 'Vlastný materiál' ||
            itemName === 'Custom work and material';

          displayName = fieldName || (!isGenericName ? itemName : null) || t(fallbackName);
        } else {
          displayName = translatedSubtitle ? `${t(item.name)} - ${translatedSubtitle}` : t(item.name);
        }

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${formatSmartDecimal(quantity, 2)}${t(unit)}`),
          sanitizeText(formatCurrency(pricePerUnit)),
          sanitizeText(`${Math.round(itemVatRate * 100)} %`),
          sanitizeText(formatCurrency(vatAmount)),
          sanitizeText(formatCurrency(materialCost))
        ]);
      });
    }

    // Add others items with category header
    if (projectBreakdown && projectBreakdown.othersItems && projectBreakdown.othersItems.length > 0) {
      tableData.push([
        { content: sanitizeText(t('Others (Table Header)')).charAt(0).toUpperCase() + sanitizeText(t('Others (Table Header)')).slice(1).toLowerCase(), colSpan: 6, styles: { fontStyle: 'normal', fillColor: [240, 240, 240], fontSize: 8 } }
      ]);

      // Group scaffolding items by their type (montáž/prenájom)
      const othersGroups = {};
      const nonGroupedOthers = [];

      const checkText = (text) => text && (
        text.includes('montáž a demontáž') || text.includes('prenájom') ||
        text.includes('assembly and disassembly') || text.includes('rental')
      );

      projectBreakdown.othersItems.forEach(item => {
        const isScaffolding = checkText(item.subtitle) || checkText(item.name);

        if (isScaffolding) {
          // Determine group key - prefer the one with the keywords
          const groupKey = checkText(item.name) ? item.name : item.subtitle;

          let quantity = item.calculation?.quantity || 0;
          let unit = item.calculation?.unit || '';
          if (unit.startsWith('€/')) unit = unit.substring(2);
          // Convert iOS unit values to display symbols
          unit = unitToDisplaySymbol(unit);

          const values = item.fields || {};

          // Determine unit and quantity for scaffolding based on groupKey
          if (groupKey.includes('- prenájom') || groupKey.includes('rental') || groupKey.includes('prenájom')) {
            quantity = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || quantity);
            unit = UNIT_TYPES.DAYS;
          } else {
            unit = UNIT_TYPES.METER_SQUARE;
          }

          const itemCost = (item.calculation?.workCost || 0) + (item.calculation?.materialCost || 0);

          if (!othersGroups[groupKey]) {
            othersGroups[groupKey] = {
              name: groupKey, // Use normalized group key as name
              unit: unit,
              totalQuantity: 0,
              totalCost: 0,
              vatRate: (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate
            };
          }
          othersGroups[groupKey].totalQuantity += quantity;
          othersGroups[groupKey].totalCost += itemCost;
        } else {
          nonGroupedOthers.push(item);
        }
      });

      // Sort groups: Rental/Prenájom first, then Assembly/Montáž
      const sortedGroups = Object.values(othersGroups).sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aIsRental = aName.includes('rental') || aName.includes('prenájom');
        const bIsRental = bName.includes('rental') || bName.includes('prenájom');

        // Rental comes first
        if (aIsRental && !bIsRental) return -1;
        if (!aIsRental && bIsRental) return 1;
        return 0;
      });

      // Print grouped scaffolding items
      sortedGroups.forEach(group => {
        const pricePerUnit = group.totalQuantity > 0 ? group.totalCost / group.totalQuantity : 0;
        const vatAmount = group.totalCost * group.vatRate;
        // Group unit is already converted/set
        const translatedUnit = t(group.unit);
        const formattedQuantity = (group.unit === UNIT_TYPES.DAY || group.unit === UNIT_TYPES.DAYS)
          ? `${Math.round(group.totalQuantity)} ${translatedUnit}`
          : `${formatSmartDecimal(group.totalQuantity, 2)}${translatedUnit}`;

        tableData.push([
          sanitizeText(t(group.name) || ''),
          sanitizeText(formattedQuantity),
          sanitizeText(formatCurrency(pricePerUnit)),
          sanitizeText(`${Math.round(group.vatRate * 100)} %`),
          sanitizeText(formatCurrency(vatAmount)),
          sanitizeText(formatCurrency(group.totalCost))
        ]);
      });

      // Sort and print non-grouped items
      const sortedNonGroupedOthers = sortItemsByMasterList(nonGroupedOthers, options.priceList, 'others');
      sortedNonGroupedOthers.forEach(item => {
        let quantity = item.calculation?.quantity || 0;
        const othersCost = (item.calculation?.workCost || 0) + (item.calculation?.materialCost || 0);
        let unit = item.calculation?.unit || item.unit || '';
        // Strip €/ prefix from unit if present (e.g. "€/h" -> "h")
        if (unit.startsWith('€/')) unit = unit.substring(2);
        // Convert iOS unit values to display symbols
        unit = unitToDisplaySymbol(unit);

        const values = item.fields || {};

        // Determine unit and quantity based on item type (same logic as RoomPriceSummary)
        if (!item.calculation?.unit) {
          // Check for scaffolding rental (fallback for non-grouped)
          if (item.subtitle && item.subtitle.includes('- prenájom') && values[WORK_ITEM_NAMES.RENTAL_DURATION]) {
            quantity = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
            unit = quantity > 1 ? UNIT_TYPES.DAYS : UNIT_TYPES.DAY;
          } else if (item.subtitle && (item.subtitle.includes('montáž a demontáž') || item.subtitle.includes('assembly and disassembly'))) {
            // Scaffolding assembly - use m²
            unit = UNIT_TYPES.METER_SQUARE;
          } else if ((values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK]) &&
            (item.name === WORK_ITEM_NAMES.JOURNEY || item.name === WORK_ITEM_NAMES.COMMUTE || item.name === 'Cesta')) {
            unit = UNIT_TYPES.KM;
            const distance = parseFloat(values[WORK_ITEM_NAMES.DISTANCE_EN] || values[WORK_ITEM_NAMES.DISTANCE_SK] || 0);
            const days = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
            quantity = distance * (days > 0 ? days : 1);
          } else if (values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK]) {
            unit = UNIT_TYPES.HOUR;
            quantity = parseFloat(values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
          } else if (!unit) {
            // Default to m² for area-based items
            unit = UNIT_TYPES.METER_SQUARE;
          }
        }

        const pricePerUnit = quantity > 0 ? othersCost / quantity : 0;
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = othersCost * itemVatRate;

        // For scaffolding items, subtitle contains the full name (e.g., "Lešenie - montáž a demontáž")
        // so we should use subtitle directly instead of combining name + subtitle
        let displayName;
        if (item.subtitle && (item.subtitle.includes('montáž a demontáž') || item.subtitle.includes('prenájom') ||
          item.subtitle.includes('assembly and disassembly') || item.subtitle.includes('rental'))) {
          displayName = t(item.subtitle);
        } else if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
          // For custom work, use the user-entered name or specific fallback based on selectedType
          const fallbackName = item.selectedType === 'Material' ? 'Custom material' : 'Custom work';
          displayName = item.fields?.[WORK_ITEM_NAMES.NAME] || t(fallbackName);
        } else {
          displayName = item.subtitle ? `${t(item.name)} - ${t(item.subtitle)}` : t(item.name);
        }

        // Format quantity with unit
        const translatedUnit = t(unit);
        const formattedQuantity = (unit === UNIT_TYPES.DAY || unit === UNIT_TYPES.DAYS)
          ? `${Math.round(quantity)} ${translatedUnit}`
          : `${formatSmartDecimal(quantity, 2)}${translatedUnit}`;

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(formattedQuantity),
          sanitizeText(formatCurrency(pricePerUnit)),
          sanitizeText(`${Math.round(itemVatRate * 100)} %`),
          sanitizeText(formatCurrency(vatAmount)),
          sanitizeText(formatCurrency(othersCost))
        ]);
      });
    }

    // Render the items table - only 2 thick black lines (under header and at bottom)
    autoTable(doc, {
      startY: tableStartY,
      head: [[
        sanitizeText(t('Description')),
        sanitizeText(t('Quantity')),
        sanitizeText(t('Price per Unit')),
        sanitizeText(t('VAT (%)')),
        sanitizeText(t('VAT')),
        sanitizeText(t('Price'))
      ]],
      body: tableData,
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: 1.2, font: 'Inter', fontSize: 9.2 },
      styles: { fontSize: 9, cellPadding: 1.2, lineColor: [255, 255, 255], lineWidth: 0, font: 'Inter' },
      tableWidth: 185.3,
      margin: { left: 12.35, right: 12.35 },
      tableLineColor: [255, 255, 255],
      tableLineWidth: 0,
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 32, halign: 'right' }
      },
      didParseCell: (data) => {
        // Force header alignment to match body columns
        if (data.section === 'head') {
          const alignments = ['left', 'center', 'right', 'center', 'right', 'right'];
          data.cell.styles.halign = alignments[data.column.index];
        }
      },
      didDrawPage: (data) => {
        // Draw black line under header (~1px)
        const headerBottom = data.table.head[0].cells[0].y + data.table.head[0].cells[0].height;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.35); // ~1px thick
        doc.line(12.35, headerBottom, 197.65, headerBottom);
      }
    });

    const finalY = doc.lastAutoTable.finalY || tableStartY + 20;

    // Draw black line at the bottom of table
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35); // ~1px thick
    doc.line(12.35, finalY, 197.65, finalY);

    // === TOTALS SECTION - Right aligned, with gap from table ===
    const rightX = 197.65;
    const totalsLabelX = rightX - 95; // Wider label area to prevent collision with numbers
    let totalY = finalY + 8; // Gap from table
    const rowSpacing = 5; // Reduced from 8 for closer spacing

    doc.setFontSize(12.8);
    doc.setFont('Inter', 'normal');
    // Restore keys with colons to match translation files, but value will be colon-free
    doc.text(sanitizeText(t('Without VAT:')), totalsLabelX, totalY);
    // Values are now normal font, not bold
    doc.text(sanitizeText(formatCurrency(totalWithoutVAT)), rightX, totalY, { align: 'right' });

    totalY += rowSpacing;
    // doc.setFont('Inter', 'normal'); // Already normal
    doc.text(sanitizeText(t('VAT:')), totalsLabelX, totalY);
    // Values are now normal font, not bold
    doc.text(sanitizeText(formatCurrency(vat)), rightX, totalY, { align: 'right' });

    totalY += rowSpacing;
    doc.setFontSize(15.3);
    doc.setFont('Inter', 'bold');
    doc.text(sanitizeText(t('Total price:')), totalsLabelX, totalY);
    doc.text(sanitizeText(formatCurrency(totalWithVAT)), rightX, totalY, { align: 'right' });

    // === QR CODE SECTION - Left side, below table (only for invoices, not price offers) ===
    if (!isPriceOffer) {
      const bankAccount = contractor?.bank_account_number || contractor?.bankAccount;
      const swiftCode = contractor?.swift_code || contractor?.bankCode;

      if (bankAccount) {
        try {
          const qrCodeDataUrl = await generatePaymentQRCode(
            bankAccount,
            swiftCode,
            totalWithVAT,
            invoice.invoiceNumber,
            contractor?.name
          );

          if (qrCodeDataUrl) {
            const qrSize = 40;
            const qrX = 12.35;
            const qrY = finalY + 8;

            doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

            // Add label below QR code
            doc.setFontSize(8);
            doc.setFont('Inter', 'normal');
            doc.text(sanitizeText(t('Scan to pay')), qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });
          }
        } catch (e) {
          console.warn('Failed to add QR code to PDF:', e);
        }
      }
    }

    // === SIGNATURE SECTION ===
    const signatureY = totalY + 15;
    doc.setFontSize(9); // Reduced to 9
    doc.setFont('Inter', 'normal');
    doc.text(sanitizeText(t('Issued by:')), rightX - 50, signatureY);

    if (contractor?.signature) {
      try {
        let format = 'PNG';
        if (typeof contractor.signature === 'string' && contractor.signature.startsWith('data:image/')) {
          if (contractor.signature.includes('jpeg') || contractor.signature.includes('jpg')) format = 'JPEG';
          else if (contractor.signature.includes('png')) format = 'PNG';
        }

        // Use jsPDF's getImageProperties to get dimensions and preserve aspect ratio
        const sigProps = doc.getImageProperties(contractor.signature);
        let sigWidth = 40;
        let sigHeight = 20;

        if (sigProps.width && sigProps.height) {
          const aspectRatio = sigProps.width / sigProps.height;
          // Fit within 40x20 box
          if (aspectRatio > 2) { // Wider than 2:1
            sigWidth = 40;
            sigHeight = 40 / aspectRatio;
          } else { // Taller or narrower than 2:1
            sigHeight = 20;
            sigWidth = 20 * aspectRatio;
          }
        }

        // Center in the box
        const boxX = rightX - 55;
        const boxY = signatureY + 5;
        const centeredX = boxX + (55 - sigWidth) / 2;
        const centeredY = boxY + (30 - sigHeight) / 2;

        doc.addImage(contractor.signature, format, centeredX, centeredY, sigWidth, sigHeight);
      } catch (e) {
        console.warn('Failed to add signature to PDF:', e);
        doc.setLineWidth(0.3);
        doc.line(rightX - 55, signatureY + 25, rightX, signatureY + 25);
      }
    } else {
      doc.setLineWidth(0.3);
      doc.line(rightX - 55, signatureY + 25, rightX, signatureY + 25);
    }

    // Calculate the bottom of the content (signature section bottom)
    const signatureBottomY = signatureY + 23; // signature image ends at signatureY + 3 + 20

    // === FOOTER SECTION - Contractor info ===
    // Check if content would collide with footer - footer starts at Y=252
    // If signature bottom is too close to footer, move entire footer to a new page
    const footerStartY = 252;
    const needsNewPage = signatureBottomY > (footerStartY - 10); // 10px safety margin

    if (needsNewPage) {
      doc.addPage();
    }

    // === INVOICE NOTES - Centered above footer icons ===
    // Notes go above the footer on the same page as the footer
    if (invoice.notes) {
      doc.setFontSize(10);
      doc.setFont('Inter', 'normal');
      const notesText = doc.splitTextToSize(sanitizeText(invoice.notes), 160);
      doc.text(notesText, 105, 240, { align: 'center' });
    }

    // Top row ABOVE divider: Name | Phone | Web | Email (equally spaced with icons)
    // Footer is always at the bottom of the page (same Y positions), just on a new page if needed
    const topRowY = 252;


    // Helper function to draw simple icons using only supported jsPDF methods
    const drawIcon = (type, x, y, size = 3) => {
      doc.setDrawColor(0, 0, 0); // Pitch black
      doc.setFillColor(0, 0, 0); // Pitch black
      doc.setLineWidth(0.2);

      if (type === 'user') {
        if (userIconData) {
          doc.addImage(userIconData, 'PNG', x, y - size * 0.8, size, size);
        } else {
          // Fallback if image fails to load
          doc.circle(x + size / 2, y - size * 0.65, size / 4, 'F');
          doc.circle(x + size / 2, y - size * 0.1, size / 3, 'F');
        }
      } else if (type === 'phone') {
        if (phoneIconData) {
          doc.addImage(phoneIconData, 'PNG', x, y - size * 0.8, size, size);
        } else {
          // Fallback (simple rounded rect)
          doc.roundedRect(x + size * 0.2, y - size * 0.9, size * 0.6, size * 0.9, 0.5, 0.5, 'F');
        }
      } else if (type === 'web') {
        // Simple globe icon - circle with cross lines (remains Stroked but black)
        doc.setLineWidth(0.2);
        doc.circle(x + size / 2, y - size / 2, size / 2, 'S');
        doc.line(x, y - size / 2, x + size, y - size / 2);
        doc.line(x + size / 2, y - size, x + size / 2, y);
        // Optional: add inner ellipses for meridians
        doc.ellipse(x + size / 2, y - size / 2, size / 4, size / 2, 'S');
      } else if (type === 'email') {
        if (mailIconData) {
          doc.addImage(mailIconData, 'PNG', x, y - size * 0.8, size, size);
        } else {
          // Fallback
          doc.rect(x, y - size * 0.7, size, size * 0.7, 'F');
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.3);
          doc.line(x, y - size * 0.7, x + size / 2, y - size * 0.35);
          doc.line(x + size, y - size * 0.7, x + size / 2, y - size * 0.35);
          doc.setDrawColor(0, 0, 0);
        }
      }
    };

    // Calculate positions spread from left to right edge
    const totalUsableWidth = 185.3; // 197.65 - 12.35
    const colWidth = totalUsableWidth / 3; // totalUsableWidth / (nCount - 1)
    const col1 = 12.35;
    const col2 = 12.35 + colWidth;
    const col3 = 12.35 + colWidth * 2;
    const col4 = 197.65; // Flush to right edge
    const iconOffset = 5;
    const textMaxWidth = colWidth - iconOffset - 2;
    const iconLineHeight = 2.5;

    doc.setFontSize(7);

    // Helper to draw wrapped text for footer icons
    const drawWrappedIconText = (text, x, y, maxWidth, bold = false, align = 'left') => {
      if (!text) return 0;
      doc.setFont('Inter', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(sanitizeText(text), maxWidth);

      const adjustment = (lines.length - 1) * iconLineHeight / 2;
      const startY = y - adjustment;

      lines.forEach((line, i) => {
        doc.text(line, x, startY + (i * iconLineHeight), { align: align });
      });
      return lines.length;
    };

    // Column 1: Contact Person (left edge)
    const contactPerson = contractor?.contactPerson || contractor?.contact_person_name || '';
    if (contactPerson) {
      drawIcon('user', col1, topRowY, 3);
      drawWrappedIconText(contactPerson, col1 + iconOffset, topRowY, textMaxWidth, false);
    }

    // Column 2: Phone
    if (contractor?.phone) {
      drawIcon('phone', col2, topRowY, 3);
      drawWrappedIconText(contractor.phone, col2 + iconOffset, topRowY, textMaxWidth);
    }

    // Column 3: Web
    if (contractor?.website) {
      drawIcon('web', col3, topRowY, 3);
      drawWrappedIconText(contractor.website, col3 + iconOffset, topRowY, textMaxWidth);
    }

    // Column 4: Email (right edge - right aligned for flush look)
    if (contractor?.email) {
      const emailIconSize = 3;
      // Calculate text width to position icon correctly to the left of the text
      // Since it's right aligned, we need: RightEdge(col4) - TextWidth - IconPadding - IconWidth
      const emailText = sanitizeText(contractor.email);
      doc.setFont('Inter', 'normal');
      // If text wraps, getting accurate width is harder, but for email it usually fits.
      // Use splitTextToSize to check if it wraps.
      const lines = doc.splitTextToSize(emailText, textMaxWidth);
      // Use the width of the longest line (or just the first/only line)
      let maxLineWidth = 0;
      lines.forEach(line => {
        const w = doc.getTextWidth(line);
        if (w > maxLineWidth) maxLineWidth = w;
      });

      const iconX = col4 - maxLineWidth - emailIconSize - 2; // 2mm padding between icon and text

      drawIcon('email', iconX, topRowY, emailIconSize);
      drawWrappedIconText(contractor.email, col4, topRowY, textMaxWidth, false, 'right');
    }

    // Divider line - equal spacing above and below
    const dividerY = 256;
    doc.setDrawColor(0, 0, 0); // Ensure black color
    doc.setLineWidth(0.5);
    doc.line(12.35, dividerY, 197.65, dividerY);

    // Three columns BELOW divider
    const col1X = 12.35;      // Left column - Address
    const col2X = 80;      // Middle column - Business IDs
    const col3X = 145;     // Right column - Bank info
    let colY = dividerY + 5;

    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');

    // Collect all column data first to calculate heights
    const contractorStreet = contractor?.street;
    const contractorAdditional = contractor?.second_row_street || contractor?.additionalInfo;
    const contractorCity = contractor?.city;
    const contractorPostal = contractor?.postal_code || contractor?.postalCode;
    const contractorCountry = contractor?.country;
    const contractorBusinessId = contractor?.business_id || contractor?.businessId;
    const contractorTaxId = contractor?.tax_id || contractor?.taxId;
    const contractorVatId = contractor?.vat_registration_number || contractor?.vatNumber;
    const legalNotice = contractor?.legal_notice || contractor?.legalAppendix;
    const bankAccount = contractor?.bank_account_number || contractor?.bankAccount;
    const swiftCode = contractor?.swift_code || contractor?.bankCode;

    // Build column 1 lines (Address)
    const col1Lines = [];
    if (contractor?.name) col1Lines.push({ text: contractor.name, bold: false });
    if (contractorStreet) col1Lines.push({ text: contractorStreet });
    if (contractorAdditional) col1Lines.push({ text: contractorAdditional });
    const cityLine = [contractorPostal, contractorCity].filter(Boolean).join(' ');
    if (cityLine) col1Lines.push({ text: cityLine });
    if (contractorCountry) col1Lines.push({ text: contractorCountry });

    // Build column 2 lines (Business IDs)
    const col2Lines = [];
    if (contractorBusinessId) col2Lines.push({ text: `IČO: ${contractorBusinessId}` });
    if (contractorTaxId) col2Lines.push({ text: `DIČ: ${contractorTaxId}` });
    if (contractorVatId) col2Lines.push({ text: `IČ DPH: ${contractorVatId}` });

    // Build column 3 lines (Bank info)
    const col3Lines = [];
    if (legalNotice) col3Lines.push({ text: `${t('Legal File Ref')}: ${legalNotice}` });
    if (bankAccount) col3Lines.push({ text: `${t('Bank Account / IBAN')}: ${bankAccount}` });
    if (swiftCode) col3Lines.push({ text: `${t('SWIFT code')}: ${swiftCode}` });

    // Calculate max lines and bottom Y position
    const footerLineHeight = 4.5;
    const maxLines = Math.max(col1Lines.length, col2Lines.length, col3Lines.length);
    const bottomY = colY + (maxLines * footerLineHeight);

    // Draw column 1 (bottom-aligned)
    const col1StartY = bottomY - (col1Lines.length * footerLineHeight);
    col1Lines.forEach((line, i) => {
      if (line.bold) {
        doc.setFont('Inter', 'bold');
      } else {
        doc.setFont('Inter', 'normal');
      }
      doc.text(sanitizeText(line.text), col1X, col1StartY + (i * footerLineHeight));
    });
    doc.setFont('Inter', 'normal');

    // Draw column 2 (bottom-aligned)
    const col2StartY = bottomY - (col2Lines.length * footerLineHeight);
    col2Lines.forEach((line, i) => {
      doc.text(sanitizeText(line.text), col2X, col2StartY + (i * footerLineHeight));
    });

    // Draw column 3 (bottom-aligned)
    const col3StartY = bottomY - (col3Lines.length * footerLineHeight);
    col3Lines.forEach((line, i) => {
      doc.text(sanitizeText(line.text), col3X, col3StartY + (i * footerLineHeight));
    });

    // App attribution - bottom center
    doc.setFontSize(8);
    doc.text(sanitizeText(t('Generated by Fido Building Calcul app.')), 105, 290, { align: 'center' });

    // Generate PDF blob and URL
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Return both doc and blobUrl for flexible usage
    return { doc, blobUrl, pdfBlob };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generatePriceOfferPDF = (params, t) => {
  return generateInvoicePDF({
    ...params,
    t, // Pass t here
    options: {
      isPriceOffer: true,
      projectNotes: params.projectNotes || '',
      projectNumber: params.projectNumber,
      offerValidityPeriod: params.offerValidityPeriod,
      priceList: params.priceList
    }
  });
};

/**
 * Generate Cash Receipt PDF (Príjmový doklad)
 * Matches iOS InvoicePDFCreator.renderCashReceipt()
 * Simpler document for cash payments - proof of payment received
 */
export const generateCashReceiptPDF = async ({
  invoice,
  contractor,
  client,
  totalWithVAT,
  formatDate,
  formatPrice,
  t
}) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Register custom fonts
    doc.addFileToVFS('Inter-Regular.ttf', InterRegular);
    doc.addFileToVFS('Inter-Bold.ttf', InterBold);
    doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
    doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
    doc.setFont('Inter', 'normal');

    // Helper to sanitize text
    const sanitizeText = (text) => {
      if (!text) return '';
      // Remove control characters (C0: 0x00-0x1F, C1: 0x7F-0x9F)
      // eslint-disable-next-line no-control-regex
      return String(text).replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    };

    // Helper to format currency
    const formatCurrency = (amount) => {
      if (formatPrice) return formatPrice(amount);
      return new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(amount || 0);
    };

    const pageWidth = 210;
    const margin = 12.35; // 35pt equivalent
    const contentWidth = pageWidth - (margin * 2);
    let currentY = 25;

    // === TITLE ===
    doc.setFontSize(25);
    doc.setFont('Inter', 'bold');
    const title = `${t('Cash Receipt')} ${invoice.invoiceNumber}`;
    doc.text(sanitizeText(title), margin, currentY);
    currentY += 15;

    // === THREE INFO BOXES ===
    const boxWidth = contentWidth / 3 - 3;
    const boxHeight = 18;
    const boxY = currentY;


    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.setFontSize(10);

    // Box 1: Purpose
    const box1X = margin;
    doc.roundedRect(box1X, boxY, boxWidth, boxHeight, 5, 5); // Larger border radius
    doc.setFont('Inter', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8); // reduced from 10
    doc.text(sanitizeText(t('Purpose')), box1X + 4, boxY + 5); // closer to top
    doc.setFont('Inter', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9); // reduced from 11
    const purposeText = `${t('Payment for Invoice')} ${invoice.invoiceNumber}`;
    const purposeLines = doc.splitTextToSize(sanitizeText(purposeText), boxWidth - 8);
    doc.text(purposeLines, box1X + 4, boxY + 10); // closer to label

    // Box 2: Date of Issue
    const box2X = margin + boxWidth + 4;
    doc.roundedRect(box2X, boxY, boxWidth, boxHeight, 5, 5);
    doc.setFont('Inter', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(sanitizeText(t('Date of Issue')), box2X + 4, boxY + 5);
    doc.setFont('Inter', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10); // reduced from 12
    doc.text(sanitizeText(formatDate(invoice.issueDate)), box2X + 4, boxY + 10);

    // Box 3: Total Price
    const box3X = margin + (boxWidth + 4) * 2;
    doc.roundedRect(box3X, boxY, boxWidth, boxHeight, 5, 5);
    doc.setFont('Inter', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(sanitizeText(t('Total price')), box3X + 4, boxY + 5);
    doc.setFont('Inter', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11); // reduced from 14
    doc.text(sanitizeText(formatCurrency(totalWithVAT)), box3X + 4, boxY + 11);

    currentY = boxY + boxHeight + 15;

    // === TWO COLUMN LAYOUT: Customer (left) | Made by + Signature (right) ===
    const leftColX = margin;
    const rightColX = margin + contentWidth / 2 + 10;
    const rightColWidth = contentWidth / 2 - 10;

    // LEFT COLUMN: Customer info
    doc.setFontSize(14);
    doc.setFont('Inter', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(sanitizeText(t('Customer')), leftColX, currentY);
    currentY += 6;

    doc.setFontSize(12);
    doc.setFont('Inter', 'normal');
    let clientY = currentY;

    if (client) {
      if (client.name) {
        doc.setFont('Inter', 'bold');
        doc.text(sanitizeText(client.name), leftColX, clientY);
        doc.setFont('Inter', 'normal');
        clientY += 4;
      }
      const street = client.street || client.address;
      if (street) {
        doc.text(sanitizeText(street), leftColX, clientY);
        clientY += 4;
      }
      const secondRow = client.second_row_street || client.secondRowStreet;
      if (secondRow) {
        doc.text(sanitizeText(secondRow), leftColX, clientY);
        clientY += 4;
      }
      const postal = client.postal_code || client.postalCode;
      const city = client.city;
      if (postal || city) {
        doc.text(sanitizeText([postal, city].filter(Boolean).join(' ')), leftColX, clientY);
        clientY += 4;
      }
      const country = client.country;
      if (country) {
        doc.text(sanitizeText(country), leftColX, clientY);
        clientY += 4;
      }
      // Business IDs
      clientY += 2;
      const businessId = client.business_id || client.businessId;
      const taxId = client.tax_id || client.taxId;
      const vatId = client.vat_registration_number || client.vatId || client.vatNumber;
      if (businessId) {
        doc.text(sanitizeText(`IČO: ${businessId}`), leftColX, clientY);
        clientY += 4;
      }
      if (taxId) {
        doc.text(sanitizeText(`DIČ: ${taxId}`), leftColX, clientY);
        clientY += 4;
      }
      if (vatId) {
        doc.text(sanitizeText(`IČ DPH: ${vatId}`), leftColX, clientY);
        clientY += 4;
      }
    } else {
      doc.text('-', leftColX, clientY);
    }

    // RIGHT COLUMN: Made by + Total + Signature
    let rightY = currentY;

    // Made by
    if (contractor?.name) {
      doc.setFontSize(12);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(t('Made by')), rightColX, rightY);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(contractor.name), rightColX + rightColWidth, rightY, { align: 'right' });
      rightY += 8;
    }

    // Divider line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(rightColX, rightY, rightColX + rightColWidth, rightY);
    rightY += 8;

    // Total prices summary
    doc.setFontSize(13);
    doc.setFont('Inter', 'normal');

    // Calculate VAT (assuming 23%)
    const vatRate = 0.23;
    const totalWithoutVAT = totalWithVAT / (1 + vatRate);
    const vatAmount = totalWithVAT - totalWithoutVAT;

    doc.text(sanitizeText(t('without VAT')), rightColX, rightY);
    doc.text(sanitizeText(formatCurrency(totalWithoutVAT)), rightColX + rightColWidth, rightY, { align: 'right' });
    rightY += 5;

    doc.text(sanitizeText(t('VAT (23%)')), rightColX, rightY);
    doc.text(sanitizeText(formatCurrency(vatAmount)), rightColX + rightColWidth, rightY, { align: 'right' });
    rightY += 5;

    doc.setFont('Inter', 'bold');
    doc.setFontSize(16);
    doc.text(sanitizeText(t('Total price:')), rightColX, rightY);
    doc.text(sanitizeText(formatCurrency(totalWithVAT)), rightColX + rightColWidth, rightY, { align: 'right' });
    rightY += 12;

    doc.setFontSize(9); // Reduced to 9
    doc.setFont('Inter', 'normal');
    doc.text(sanitizeText(t('Issued by:')), rightColX, rightY);
    rightY += 3;

    if (contractor?.signature) {
      try {
        let format = 'PNG';
        if (typeof contractor.signature === 'string' && contractor.signature.startsWith('data:image/')) {
          if (contractor.signature.includes('jpeg') || contractor.signature.includes('jpg')) format = 'JPEG';
        }
        doc.addImage(contractor.signature, format, rightColX, rightY, 55, 30);
        rightY += 35;
      } catch (e) {
        console.warn('Failed to add signature:', e);
        doc.line(rightColX, rightY + 15, rightColX + 40, rightY + 15);
        rightY += 20;
      }
    } else {
      doc.line(rightColX, rightY + 15, rightColX + 40, rightY + 15);
      rightY += 20;
    }

    const topRowY = 252;
    const startX = 12.35;

    // Helper function to draw simple icons using only supported jsPDF methods
    const drawIcon = (type, x, y, size = 3) => {
      doc.setDrawColor(80, 80, 80);
      doc.setFillColor(80, 80, 80);
      doc.setLineWidth(0.2);

      if (type === 'user') {
        // Simple user icon - circle head + shoulders (two circles)
        doc.circle(x + size / 2, y - size * 0.6, size / 4, 'S');
        doc.circle(x + size / 2, y - size * 0.1, size / 3, 'S');
      } else if (type === 'phone') {
        // Simple phone icon - rectangle
        doc.roundedRect(x, y - size, size * 0.6, size, 0.3, 0.3, 'S');
      } else if (type === 'web') {
        // Simple globe icon - circle with cross lines
        doc.circle(x + size / 2, y - size / 2, size / 2, 'S');
        doc.line(x, y - size / 2, x + size, y - size / 2);
        doc.line(x + size / 2, y - size, x + size / 2, y);
      } else if (type === 'email') {
        // Simple envelope icon - rectangle with V
        doc.rect(x, y - size * 0.7, size, size * 0.7, 'S');
        doc.line(x, y - size * 0.7, x + size / 2, y - size * 0.3);
        doc.line(x + size, y - size * 0.7, x + size / 2, y - size * 0.3);
      }
    };

    // Calculate positions for 4 columns spread from left to right edge
    const colWidth = (185.3 - 0) / 3; // totalUsableWidth / (nCount - 1)
    const col1 = startX;
    const col2 = startX + colWidth;
    const col3 = startX + colWidth * 2;
    const col4 = 197.65; // Flush to right edge
    const iconOffset = 6;
    const textMaxWidth = colWidth - iconOffset - 3;
    const iconLineHeight = 3.5;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Helper to draw wrapped text for footer icons
    const drawWrappedIconText = (text, x, y, maxWidth, bold = false) => {
      if (!text) return 0;
      doc.setFont('Inter', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(sanitizeText(text), maxWidth);

      // Vertical centering adjustment
      const adjustment = (lines.length - 1) * iconLineHeight / 2;
      const startY = y - adjustment;

      lines.forEach((line, i) => {
        doc.text(line, x, startY + (i * iconLineHeight));
      });
      return lines.length;
    };

    // Column 1: Contact Person with user icon
    const contactPerson = contractor?.contactPerson || contractor?.contact_person_name || '';
    if (contactPerson) {
      drawIcon('user', col1, topRowY, 3);
      drawWrappedIconText(contactPerson, col1 + iconOffset, topRowY, textMaxWidth, false);
    }

    // Column 2: Phone with phone icon
    doc.setFont('Inter', 'normal');
    if (contractor?.phone) {
      drawIcon('phone', col2, topRowY, 3);
      drawWrappedIconText(contractor.phone, col2 + iconOffset, topRowY, textMaxWidth);
    }

    // Column 3: Web with globe icon
    if (contractor?.website) {
      drawIcon('web', col3, topRowY, 3);
      drawWrappedIconText(contractor.website, col3 + iconOffset, topRowY, textMaxWidth);
    }

    // Column 4: Email with envelope icon
    if (contractor?.email) {
      drawIcon('email', col4, topRowY, 3);
      drawWrappedIconText(contractor.email, col4 + iconOffset, topRowY, textMaxWidth);
    }

    // Divider line - equal spacing above and below
    const dividerY = 256;
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(12.35, dividerY, 197.65, dividerY);

    // Three columns BELOW divider
    const col1X = 12.35;      // Left column - Address
    const col2X = 80;      // Middle column - Business IDs
    const col3X = 145;     // Right column - Bank info
    let colY = dividerY + 5;

    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');

    // Collect all column data first to calculate heights
    const contractorStreet = contractor?.street;
    const contractorAdditional = contractor?.second_row_street || contractor?.additionalInfo;
    const contractorCity = contractor?.city;
    const contractorPostal = contractor?.postal_code || contractor?.postalCode;
    const contractorCountry = contractor?.country;
    const contractorBusinessId = contractor?.business_id || contractor?.businessId;
    const contractorTaxId = contractor?.tax_id || contractor?.taxId;
    const contractorVatId = contractor?.vat_registration_number || contractor?.vatNumber;
    const legalNotice = contractor?.legal_notice || contractor?.legalAppendix;
    const bankAccount = contractor?.bank_account_number || contractor?.bankAccount;
    const swiftCode = contractor?.swift_code || contractor?.bankCode;

    // Build column 1 lines (Address)
    const footerCol1Lines = [];
    if (contractor?.name) footerCol1Lines.push({ text: contractor.name, bold: false });
    if (contractorStreet) footerCol1Lines.push({ text: contractorStreet });
    if (contractorAdditional) footerCol1Lines.push({ text: contractorAdditional });
    const cityLine = [contractorPostal, contractorCity].filter(Boolean).join(' ');
    if (cityLine) footerCol1Lines.push({ text: cityLine });
    if (contractorCountry) footerCol1Lines.push({ text: contractorCountry });

    // Build column 2 lines (Business IDs)
    const footerCol2Lines = [];
    if (contractorBusinessId) footerCol2Lines.push({ text: `IČO: ${contractorBusinessId}` });
    if (contractorTaxId) footerCol2Lines.push({ text: `DIČ: ${contractorTaxId}` });
    if (contractorVatId) footerCol2Lines.push({ text: `IČ DPH: ${contractorVatId}` });

    // Build column 3 lines (Bank info)
    const footerCol3Lines = [];
    if (legalNotice) footerCol3Lines.push({ text: `${t('Legal File Ref')}: ${legalNotice}` });
    if (bankAccount) footerCol3Lines.push({ text: `${t('Bank Account / IBAN')}: ${bankAccount}` });
    if (swiftCode) footerCol3Lines.push({ text: `${t('SWIFT code')}: ${swiftCode}` });

    // Calculate max lines and bottom Y position
    const footerLineHeight = 4.5;
    const maxLines = Math.max(footerCol1Lines.length, footerCol2Lines.length, footerCol3Lines.length);
    const bottomY = colY + (maxLines * footerLineHeight);

    // Draw column 1 (bottom-aligned)
    const col1StartY = bottomY - (footerCol1Lines.length * footerLineHeight);
    footerCol1Lines.forEach((line, i) => {
      if (line.bold) {
        doc.setFont('Inter', 'bold');
      } else {
        doc.setFont('Inter', 'normal');
      }
      doc.text(sanitizeText(line.text), col1X, col1StartY + (i * footerLineHeight));
    });
    doc.setFont('Inter', 'normal');

    // Draw column 2 (bottom-aligned)
    const col2StartY = bottomY - (footerCol2Lines.length * footerLineHeight);
    footerCol2Lines.forEach((line, i) => {
      doc.text(sanitizeText(line.text), col2X, col2StartY + (i * footerLineHeight));
    });

    // Draw column 3 (bottom-aligned)
    const col3StartY = bottomY - (footerCol3Lines.length * footerLineHeight);
    footerCol3Lines.forEach((line, i) => {
      doc.text(sanitizeText(line.text), col3X, col3StartY + (i * footerLineHeight));
    });

    // App attribution - bottom center
    doc.setFontSize(8);
    doc.text(sanitizeText(t('Generated by Fido Building Calcul app.')), 105, 290, { align: 'center' });

    // Generate PDF blob and URL
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    return { doc, blobUrl, pdfBlob };
  } catch (error) {
    console.error('Error generating cash receipt PDF:', error);
    throw error;
  }
};
