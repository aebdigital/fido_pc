import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { SFProRegular } from './fonts/SFProRegular';
import { SFProBold } from './fonts/SFProBold';
import { SFProSemibold } from './fonts/SFProSemibold';
import { SFProMedium } from './fonts/SFProMedium';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES, UNIT_TYPES } from '../config/constants';
import { unitToDisplaySymbol } from '../services/workItemsMapping';
import { sortItemsByMasterList } from './itemSorting';
import { translations } from '../translations/translations';

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

  // Check based on propertyId - use UNIT_TYPES constants (Slovak units)
  if (propertyId === WORK_ITEM_PROPERTY_IDS.PREPARATORY) return UNIT_TYPES.HOUR;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WIRING) return UNIT_TYPES.PIECE;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.PLUMBING) return UNIT_TYPES.PIECE;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.COMMUTE) return UNIT_TYPES.KM;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.CORNER_BEAD) return UNIT_TYPES.METER;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_SASH) return UNIT_TYPES.METER;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.SILICONING) return UNIT_TYPES.METER;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION) return UNIT_TYPES.PIECE;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.WINDOW_INSTALLATION) return UNIT_TYPES.METER;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.DOOR_JAMB_INSTALLATION) return UNIT_TYPES.PIECE;
  if (propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
    // Convert iOS unit values (e.g., "squareMeter") to display symbols (e.g., "m²")
    return unitToDisplaySymbol(item.selectedUnit) || UNIT_TYPES.METER_SQUARE;
  }

  // Check based on fields to determine unit
  if (fields[WORK_ITEM_NAMES.DURATION_EN] || fields[WORK_ITEM_NAMES.DURATION_SK]) return UNIT_TYPES.HOUR;
  if (fields[WORK_ITEM_NAMES.COUNT] || fields[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_EN] || fields[WORK_ITEM_NAMES.NUMBER_OF_OUTLETS_SK]) return UNIT_TYPES.PIECE;
  if (fields[WORK_ITEM_NAMES.LENGTH] && !fields[WORK_ITEM_NAMES.WIDTH] && !fields[WORK_ITEM_NAMES.HEIGHT]) return UNIT_TYPES.METER;
  if (fields[WORK_ITEM_NAMES.CIRCUMFERENCE]) return UNIT_TYPES.METER;

  // Default to m2 for area-based work
  return UNIT_TYPES.METER_SQUARE;
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
// Register SF Pro font with jsPDF
const registerSFProFont = (doc) => {
  doc.addFileToVFS('SFPro-Regular.ttf', SFProRegular);
  doc.addFont('SFPro-Regular.ttf', 'SF-Pro', 'normal');
  doc.addFileToVFS('SFPro-Bold.ttf', SFProBold);
  doc.addFont('SFPro-Bold.ttf', 'SF-Pro', 'bold');
  doc.addFileToVFS('SFPro-Semibold.ttf', SFProSemibold);
  doc.addFont('SFPro-Semibold.ttf', 'SF-Pro', 'semibold');
  doc.addFileToVFS('SFPro-Medium.ttf', SFProMedium);
  doc.addFont('SFPro-Medium.ttf', 'SF-Pro', 'medium');
  doc.setFont('SF-Pro');
};

// With custom font (Inter), we can now keep Slovak characters
const sanitizeText = (text) => {
  if (!text) return '';
  return String(text);
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
    doc._lastActiveCategoryKey = null; // Track current category for multi-page headers
    registerSFProFont(doc);

    // === HEADER SECTION ===

    // Logo - Top Right (preserve aspect ratio)
    const maxLogoSize = 35; // reduced from 45
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

        const logoX = 197.65 - logoWidth - 11; // Shifted 11mm from right edge
        const logoY = 12 + (maxLogoSize - logoHeight) / 2; // Moved down to 12mm from edge
        doc.addImage(contractor.logo, format, logoX, logoY, logoWidth, logoHeight);
      } catch (e) {
        console.warn('Failed to add logo to PDF:', e);
      }
    }

    // Invoice number / Price Offer title - left side
    doc.setFontSize(23.4); // Scaled down from iOS 25pt for A4
    doc.setFont('SF-Pro', 'semibold');

    if (isPriceOffer) {
      // New format: CP {CategoryPrefix} {number} - {name} as MAIN TITLE (same style as invoice)
      // Category prefix is the first letter of the translated category name (e.g. "F" for Flats, "H" for Houses)
      let categoryPrefix = '';
      if (options.projectCategory) {
        // Capitalize category key to match translation keys (e.g. 'flats' -> 'Flats')
        const categoryKey = options.projectCategory.charAt(0).toUpperCase() + options.projectCategory.slice(1).toLowerCase();

        // Use explicit language passed in options, or fallback to 'sk'
        const lang = options.language || 'sk';
        const translatedCategory = translations[lang]?.[categoryKey];

        if (translatedCategory && translatedCategory.length > 0) {
          categoryPrefix = translatedCategory.charAt(0).toUpperCase() + ' ';
        }
      }

      const title = `${t('Price Offer Abbr')} ${categoryPrefix}${projectNumber || ''} - ${invoice.projectName || ''}`;
      doc.setTextColor(0, 0, 0);
      doc.text(sanitizeText(title), 12.35, 20);

      // Project Notes - same style as invoice subtitle (fontSize 14, 4px below title, muted color)
      if (projectNotes) {
        doc.setFontSize(14);
        doc.setFont('SF-Pro', 'normal');
        doc.setTextColor(51, 51, 51); // matches iOS black.opacity(0.8)
        const splitNotes = doc.splitTextToSize(sanitizeText(projectNotes), 120);
        doc.text(splitNotes, 12.35, 26);
      }
    } else {
      doc.setTextColor(0, 0, 0);
      doc.text(sanitizeText(`${t('Invoice')} ${invoice.invoiceNumber}`), 12.35, 20);
      doc.setFontSize(13.1); // Scaled from iOS 14pt
      doc.setFont('SF-Pro', 'medium');
      doc.setTextColor(51, 51, 51); // matches iOS black.opacity(0.8)
      doc.text(sanitizeText(`${t('Price offer')} ${projectNumber || invoice.invoiceNumber}`), 12.35, 26.5);
    }
    doc.setTextColor(0, 0, 0); // reset to black

    // === CLIENT SECTION (Odberatel) - Left side under header ===
    let clientY = 48;

    // Odberatel heading - iOS uses 13pt bold
    doc.setFontSize(12.1); // Scaled from iOS 13pt
    doc.setFont('SF-Pro', 'bold');
    doc.text(sanitizeText(t('Subscriber')), 12.35, clientY);

    doc.setFontSize(9.3); // Scaled from iOS 10pt
    doc.setFont('SF-Pro', 'normal');
    clientY += 5.5; // Closer gap to the first line of content

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

    const lineHeight = 4.7;

    // --- Draw LEFT COLUMN: Address (TOP-aligned) ---
    let addressY = contentStartY;
    if (addressLines.length > 0) {
      addressLines.forEach(line => {
        doc.text(sanitizeText(line), 12.35, addressY);
        addressY += lineHeight;
      });
    } else if (!client) {
      doc.text(sanitizeText('-'), 12.35, addressY);
      addressY += lineHeight;
    }

    // --- Draw MIDDLE COLUMN: Business IDs (TOP-aligned) ---
    const businessX = 75;
    const businessId = client?.business_id || client?.businessId;
    const taxId = client?.tax_id || client?.taxId;
    const vatId = client?.vat_registration_number || client?.vatId || client?.vatNumber;

    let businessLines = [];
    if (businessId) businessLines.push(`${t('BID')}: ${businessId}`);
    if (taxId) businessLines.push(`${t('TID')}: ${taxId}`);
    if (vatId) businessLines.push(`${t('VAT ID')}: ${vatId}`);

    let businessY = contentStartY;
    businessLines.forEach(line => {
      doc.text(sanitizeText(line), businessX, businessY);
      businessY += lineHeight;
    });

    // Define addressBottomY for the next section (the maximum of the three columns)
    const addressBottomY = Math.max(addressY, businessY, contentStartY + (5 * lineHeight));

    // --- Draw RIGHT COLUMN: Dates (TOP-aligned) ---
    const rightBlockX = 197.65;
    const labelX = rightBlockX - 60;
    const dateLineHeight = 4.7; // tighter spacing for dates

    let dateLines = [];
    if (isPriceOffer) {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + parseInt(offerValidityPeriod || 30));
      dateLines = [
        { label: `${t('Date of issue')}:`, value: formatDate(today.toISOString()) },
        { label: `${t('Valid until')}:`, value: formatDate(validUntil.toISOString()) }
      ];
    } else {
      const paymentText = invoice.paymentMethod === 'cash' ? t('Cash') : t('Bank transfer');
      dateLines = [
        { label: `${t('Date of issue')}:`, value: formatDate(invoice.issueDate) },
        { label: `${t('Maturity date')}:`, value: formatDate(invoice.dueDate) },
        { isSeparator: true },
        { label: `${t('Variable Symbol')}:`, value: invoice.invoiceNumber },
        { label: `${t('Date of dispatch')}:`, value: formatDate(invoice.dispatchDate || invoice.issueDate) },
        { label: `${t('Payment type')}:`, value: paymentText }
      ];
    }

    const dateBlockHeight = (dateLines.length - 1) * dateLineHeight;
    let dateY = (addressBottomY - lineHeight) - dateBlockHeight;
    dateLines.forEach(line => {
      if (line.isSeparator) {
        dateY += dateLineHeight;
        return;
      }
      doc.text(sanitizeText(line.label), labelX, dateY);
      doc.text(sanitizeText(line.value), rightBlockX, dateY, { align: 'right' });
      dateY += dateLineHeight;
    });

    // Update clientY to the bottom of the section
    clientY = addressBottomY;

    // === FOUR INFO BOXES - Only for Invoice ===
    let tableStartY = clientY + 4;
    let boxY = 0;
    let boxHeight = 0;

    if (!isPriceOffer) {
      boxY = clientY + 1.5;
      const ibanBoxWidth = 58;
      const boxWidth = 38.5;
      boxHeight = 11; // reduced from 14 for a tighter look
      const boxStartX = 12.35;
      const gap = 3.6;
      const borderRadius = 3.5; // Reduced from 5 to match iOS style

      doc.setDrawColor(160, 160, 160); // Darker grey border
      doc.setLineWidth(0.3);

      // Get bank account for first box
      const contractorBankAccount = contractor?.bank_account_number || contractor?.bankAccount || '';

      // Box 1: Cislo uctu / IBAN (wider)
      doc.roundedRect(boxStartX, boxY, ibanBoxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(5.6); // Scaled from iOS 6pt
      doc.setFont('SF-Pro', 'normal');
      doc.setTextColor(51, 51, 51); // slightly muted label
      doc.text(sanitizeText(t('Bank Account / IBAN')), boxStartX + 2.8, boxY + 4.2);
      doc.setFontSize(8.4); // Scaled from iOS 9pt
      doc.setFont('SF-Pro', 'semibold'); // iOS uses semibold for values
      doc.setTextColor(0, 0, 0);
      // Truncate IBAN if too long
      const ibanDisplay = contractorBankAccount.length > 30 ? contractorBankAccount.substring(0, 30) + '...' : contractorBankAccount;
      doc.text(sanitizeText(ibanDisplay || '-'), boxStartX + 2.8, boxY + 8.2);

      // Box 2: Variabilny symbol
      const box2X = boxStartX + ibanBoxWidth + gap;
      doc.roundedRect(box2X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(5.6);
      doc.setFont('SF-Pro', 'normal');
      doc.setTextColor(51, 51, 51);
      doc.text(sanitizeText(t('Variable Symbol')), box2X + 2.8, boxY + 4.2);
      doc.setFontSize(8.4);
      doc.setFont('SF-Pro', 'semibold');
      doc.setTextColor(0, 0, 0);
      doc.text(sanitizeText(invoice.invoiceNumber), box2X + 2.8, boxY + 8.2);

      // Box 3: Datum splatnosti
      const box3X = box2X + boxWidth + gap;
      doc.roundedRect(box3X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(5.6);
      doc.setFont('SF-Pro', 'normal');
      doc.setTextColor(51, 51, 51);
      doc.text(sanitizeText(t('Maturity date')), box3X + 2.8, boxY + 4.2);
      doc.setFontSize(8.4);
      doc.setFont('SF-Pro', 'semibold');
      doc.setTextColor(0, 0, 0);
      doc.text(sanitizeText(formatDate(invoice.dueDate)), box3X + 2.8, boxY + 8.2);

      // Box 4: Suma na uhradu
      const box4X = box3X + boxWidth + gap;
      doc.roundedRect(box4X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(5.6);
      doc.setFont('SF-Pro', 'normal');
      doc.setTextColor(51, 51, 51);
      doc.text(sanitizeText(t('Amount Due')), box4X + 2.8, boxY + 4.2);
      doc.setFontSize(8.4);
      doc.setFont('SF-Pro', 'semibold');
      doc.setTextColor(0, 0, 0);
      doc.text(sanitizeText(formatCurrency(totalWithVAT)), box4X + 2.8, boxY + 8.2);

      tableStartY = boxY + boxHeight + 4;
    } else {
      // For Price Offer, start table closer to client section
      tableStartY = clientY + 4;
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
        {
          content: sanitizeText(t('Works')).charAt(0).toUpperCase() + sanitizeText(t('Works')).slice(1).toLowerCase(),
          colSpan: 6,
          styles: { fontStyle: 'normal', fontSize: 8, cellPadding: { top: 1.5, bottom: 0.1 } },
          isCategoryHeader: true,
          categoryKey: 'Works'
        }
      ]);

      // For Price Offers, sort items by master price list order
      // For Invoices, items are already sorted by InvoiceCreationModal
      const sortedItems = (isPriceOffer && options.priceList)
        ? sortItemsByMasterList(projectBreakdown.items, options.priceList, 'work')
        : projectBreakdown.items;

      sortedItems.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const workCost = item.calculation?.workCost || 0;
        const pricePerUnit = quantity > 0 ? workCost / quantity : 0;

        let unit = getWorkItemUnit(item);

        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = workCost * itemVatRate;

        // Get the work item name - try multiple sources
        // The stored name is the canonical English name (possibly compound like "Netting, wall")
        let rawName = item.name || getWorkItemNameByPropertyId(item.propertyId) || '';
        const itemName = rawName;
        let displayName;

        // For custom work, use the user-entered name (translate it in case it's a standard item
        // that was tagged as custom_work due to missing originalItem.propertyId)
        if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
          // Use specific fallback based on selectedType: 'Custom work' or 'Custom material'
          const fallbackName = item.selectedType === 'Material' ? 'Custom material' : 'Custom work';

          // Use user-entered name from fields, OR from item name if it's not generic
          const fieldName = item.fields?.[WORK_ITEM_NAMES.NAME];
          const isGenericName = !itemName ||
            itemName === 'Custom work' || itemName === 'Custom material' ||
            itemName === 'Vlastná práca' || itemName === 'Vlastný materiál' ||
            itemName === 'Custom work and material';

          // Apply t() to handle items incorrectly tagged as custom_work (e.g., from old invoice data)
          // For real custom work with user-entered names, t() returns the name as-is (no translation found)
          displayName = (fieldName ? t(fieldName) : null) || (!isGenericName ? t(itemName) : null) || t(fallbackName);
        } else if (item.propertyId === WORK_ITEM_PROPERTY_IDS.SANITY_INSTALLATION && (item.selectedType || item.subtitle)) {
          // For sanitary installation, translate the type name directly
          displayName = t(item.selectedType || item.subtitle);
        } else if (item.isLargeFormat) {
          // For Large Format, show base name + ", large format"
          const baseName = item.propertyId === WORK_ITEM_PROPERTY_IDS.TILING_UNDER_60 ? 'Tiling' : 'Paving';
          displayName = `${t(baseName)}, ${t(WORK_ITEM_NAMES.LARGE_FORMAT).toLowerCase()}`;
        } else if (item.propertyId === WORK_ITEM_PROPERTY_IDS.WIRING || item.propertyId === WORK_ITEM_PROPERTY_IDS.PLUMBING) {
          // Electrical/plumbing: show main name only in Price Offer, main name + subtitle in Invoice
          displayName = isPriceOffer ? t(itemName) : `${t(itemName)}\n${t(item.subtitle)}`;
        } else if (item.propertyId && item.propertyId.startsWith('plasterboarding_') && item.subtitle && !itemName.includes(item.subtitle)) {
          // Plasterboarding: use simple key with selectedType only (no subtitle)
          // This matches Invoice format: "Sádrokartón, jednoduchý" instead of "Sádrokartón, priečka, jednoduchá"
          const shouldShowType = item.selectedType && item.propertyId !== 'plasterboarding_ceiling';
          if (shouldShowType) {
            const compoundKey = `${itemName}, ${(item.selectedType || '').toLowerCase()}`;
            displayName = t(compoundKey);
          } else {
            displayName = t(itemName);
          }
        } else if ((item.propertyId === 'plinth_cutting' || item.propertyId === 'plinth_bonding') && item.subtitle && !itemName.includes(item.subtitle)) {
          // Raw plinth item: use " - " separator (not comma)
          const compoundKey = `${itemName} - ${item.subtitle}`;
          displayName = t(compoundKey);
        } else {
          // Generic: translate stored compound name or build compound key with comma separator
          if (item.subtitle && !itemName.includes(item.subtitle)) {
            // Use comma separator to match Invoice format (e.g., "Omietka, stena" not "Omietka\nstena")
            displayName = `${t(itemName)}, ${t(item.subtitle)}`;
          } else {
            displayName = t(itemName);
          }
        }

        // Post-process to match Invoice format exactly
        if (displayName) {
          // Remove thickness ranges from masonry items (e.g., ", 75 - 175mm", ", 200 - 450mm")
          displayName = displayName.replace(/, \d+ - \d+mm/g, '');
          // Remove "2 vrstvy" or "2 layers" from painting items
          displayName = displayName.replace(/, 2 vrstvy/g, '');
          displayName = displayName.replace(/, 2 layers/g, '');
          // Fix tiling capitalization/separator if it missed the logic above
          displayName = displayName.replace(/ (Veľkoformát|Large Format)/g, ', $1').replace(/, (Veľkoformát|Large Format)/g, (match) => match.toLowerCase());

          // Legacy fixes for specific hardcoded strings
          displayName = displayName.replace(/Dlažba, Veľkoformát/g, 'Dlažba, veľkoformát');
          displayName = displayName.replace(/Obklad, Veľkoformát/g, 'Obklad, veľkoformát');
          displayName = displayName.replace(/Paving, Large format/g, 'Paving, large format');
          displayName = displayName.replace(/Tiling, Large format/g, 'Tiling, large format');
        }

        tableData.push([
          { content: sanitizeText(displayName || ''), parentCategoryKey: 'Works' },
          { content: sanitizeText(`${formatSmartDecimal(quantity, 2)} ${t(unit)}`), parentCategoryKey: 'Works' },
          { content: sanitizeText(formatCurrency(pricePerUnit)), parentCategoryKey: 'Works' },
          { content: sanitizeText(`${Math.round(itemVatRate * 100)} %`), parentCategoryKey: 'Works' },
          { content: sanitizeText(formatCurrency(vatAmount)), parentCategoryKey: 'Works' },
          { content: sanitizeText(formatCurrency(workCost)), parentCategoryKey: 'Works' }
        ]);
      });
    }

    // Add material items with category header
    if (projectBreakdown && projectBreakdown.materialItems && projectBreakdown.materialItems.length > 0) {
      tableData.push([
        {
          content: sanitizeText(t('Materials')).charAt(0).toUpperCase() + sanitizeText(t('Materials')).slice(1).toLowerCase(),
          colSpan: 6,
          styles: { fontStyle: 'normal', fontSize: 8, cellPadding: { top: 0.4, bottom: 0.1 } },
          isCategoryHeader: true,
          categoryKey: 'Materials'
        }
      ]);

      // For Price Offers, sort material items by master price list order
      const sortedMaterialItems = (isPriceOffer && options.priceList)
        ? sortItemsByMasterList(projectBreakdown.materialItems || [], options.priceList, 'material')
        : (projectBreakdown.materialItems || []);

      sortedMaterialItems.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const materialCost = item.calculation?.materialCost || 0;
        const pricePerUnit = quantity > 0 ? materialCost / quantity : 0;
        let unit = item.calculation?.unit || item.unit || '';
        // Strip €/ prefix from unit if present (e.g. "€/m2" -> "m2")
        if (unit.startsWith('€/')) unit = unit.substring(2);
        // Convert iOS unit values to display symbols
        unit = unitToDisplaySymbol(unit);

        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = materialCost * itemVatRate;

        let displayName;
        if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
          // Use specific fallback based on selectedType: 'Custom work' or 'Custom material'
          const fallbackName = item.selectedType === 'Material' ? 'Custom material' : 'Custom work';

          // Use user-entered name from fields, OR from item name if it's not generic
          const fieldName = item.fields?.[WORK_ITEM_NAMES.NAME];
          const itemName = item.name;
          const isGenericName = !itemName ||
            itemName === 'Custom work' || itemName === 'Custom material' ||
            itemName === 'Vlastná práca' || itemName === 'Vlastný materiál' ||
            itemName === 'Custom work and material';

          // Apply t() to handle items incorrectly tagged as custom_work
          displayName = (fieldName ? t(fieldName) : null) || (!isGenericName ? t(itemName) : null) || t(fallbackName);
        } else {
          // Translate the item name. Handle both compound and simple names
          if (item.subtitle && !item.name?.includes(item.subtitle)) {
            // Raw project item: subtitle not part of the name, build compound key
            const compoundKey = `${item.name || ''}, ${item.subtitle}`;
            displayName = t(compoundKey);
          } else {
            displayName = t(item.name);
          }

          // Override for iOS parity: "Sádrokartón" -> "Kartón" in PDF/Invoice
          if (displayName && displayName.includes('Sádrokartón')) {
            displayName = displayName.replace('Sádrokartón', 'Kartón');
          }

          // Post-process to match Invoice format exactly
          if (displayName) {
            // Remove thickness ranges from masonry items
            displayName = displayName.replace(/, \d+ - \d+mm/g, '');
            // Fix tiling capitalization
            displayName = displayName.replace(/ (Veľkoformát|Large Format)/g, ', $1').replace(/, (Veľkoformát|Large Format)/g, (match) => match.toLowerCase());
            displayName = displayName.replace(/Dlažba, Veľkoformát/g, 'Dlažba, veľkoformát');
            displayName = displayName.replace(/Obklad, Veľkoformát/g, 'Obklad, veľkoformát');
          }

        }

        tableData.push([
          { content: sanitizeText(displayName || ''), parentCategoryKey: 'Materials' },
          { content: sanitizeText(`${formatSmartDecimal(quantity, 2)} ${t(unit)}`), parentCategoryKey: 'Materials' },
          { content: sanitizeText(formatCurrency(pricePerUnit)), parentCategoryKey: 'Materials' },
          { content: sanitizeText(`${Math.round(itemVatRate * 100)} %`), parentCategoryKey: 'Materials' },
          { content: sanitizeText(formatCurrency(vatAmount)), parentCategoryKey: 'Materials' },
          { content: sanitizeText(formatCurrency(materialCost)), parentCategoryKey: 'Materials' }
        ]);
      });
    }

    // Add others items with category header
    if (projectBreakdown && projectBreakdown.othersItems && projectBreakdown.othersItems.length > 0) {
      tableData.push([
        {
          content: sanitizeText(t('Others')).charAt(0).toUpperCase() + sanitizeText(t('Others')).slice(1).toLowerCase(),
          colSpan: 6,
          styles: { fontStyle: 'normal', fontSize: 8, cellPadding: { top: 0.4, bottom: 0.1 } },
          isCategoryHeader: true,
          categoryKey: 'Others'
        }
      ]);

      // Group scaffolding items by their type (assembly/rental)
      const othersGroups = {};
      const nonGroupedOthers = [];

      const checkText = (text) => {
        if (!text) return false;
        const lower = text.toLowerCase();
        // Exclude Tool Rental matched by 'rental' - those should stay non-grouped
        if (lower.includes('tool rental') || lower.includes('požičovňa') || lower.includes('pozicovn')) return false;
        return text.includes('assembly and disassembly') || text.includes('rental');
      };

      // For Price Offers, sort others items by master price list order
      const sortedOthersItems = (isPriceOffer && options.priceList)
        ? sortItemsByMasterList(projectBreakdown.othersItems, options.priceList, 'others')
        : projectBreakdown.othersItems;

      sortedOthersItems.forEach(item => {
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
          if (groupKey.includes('rental')) {
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

      // Sort groups: Rental first, then Assembly
      const sortedGroups = Object.values(othersGroups).sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aIsRental = aName.includes('rental');
        const bIsRental = bName.includes('rental');

        // Rental comes first
        if (aIsRental && !bIsRental) return -1;
        if (!aIsRental && bIsRental) return 1;
        return 0;
      });

      // Print grouped scaffolding items
      // Collate all Others items for sorting (Groups + NonGrouped)
      const allOthersRows = [];

      // Add grouped items
      sortedGroups.forEach(group => {
        const pricePerUnit = group.totalQuantity > 0 ? group.totalCost / group.totalQuantity : 0;
        const vatAmount = group.totalCost * group.vatRate;
        const translatedUnit = t(group.unit);
        const formattedQuantity = (group.unit === UNIT_TYPES.DAY || group.unit === UNIT_TYPES.DAYS)
          ? `${Math.round(group.totalQuantity)} ${translatedUnit}`
          : `${formatSmartDecimal(group.totalQuantity, 2)} ${translatedUnit}`;

        allOthersRows.push([
          { content: sanitizeText(t(group.name) || ''), parentCategoryKey: 'Others' },
          { content: sanitizeText(formattedQuantity), parentCategoryKey: 'Others' },
          { content: sanitizeText(formatCurrency(pricePerUnit)), parentCategoryKey: 'Others' },
          { content: sanitizeText(`${Math.round(group.vatRate * 100)} %`), parentCategoryKey: 'Others' },
          { content: sanitizeText(formatCurrency(vatAmount)), parentCategoryKey: 'Others' },
          { content: sanitizeText(formatCurrency(group.totalCost)), parentCategoryKey: 'Others' }
        ]);
      });

      // Add non-grouped items
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

        // Explicitly override unit for Tool Rental to Hours (User request) - priority over calculation
        const normalize = (str) => (str || '').toLowerCase();
        const itemName = normalize(item.name);
        const itemSubtitle = normalize(item.subtitle);

        if ((itemName.includes('tool rental') || itemName.includes('požičovň') || itemName.includes('pozicovn') ||
          itemSubtitle.includes('tool rental') || itemSubtitle.includes('požičovň') || itemSubtitle.includes('pozicovn'))) {
          // Force HOUR regardless of whether specific duration fields are found (User wants 'hod')
          unit = UNIT_TYPES.HOUR;

          // Try to find specific duration if available to override quantity, otherwise rely on existing quantity
          const duration = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || values[WORK_ITEM_NAMES.DURATION_EN] || values[WORK_ITEM_NAMES.DURATION_SK] || 0);
          if (duration > 0) {
            quantity = duration;
          }
        }

        // Determine unit and quantity based on item type (using existing logic)
        if (!item.calculation?.unit) {
          if (item.subtitle && item.subtitle.includes('- rental') && values[WORK_ITEM_NAMES.RENTAL_DURATION]) {
            quantity = parseFloat(values[WORK_ITEM_NAMES.RENTAL_DURATION] || 0);
            unit = quantity > 1 ? UNIT_TYPES.DAYS : UNIT_TYPES.DAY;
          } else if (item.subtitle && item.subtitle.includes('assembly and disassembly')) {
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
            unit = UNIT_TYPES.METER_SQUARE;
          }
        }

        const pricePerUnit = quantity > 0 ? othersCost / quantity : 0;
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = othersCost * itemVatRate;

        // Name resolution
        let displayName;
        if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK) {
          const fallbackName = item.selectedType === 'Material' ? 'Custom material' : 'Custom work';
          const fieldName = item.fields?.[WORK_ITEM_NAMES.NAME];
          displayName = (fieldName ? t(fieldName) : null) || t(fallbackName);
        } else {
          if (item.subtitle && !item.name?.includes(item.subtitle)) {
            // Use comma separator to match Invoice format
            displayName = `${t(item.name)}, ${t(item.subtitle)}`;
          } else {
            displayName = t(item.name);
          }
        }

        // Post-process to match Invoice format exactly
        if (displayName) {
          // Remove " - prenájom" suffix from scaffolding rental
          displayName = displayName.replace(/ - prenájom/g, '');
        }

        const translatedUnit = t(unit);
        const formattedQuantity = (unit === UNIT_TYPES.DAY || unit === UNIT_TYPES.DAYS)
          ? `${Math.round(quantity)} ${translatedUnit}`
          : `${formatSmartDecimal(quantity, 2)} ${translatedUnit}`;

        allOthersRows.push([
          { content: sanitizeText(displayName || ''), parentCategoryKey: 'Others' },
          { content: sanitizeText(formattedQuantity), parentCategoryKey: 'Others' },
          { content: sanitizeText(formatCurrency(pricePerUnit)), parentCategoryKey: 'Others' },
          { content: sanitizeText(`${Math.round(itemVatRate * 100)} %`), parentCategoryKey: 'Others' },
          { content: sanitizeText(formatCurrency(vatAmount)), parentCategoryKey: 'Others' },
          { content: sanitizeText(formatCurrency(othersCost)), parentCategoryKey: 'Others' }
        ]);
      });

      // Apply Custom Sort: Cesta (Travel) -> Lešenie (Scaffolding) -> Montáž (Assembly) -> Vŕtačka (Drill) -> Požičovňa (Rental)
      const getSortPriority = (text) => {
        const t = text.toLowerCase();
        if (t.includes('cesta') || t.includes('travel') || t.includes('journey')) return 1;
        if (t.includes('lešenie') && !t.includes('montáž')) return 2; // Scaffolding (rental/base)
        if (t.includes('lešenie') && t.includes('montáž')) return 3; // Scaffolding Assembly
        if (t.includes('jadrová') || t.includes('drill')) return 4;
        if (t.includes('požičovňa') || t.includes('tool rental')) return 5;
        return 100; // Others
      };

      allOthersRows.sort((a, b) => {
        const nameA = a[0].content; // Assuming index 0 is Description
        const nameB = b[0].content;
        return getSortPriority(nameA) - getSortPriority(nameB);
      });

      // Push sorted rows to tableData
      allOthersRows.forEach(row => tableData.push(row));
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
      showHead: 'firstPage', // We will manually draw header on other pages to control spacing
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'medium', cellPadding: { top: 0.2, bottom: 1.5, left: 0, right: 0.5 }, font: 'SF-Pro', fontSize: 11.2, valign: 'top' },
      styles: { fontSize: 10.2, cellPadding: { top: 0.2, bottom: 0.2, left: 0, right: 0.5 }, lineColor: [255, 255, 255], lineWidth: 0, font: 'SF-Pro', valign: 'bottom' },
      tableWidth: 185.3,
      margin: { top: 42, left: 12.35, right: 12.35 }, // Increased to 42 to match iOS lower header position on P2+
      tableLineColor: [255, 255, 255],
      tableLineWidth: 0,
      columnStyles: {
        0: { cellWidth: 69.5, halign: 'left', overflow: 'linebreak', fontSize: 11.2 }, // Description stays 11.2 (iOS 12pt)
        1: { cellWidth: 16.8, halign: 'right' }, // Others are 10.2 (iOS 11pt)
        2: { cellWidth: 26.2, halign: 'right' },
        3: { cellWidth: 19.8, halign: 'right' },
        4: { cellWidth: 26.5, halign: 'right' },
        5: { cellWidth: 26.5, halign: 'right' }
      },
      didParseCell: (data) => {
        // Force header alignment to match body columns
        if (data.section === 'head') {
          const alignments = ['left', 'right', 'right', 'right', 'right', 'right'];
          data.cell.styles.halign = alignments[data.column.index];
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          if (!doc._pageStarterCategories) doc._pageStarterCategories = {};
          if (!doc._pageStarterCategories[data.pageNumber]) {
            const firstCell = data.row.raw[0];
            if (firstCell && typeof firstCell === 'object') {
              doc._pageStarterCategories[data.pageNumber] = {
                key: firstCell.parentCategoryKey || firstCell.categoryKey,
                isHeader: !!firstCell.isCategoryHeader
              };
            }
          }
        }
      },
      didDrawPage: (data) => {
        // Draw header (Invoice/Offer Number) on subsequent pages
        if (data.pageNumber > 1) {
          doc.setFontSize(18.7); // Scaled from iOS 20pt
          doc.setFont('SF-Pro', 'semibold');
          const headerText = isPriceOffer
            ? `${t('Price Offer Abbr')} ${projectNumber || ''}`
            : `${t('Invoice')} ${invoice.invoiceNumber}`;
          doc.text(sanitizeText(headerText), 12.35, 20);

          // === Manual Table Header for Page 2+ ===
          // Allows precise placement of line and label without affecting Page 1
          doc.setFont('SF-Pro', 'medium');
          doc.setFontSize(11.2);
          doc.setTextColor(0, 0, 0);

          const startY = 34; // Header text Y position (User requested 34)

          // Helper to draw aligned text based on column widths
          const drawHeadCol = (text, x, align) => {
            doc.text(sanitizeText(text), x, startY, { align: align });
          };

          // Column 0: Description (Left aligned, X=12.35)
          drawHeadCol(t('Description'), 12.35, 'left');

          // Column 1: Quantity (Right aligned) -> 12.35 + 69.5 + 16.8 = 98.65
          drawHeadCol(t('Quantity'), 12.35 + 69.5 + 16.8, 'right');

          // Column 2: Price per Unit -> + 26.2 = 124.85
          drawHeadCol(t('Price per Unit'), 12.35 + 69.5 + 16.8 + 26.2, 'right');

          // Column 3: VAT (%) -> + 19.8 = 144.65
          drawHeadCol(t('VAT (%)'), 12.35 + 69.5 + 16.8 + 26.2 + 19.8, 'right');

          // Column 4: VAT -> + 26.5 = 171.15
          drawHeadCol(t('VAT'), 12.35 + 69.5 + 16.8 + 26.2 + 19.8 + 26.5, 'right');

          // Column 5: Price -> + 26.5 = 197.65
          drawHeadCol(t('Price'), 197.65, 'right');

          // Draw Line (High and tight, like Page 1)
          const lineY = startY + 2; // 28mm
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.35);
          doc.line(12.35, lineY, 197.65, lineY);

          // Draw Category Label below line (if applicable)
          const pageInfo = doc._pageStarterCategories ? doc._pageStarterCategories[data.pageNumber] : null;
          if (pageInfo && pageInfo.key && !pageInfo.isHeader) {
            doc.setFontSize(8);
            doc.setFont('SF-Pro', 'normal');
            doc.setTextColor(0, 0, 0);
            const catLabel = t(pageInfo.key);
            const formattedCat = sanitizeText(catLabel).charAt(0).toUpperCase() + sanitizeText(catLabel).slice(1).toLowerCase();

            // Place label in the gap created by margin.top: 36
            // Line at 28. Body starts at 36. Text at ~32.
            doc.text(`${formattedCat}`, 12.35, lineY + 4);
          }
        } else {
          // Page 1: Just draw the line for standard header
          // Header calculated by autoTable.
          const thCell = data.table.head[0].cells[0];
          // Draw tight line (same as before)
          const lineY = thCell.y + 6;
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.35);
          doc.line(12.35, lineY, 197.65, lineY);
        }
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
    const rowSpacing = 6.5; // Increased from 5 for a small gap

    doc.setFontSize(14); // Scaled from iOS 15pt
    doc.setFont('SF-Pro', 'normal');
    // Restore keys with colons to match translation files, but value will be colon-free
    doc.text(sanitizeText(t('Without VAT:')), totalsLabelX, totalY);
    // Values are now normal font, not bold
    doc.text(sanitizeText(formatCurrency(totalWithoutVAT)), rightX, totalY, { align: 'right' });

    totalY += rowSpacing;
    // doc.setFont('SF-Pro', 'normal'); // Already normal
    doc.text(sanitizeText(t('VAT:')), totalsLabelX, totalY);
    // Values are now normal font, not bold
    doc.text(sanitizeText(formatCurrency(vat)), rightX, totalY, { align: 'right' });

    totalY += rowSpacing;
    doc.setFontSize(15.9); // Scaled from iOS 17pt
    doc.setFont('SF-Pro', 'semibold');
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
            doc.setFont('SF-Pro', 'normal');
            doc.text(sanitizeText(t('Scan to pay')), qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });
          }
        } catch (e) {
          console.warn('Failed to add QR code to PDF:', e);
        }
      }
    }

    // === SIGNATURE SECTION ===
    const signatureY = totalY + 15;
    doc.setFontSize(9.3); // Scaled from iOS 10pt
    doc.setFont('SF-Pro', 'normal');
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
        const boxY = signatureY + 1; // Moved up closer to 'Issued by'
        const centeredX = boxX + (55 - sigWidth) / 2;
        const centeredY = boxY; // Top-aligned within the signature area for closer look

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
    // Notes start at 240, so signature needs to end before that (e.g. 235) to avoid overlap

    const notesStartY = 240;
    const needsNewPage = signatureBottomY > (notesStartY - 5); // Break if signature goes past 235

    if (needsNewPage) {
      doc.addPage();
    }

    // === INVOICE NOTES ===
    if (invoice.notes) {
      doc.setFont('SF-Pro', 'normal');
      doc.setFontSize(9.3); // Scaled from iOS 10pt
      const notesText = doc.splitTextToSize(sanitizeText(invoice.notes), 160);
      doc.text(notesText, 105, 243, { align: 'center' }); // Pushed down from 240
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
        // Shifting down by 0.6mm to align with text center and other images
        const cy = y - size * 0.3; // Center Y
        doc.setLineWidth(0.2);
        doc.circle(x + size / 2, cy, size / 2, 'S');
        doc.line(x, cy, x + size, cy);
        doc.line(x + size / 2, cy - size / 2, x + size / 2, cy + size / 2);
        // Optional: add inner ellipses for meridians
        doc.ellipse(x + size / 2, cy, size / 4, size / 2, 'S');
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

    // Calculate positions for truly equal visual gaps (185.3 total usable width)
    // Usable width = 197.65 - 12.35 = 185.3
    // We want 4 columns with equal gaps. 
    // Col 1 at 12.35, Col 4 ending at 197.65.
    // Center point of gaps: 12.35 + (185.3 * 1/4, 2/4, 3/4) is not ideal because text widths vary.
    // Let's use fixed step positions to ensure they don't drift too far right.
    const col1 = 12.35;
    const col2 = 70;     // Nudged slightly left from 74.12
    const col3 = 118;    // Nudged further left from 125
    const col4 = 197.65; // Flush to right edge
    const colWidth = 45; // Slightly narrower to ensure gaps
    const iconOffset = 6;
    const textMaxWidth = colWidth - iconOffset - 1;
    const iconLineHeight = 4.0;

    doc.setFontSize(9.3); // Scaled from iOS 10pt

    // Helper to draw wrapped text for footer icons
    const drawWrappedIconText = (text, x, y, maxWidth, medium = false, align = 'left') => {
      if (!text) return 0;
      doc.setFont('SF-Pro', medium ? 'medium' : 'normal');
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
      // For web and phone, we use left alignment
      drawIcon('web', col3, topRowY, 3);
      drawWrappedIconText(contractor.website, col3 + iconOffset, topRowY, textMaxWidth);
    }

    // Column 4: Email (right edge - right aligned for flush look)
    if (contractor?.email) {
      const emailIconSize = 4;
      // Calculate text width to position icon correctly to the left of the text
      // Since it's right aligned, we need: RightEdge(col4) - TextWidth - IconPadding - IconWidth
      const emailText = sanitizeText(contractor.email);
      doc.setFont('SF-Pro', 'normal');
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
    const col2X = 58;      // Middle column - Business IDs
    const col3X = 110;     // Right column - Bank info
    let colY = dividerY + 5;

    doc.setFontSize(9.3);
    doc.setFont('SF-Pro', 'normal');

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
    if (contractorBusinessId) col2Lines.push({ text: `${t('BID')}: ${contractorBusinessId}` });
    if (contractorTaxId) col2Lines.push({ text: `${t('TID')}: ${contractorTaxId}` });
    if (contractorVatId) col2Lines.push({ text: `${t('VAT ID')}: ${contractorVatId}` });

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
        doc.setFont('SF-Pro', 'bold');
      } else {
        doc.setFont('SF-Pro', 'normal');
      }
      doc.text(sanitizeText(line.text), col1X, col1StartY + (i * footerLineHeight));
    });
    doc.setFont('SF-Pro', 'normal');

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

    // Delivery note notice - Only for Invoices
    if (!isPriceOffer) {
      doc.setFontSize(8.4); // Scaled from iOS 9pt
      doc.setTextColor(150, 150, 150);
      doc.text(sanitizeText(t('Invoice also serves as delivery note')), 105, 285, { align: 'center' });
    }

    // App attribution - bottom center
    doc.setFontSize(9.3); // Scaled from iOS 10pt
    doc.setTextColor(0, 0, 0);
    doc.text(sanitizeText(t('Created using Fido Building Calcul app.')), 105, 290, { align: 'center' });

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
      projectCategory: params.projectCategory,
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
  vatRate = 0.23,
  formatDate,
  formatPrice,
  t
}) => {
  try {
    // Pre-load footer icons
    const userIconData = await loadImageToBase64('/user_18164876.png');
    const phoneIconData = await loadImageToBase64('/phone-receiver-silhouette_1257.png');
    const mailIconData = await loadImageToBase64('/mail.png');

    const pageWidth = 222.25; // 630pt
    const margin = 12.35; // 35pt
    const contentWidth = pageWidth - (margin * 2);
    const boxGap = 7;
    const boxWidth = (contentWidth - (boxGap * 2)) / 3;
    const boxHeight = 12;

    // eslint-disable-next-line no-control-regex
    const sanitizeText = (text) => text ? String(text).replace(/[\u0000-\u001F\u007F-\u009F]/g, '') : '';
    const formatCurrency = (amount) => formatPrice ? formatPrice(amount) : new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(amount || 0);

    // --- FIXED HEIGHT TO MATCH iOS ---
    // iOS uses: .frame(width: 630).frame(minHeight: 500, alignment: .top)
    // This means the page is ALWAYS 500pt (176.39mm), not dynamically calculated
    const finalPageHeight = 176.39; // Fixed 500pt to match iOS exactly

    const iconLineHeight = 4.0;
    const footerIconsH = 12;
    const dividerH = 5;
    const bottomColsH = 25;
    const brandingH = 15;

    // --- FINAL RENDER ---
    const doc = new jsPDF({
      orientation: 'portrait', unit: 'mm', format: [pageWidth, finalPageHeight]
    });
    registerSFProFont(doc);

    let curY = 35;
    doc.setFontSize(23.4); doc.setFont('SF-Pro', 'bold');
    const titleText = `${t('Cash Receipt')} ${invoice.invoiceNumber}`;
    doc.text(sanitizeText(titleText), margin, curY);
    curY += 15;

    // Bubbles (LEFT ALIGNED)
    const bY = curY;
    const dBu = (bx, bT, bV) => {
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
      doc.roundedRect(bx, bY, boxWidth, boxHeight, 5, 5);
      doc.setFont('SF-Pro', 'normal'); doc.setTextColor(100, 100, 100); doc.setFontSize(5.6);
      doc.text(sanitizeText(bT), bx + 3, bY + 4); // Left align with 3mm padding
      doc.setFont('SF-Pro', 'bold'); doc.setTextColor(0, 0, 0); doc.setFontSize(8.4);
      const bL = doc.splitTextToSize(sanitizeText(bV), boxWidth - 6);
      doc.text(bL, bx + 3, bY + 8.5); // Left align with 3mm padding
    };

    dBu(margin, t('Purpose'), `${t('Payment for Invoice')} ${invoice.invoiceNumber}`);
    dBu(margin + boxWidth + boxGap, t('Date of Issue'), formatDate(invoice.issueDate));
    dBu(margin + (boxWidth + boxGap) * 2, t('Total price'), formatCurrency(totalWithVAT));
    curY = bY + boxHeight + 10;

    const lX = margin;
    const sX = pageWidth - margin - 85;

    // Customer
    doc.setFontSize(12.1); doc.setFont('SF-Pro', 'bold');
    doc.text(sanitizeText(t('Subscriber')), lX, curY);
    const stY = curY;
    curY += 6; // Tightened from 8

    doc.setFontSize(10); doc.setFont('SF-Pro', 'normal');
    let cY = curY;
    const rCL = (txt, bld = false) => {
      if (!txt) return;
      doc.setFont('SF-Pro', bld ? 'medium' : 'normal');
      doc.text(sanitizeText(txt), lX, cY); cY += 4.5;
    };

    if (client) {
      rCL(client.name, true);
      rCL(client.street || client.address);
      rCL(client.second_row_street || client.secondRowStreet);
      rCL([client.postal_code || client.postalCode, client.city].filter(Boolean).join(' '));
      rCL(client.country);
      if (client.email) rCL(client.email);
      if (client.phone) rCL(client.phone);
      cY += 2;
      const bi = client.business_id || client.businessId;
      const ti = client.tax_id || client.taxId;
      const vi = client.vat_registration_number || client.vatId || client.vatNumber;
      if (bi) rCL(`${t('BID')}: ${bi}`);
      if (ti) rCL(`${t('TID')}: ${ti}`);
      if (vi) rCL(`${t('VAT ID')}: ${vi}`);
    } else doc.text('-', lX, cY);

    let rY = stY;
    if (contractor?.name) {
      doc.setFontSize(14.1); doc.setFont('SF-Pro', 'normal');
      doc.text(sanitizeText(t('Made by')), sX, rY);
      doc.text(sanitizeText(contractor.name), pageWidth - margin, rY, { align: 'right' });
      rY += 8;
    }
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
    doc.line(sX, rY, pageWidth - margin, rY);
    rY += 6; // Tightened

    const tW = totalWithVAT / (1 + vatRate);
    const vA = totalWithVAT - tW;
    const rPR = (lbl, val, bld = false, sz = 14.1) => {
      doc.setFontSize(sz); doc.setFont('SF-Pro', bld ? 'bold' : 'normal');
      doc.text(sanitizeText(lbl), sX, rY);
      doc.text(sanitizeText(formatCurrency(val)), pageWidth - margin, rY, { align: 'right' });
      rY += bld ? 7 : 5; // Tightened
    };
    rPR(t('without VAT'), tW);
    rPR(`${t('VAT')} (${Math.round(vatRate * 100)}%)`, vA);
    rY += 1; // Tightened
    rPR(t('Total price:'), totalWithVAT, true, 16.9);
    rY += 4; // Tightened from 6

    doc.setFontSize(8.4); doc.setFont('SF-Pro', 'medium');
    doc.text(sanitizeText(t('Issued by:')), sX + 15, rY);
    rY += 1.5; // Tightened from 2

    if (contractor?.signature) {
      try {
        const pr = doc.getImageProperties(contractor.signature);
        let sW = 49.3, sH = 28.2;
        if (pr.width && pr.height) {
          const asp = pr.width / pr.height;
          if (asp > (49.3 / 28.2)) { sW = 49.3; sH = 49.3 / asp; } else { sH = 28.2; sW = 28.2 * asp; }
        }
        doc.addImage(contractor.signature, contractor.signature.includes('png') ? 'PNG' : 'JPEG', sX + 15, rY, sW, sH);
      } catch (e) { doc.line(sX + 15, rY + 15, sX + 55, rY + 15); }
    } else doc.line(sX + 15, rY + 15, sX + 55, rY + 15);

    // --- FOOTER RENDER (AT BOTTOM OF PAGE) ---
    // Position footer at the bottom with same margin as invoice
    const footerBaseY = finalPageHeight - margin - brandingH - bottomColsH - dividerH - footerIconsH;
    let ftY = footerBaseY;

    // Icons Section
    const col1 = margin; const col2 = 70; const col3 = 118; const col4 = pageWidth - margin;
    const tMW = 45 - 6 - 1;

    const dIc = (ty, ix, iy, sz = 3) => {
      doc.setDrawColor(0, 0, 0); doc.setFillColor(0, 0, 0); doc.setLineWidth(0.2);
      if (ty === 'user' && userIconData) doc.addImage(userIconData, 'PNG', ix, iy - sz * 0.8, sz, sz);
      else if (ty === 'phone' && phoneIconData) doc.addImage(phoneIconData, 'PNG', ix, iy - sz * 0.8, sz, sz);
      else if (ty === 'web') {
        const c_y = iy - sz * 0.3; doc.circle(ix + sz / 2, c_y, sz / 2, 'S');
        doc.line(ix, c_y, ix + sz, c_y); doc.line(ix + sz / 2, c_y - sz / 2, ix + sz / 2, c_y + sz / 2);
        doc.ellipse(ix + sz / 2, c_y, sz / 4, sz / 2, 'S');
      } else if (ty === 'email' && mailIconData) doc.addImage(mailIconData, 'PNG', ix, iy - sz * 0.8, sz, sz);
    };

    const dFT = (tx, ix, iy, mw, al = 'left') => {
      if (!tx) return;
      doc.setFont('SF-Pro', 'normal'); doc.setFontSize(9.3);
      const lns = doc.splitTextToSize(sanitizeText(tx), mw);
      const a = (lns.length - 1) * iconLineHeight / 2;
      lns.forEach((l, i) => doc.text(l, ix, iy - a + (i * iconLineHeight), { align: al }));
    };

    const tIcY = ftY + 5;
    dIc('user', col1, tIcY, 3); dFT(contractor?.contactPerson || contractor?.contact_person_name, col1 + 6, tIcY, tMW);
    dIc('phone', col2, tIcY, 3); dFT(contractor?.phone, col2 + 6, tIcY, tMW);
    dIc('web', col3, tIcY, 3); dFT(contractor?.website, col3 + 6, tIcY, tMW);
    if (contractor?.email) {
      const eT = sanitizeText(contractor.email); const eL = doc.splitTextToSize(eT, tMW);
      let mL = 0; eL.forEach(l => { const w = doc.getTextWidth(l); if (w > mL) mL = w; });
      dIc('email', col4 - mL - 6, tIcY, 4); dFT(contractor.email, col4, tIcY, tMW, 'right');
    }

    ftY += footerIconsH;
    // Divider Line (Fixed position relative to icons)
    doc.setLineWidth(0.5); doc.setDrawColor(0, 0, 0);
    doc.line(margin, ftY, pageWidth - margin, ftY);
    ftY += 4; // Reduced from 5

    // Addresses & IDs (Bottom Aligned Parity)
    const c1L = [{ text: contractor?.name }, { text: contractor?.street }, { text: contractor?.second_row_street || contractor?.additionalInfo }].filter(l => l.text);
    const ctL = [contractor?.postal_code || contractor?.postalCode, contractor?.city].filter(Boolean).join(' ');
    if (ctL) c1L.push({ text: ctL });
    if (contractor?.country) c1L.push({ text: contractor.country });

    // Restored camelCase fallbacks to ensure info visibility
    const bId = contractor?.business_id || contractor?.businessId;
    const tId = contractor?.tax_id || contractor?.taxId;
    const vId = contractor?.vat_registration_number || contractor?.vatNumber;
    const lNotice = contractor?.legal_notice || contractor?.legalAppendix;
    const bAcc = contractor?.bank_account_number || contractor?.bankAccount;
    const sCode = contractor?.swift_code || contractor?.bankCode;

    const c2L = [{ text: bId ? `${t('BID')}: ${bId}` : '' }, { text: tId ? `${t('TID')}: ${tId}` : '' }, { text: vId ? `${t('VAT ID')}: ${vId}` : '' }].filter(l => l.text);
    const c3L = [{ text: lNotice ? `${t('Legal File Ref')}: ${lNotice}` : '' }, { text: bAcc ? `${t('Bank Account / IBAN')}: ${bAcc}` : '' }, { text: sCode ? `${t('SWIFT code')}: ${sCode}` : '' }].filter(l => l.text);

    const maxF = Math.max(c1L.length, c2L.length, c3L.length);
    const bFY = ftY + (maxF * 4.5);
    const dC = (lns, ix) => {
      const sFY = bFY - (lns.length * 4.5);
      lns.forEach((l, i) => doc.text(sanitizeText(l.text), ix, sFY + (i * 4.5)));
    };
    dC(c1L, margin); dC(c2L, 80); dC(c3L, 145);

    doc.setFontSize(8.4); doc.setTextColor(150, 150, 150);
    doc.text("Faktúra slúži aj ako dodací list", pageWidth / 2, finalPageHeight - 12, { align: 'center' });
    doc.setTextColor(0, 0, 0); doc.setFontSize(9.3);
    doc.text(sanitizeText(t('Created using Fido Building Calcul app.')), pageWidth / 2, finalPageHeight - 7, { align: 'center' });

    const pB = doc.output('blob'); const bU = URL.createObjectURL(pB);
    return { doc, blobUrl: bU, pdfBlob: pB };
  } catch (error) {
    console.error('Error generating cash receipt PDF:', error);
    throw error;
  }
};
