import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { InterRegular } from './fonts/InterRegular';
import { InterBold } from './fonts/InterBold';
import { WORK_ITEM_PROPERTY_IDS, WORK_ITEM_NAMES, UNIT_TYPES } from '../config/constants';
import { unitToDisplaySymbol } from '../services/workItemsMapping';

// SEPA countries list (European Payments Council members)
const SEPA_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT',
  'LV', 'LI', 'LT', 'LU', 'MT', 'MC', 'NL', 'NO', 'PL', 'PT', 'RO', 'SM', 'SK', 'SI', 'ES', 'SE',
  'CH', 'GB'
]);

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

  try {
    const doc = new jsPDF();
    registerInterFont(doc);

    // === HEADER SECTION ===

    // Logo - Top Right (preserve aspect ratio)
    const maxLogoSize = 25;
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

        const logoX = 190 - logoWidth;
        const logoY = 10 + (maxLogoSize - logoHeight) / 2; // Center vertically in the space
        doc.addImage(contractor.logo, format, logoX, logoY, logoWidth, logoHeight);
      } catch (e) {
        console.warn('Failed to add logo to PDF:', e);
      }
    }

    // Invoice number / Price Offer title - left side
    doc.setFontSize(14);
    doc.setFont('Inter', 'bold');

    if (isPriceOffer) {
      // New format: CP {number} - {name} as MAIN TITLE (same style as invoice)
      const title = `${t('Price Offer Abbr')} ${projectNumber || ''} - ${invoice.projectName || ''}`;
      doc.text(sanitizeText(title), 20, 20);

      // Project Notes - same style as invoice subtitle (fontSize 11, 4px below title)
      if (projectNotes) {
        doc.setFontSize(11);
        doc.setFont('Inter', 'normal');
        const splitNotes = doc.splitTextToSize(sanitizeText(projectNotes), 100);
        doc.text(splitNotes, 20, 24);
      }
    } else {
      doc.text(sanitizeText(`${t('Invoice')} ${invoice.invoiceNumber}`), 20, 20);
      doc.setFontSize(11);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(`${t('Price offer')} ${invoice.projectName || ''}`), 20, 24);
    }

    // === CLIENT SECTION (Odberatel) - Left side under header ===
    let clientY = 35;

    // Odberatel heading - 30% bigger (8 * 1.3 = ~10.4)
    doc.setFontSize(10);
    doc.setFont('Inter', 'bold');
    doc.text(sanitizeText(t('Subscriber')), 20, clientY);

    doc.setFontSize(8);
    doc.setFont('Inter', 'normal');
    clientY += 4; // Closer to content (was 5)

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
    }

    // Calculate the bottom Y position based on address content
    // Use minimum height of 5 lines (20px) to ensure consistent layout even with empty client
    const lineHeight = 4;
    const minLines = 5;
    const actualLines = Math.max(addressLines.length, minLines);
    const addressBottomY = contentStartY + (actualLines * lineHeight);

    // --- Draw LEFT COLUMN: Address (top-aligned) ---
    let addressY = contentStartY;
    addressLines.forEach(line => {
      doc.text(sanitizeText(line), 20, addressY);
      addressY += lineHeight;
    });
    if (addressLines.length === 0 && !client) {
      doc.text(sanitizeText('-'), 20, contentStartY);
    }

    // --- Draw MIDDLE COLUMN: Business IDs (bottom-aligned) ---
    const businessX = 70;
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
    const rightBlockX = 190;
    const labelX = rightBlockX - 50;

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
    let tableStartY = clientY + 4; // Closer to columns
    let boxY = 0;
    let boxHeight = 0;

    if (!isPriceOffer) {
      boxY = clientY + 3; // Closer to columns
      const ibanBoxWidth = 52; // Wider box for IBAN
      const boxWidth = 36; // Smaller equal width for other 3 boxes
      boxHeight = 10; // Height for equal spacing
      const boxStartX = 20;
      const gap = 3; // Gaps between boxes
      const borderRadius = 2; // Smaller border radius

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);

      // Get bank account for first box
      const contractorBankAccount = contractor?.bank_account_number || contractor?.bankAccount || '';

      // Box 1: Cislo uctu / IBAN (wider)
      doc.roundedRect(boxStartX, boxY, ibanBoxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(6);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(t('Bank Account / IBAN')), boxStartX + 2, boxY + 3.5);
      doc.setFontSize(7);
      doc.setFont('Inter', 'bold');
      // Truncate IBAN if too long to fit in wider box
      const ibanDisplay = contractorBankAccount.length > 26 ? contractorBankAccount.substring(0, 26) + '...' : contractorBankAccount;
      doc.text(sanitizeText(ibanDisplay || '-'), boxStartX + 2, boxY + 7.5);

      // Box 2: Variabilny symbol
      const box2X = boxStartX + ibanBoxWidth + gap;
      doc.roundedRect(box2X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(6);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(t('Variable Symbol')), box2X + 2, boxY + 3.5);
      doc.setFontSize(7);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(invoice.invoiceNumber), box2X + 2, boxY + 7.5);

      // Box 3: Datum splatnosti
      const box3X = box2X + boxWidth + gap;
      doc.roundedRect(box3X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(6);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(t('Due Date')), box3X + 2, boxY + 3.5);
      doc.setFontSize(7);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(formatDate(invoice.dueDate)), box3X + 2, boxY + 7.5);

      // Box 4: Suma na uhradu
      const box4X = box3X + boxWidth + gap;
      doc.roundedRect(box4X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(6);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(t('Amount Due')), box4X + 2, boxY + 3.5);
      doc.setFontSize(7);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(formatCurrency(totalWithVAT)), box4X + 2, boxY + 7.5);

      tableStartY = boxY + boxHeight + 3; // Closer to boxes
    } else {
      // For Price Offer, start table closer to client section
      tableStartY = clientY + 4; // Closer to columns
    }

    // === ITEMS TABLE ===

    // Build detailed breakdown from project
    const tableData = [];

    // Add work items with category header
    if (projectBreakdown && projectBreakdown.items && projectBreakdown.items.length > 0) {
      tableData.push([
        { content: sanitizeText(t('Work (Table Header)')), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], fontSize: 7 } }
      ]);

      projectBreakdown.items.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const workCost = item.calculation?.workCost || 0;
        const pricePerUnit = quantity > 0 ? workCost / quantity : 0;
        const unit = getWorkItemUnit(item);
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = workCost * itemVatRate;

        // Get the work item name - try multiple sources
        const itemName = item.name || getWorkItemNameByPropertyId(item.propertyId) || '';
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
          displayName = item.fields?.[WORK_ITEM_NAMES.NAME] || t(itemName);
        } else {
          // Add subtitle for work types (wall/ceiling distinction, etc.)
          displayName = item.subtitle ? `${t(itemName)} ${t(item.subtitle)}` : t(itemName);
        }

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(1)}${t(unit)}`),
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
        { content: sanitizeText(t('Material (Table Header)')), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], fontSize: 7 } }
      ]);

      projectBreakdown.materialItems.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const materialCost = item.calculation?.materialCost || 0;
        const pricePerUnit = quantity > 0 ? materialCost / quantity : 0;
        let unit = item.calculation?.unit || item.unit || '';
        // Strip €/ prefix from unit if present (e.g. "€/m2" -> "m2")
        if (unit.startsWith('€/')) unit = unit.substring(2);
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
        const displayName = item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK
          ? (item.fields?.[WORK_ITEM_NAMES.NAME] || t(item.name))
          : (translatedSubtitle ? `${t(item.name)} - ${translatedSubtitle}` : t(item.name));

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)}${t(unit)}`),
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
        { content: sanitizeText(t('Others (Table Header)')), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], fontSize: 7 } }
      ]);

      projectBreakdown.othersItems.forEach(item => {
        let quantity = item.calculation?.quantity || 0;
        const othersCost = (item.calculation?.workCost || 0) + (item.calculation?.materialCost || 0);
        let unit = item.calculation?.unit || item.unit || '';
        // Strip €/ prefix from unit if present (e.g. "€/h" -> "h")
        if (unit.startsWith('€/')) unit = unit.substring(2);

        const values = item.fields || {};

        // Determine unit and quantity based on item type (same logic as RoomPriceSummary)
        if (!item.calculation?.unit) {
          // Check for scaffolding rental
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
        } else if (item.propertyId === WORK_ITEM_PROPERTY_IDS.CUSTOM_WORK && item.fields?.[WORK_ITEM_NAMES.NAME]) {
          // For custom work, use the user-entered name
          displayName = item.fields[WORK_ITEM_NAMES.NAME];
        } else {
          displayName = item.subtitle ? `${t(item.name)} - ${t(item.subtitle)}` : t(item.name);
        }

        // Format quantity with unit
        const translatedUnit = t(unit);
        const formattedQuantity = (unit === UNIT_TYPES.DAY || unit === UNIT_TYPES.DAYS)
          ? `${Math.round(quantity)} ${translatedUnit}`
          : `${quantity.toFixed(2)}${translatedUnit}`;

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
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: 1, font: 'Inter' },
      styles: { fontSize: 8, cellPadding: 1, lineColor: [255, 255, 255], lineWidth: 0, font: 'Inter' },
      tableWidth: 170,
      margin: { left: 20, right: 20 },
      tableLineColor: [255, 255, 255],
      tableLineWidth: 0,
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' }
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
        doc.line(20, headerBottom, 190, headerBottom);
      }
    });

    const finalY = doc.lastAutoTable.finalY || tableStartY + 20;

    // Draw black line at the bottom of table
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35); // ~1px thick
    doc.line(20, finalY, 190, finalY);

    // === TOTALS SECTION - Right aligned, with gap from table ===
    const rightX = 190;
    const totalsLabelX = rightX - 60; // More space between label and value
    let totalY = finalY + 8; // Gap from table
    const rowSpacing = 5; // Equal spacing between all rows

    doc.setFontSize(10);
    doc.setFont('Inter', 'normal');
    doc.text(sanitizeText(t('Without VAT:')), totalsLabelX, totalY);
    // Values are now normal font, not bold
    doc.text(sanitizeText(formatCurrency(totalWithoutVAT)), rightX, totalY, { align: 'right' });

    totalY += rowSpacing;
    // doc.setFont('Inter', 'normal'); // Already normal
    doc.text(sanitizeText(t('VAT:')), totalsLabelX, totalY);
    // Values are now normal font, not bold
    doc.text(sanitizeText(formatCurrency(vat)), rightX, totalY, { align: 'right' });

    totalY += rowSpacing;
    doc.setFontSize(11);
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
            const qrSize = 30;
            const qrX = 20;
            const qrY = finalY + 5;

            doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

            // Add label below QR code
            doc.setFontSize(6);
            doc.setFont('Inter', 'normal');
            doc.text(sanitizeText(t('Scan to pay')), qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
          }
        } catch (e) {
          console.warn('Failed to add QR code to PDF:', e);
        }
      }
    }

    // === SIGNATURE SECTION ===
    const signatureY = totalY + 12; // Proportionally moved down
    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');
    doc.text(sanitizeText(t('Issued by:')), rightX - 40, signatureY);

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

        // Center in the box (box starts at rightX - 40, signatureY + 3)
        const boxX = rightX - 40;
        const boxY = signatureY + 3;
        const centeredX = boxX + (40 - sigWidth) / 2;
        const centeredY = boxY + (20 - sigHeight) / 2;

        doc.addImage(contractor.signature, format, centeredX, centeredY, sigWidth, sigHeight);
      } catch (e) {
        console.warn('Failed to add signature to PDF:', e);
        doc.setLineWidth(0.3);
        doc.line(rightX - 40, signatureY + 18, rightX, signatureY + 18);
      }
    } else {
      doc.setLineWidth(0.3);
      doc.line(rightX - 40, signatureY + 18, rightX, signatureY + 18);
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
      doc.setFontSize(8);
      doc.setFont('Inter', 'normal');
      const notesText = doc.splitTextToSize(sanitizeText(invoice.notes), 150);
      doc.text(notesText, 105, 242, { align: 'center' });
    }

    // Top row ABOVE divider: Name | Phone | Web | Email (equally spaced with icons)
    // Footer is always at the bottom of the page (same Y positions), just on a new page if needed
    const topRowY = 252;
    const pageWidth = 170; // usable width (20 to 190)
    const startX = 20;

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

    // Calculate positions for 4 equal columns
    const colWidth = pageWidth / 4;
    const col1 = startX;
    const col2 = startX + colWidth;
    const col3 = startX + colWidth * 2;
    const col4 = startX + colWidth * 3;
    const iconOffset = 5; // Space after icon for text
    const textMaxWidth = colWidth - iconOffset - 2; // Available width for text (with small margin)
    const iconLineHeight = 2.5; // Line height for wrapped text

    doc.setFontSize(7);

    // Helper to draw wrapped text for footer icons
    const drawWrappedIconText = (text, x, y, maxWidth, bold = false) => {
      if (!text) return 0;
      doc.setFont('Inter', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(sanitizeText(text), maxWidth);

      // Vertical centering adjustment
      // If lines.length > 1, shift start Y up so the block is centered relative to y
      // y is where the icon is drawn (approx center)
      const adjustment = (lines.length - 1) * iconLineHeight / 2;
      const startY = y - adjustment;

      lines.forEach((line, i) => {
        doc.text(line, x, startY + (i * iconLineHeight));
      });
      return lines.length;
    };

    // Column 1: Contact Person with user icon (not company name)
    const contactPerson = contractor?.contactPerson || contractor?.contact_person_name || '';
    if (contactPerson) {
      drawIcon('user', col1, topRowY, 3);
      drawWrappedIconText(contactPerson, col1 + iconOffset, topRowY, textMaxWidth, true);
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
    const dividerY = 256; // Moved up for equal spacing
    doc.setLineWidth(0.5);
    doc.line(20, dividerY, 190, dividerY);

    // Three columns BELOW divider
    const col1X = 20;      // Left column - Address
    const col2X = 80;      // Middle column - Business IDs
    const col3X = 140;     // Right column - Bank info
    let colY = dividerY + 4; // Equal gap below divider (4px matches gap above)

    doc.setFontSize(7);
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
    if (contractor?.name) col1Lines.push({ text: contractor.name, bold: true });
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
    if (bankAccount) col3Lines.push({ text: `IBAN: ${bankAccount}` });
    if (swiftCode) col3Lines.push({ text: `SWIFT kód: ${swiftCode}` });

    // Calculate max lines and bottom Y position
    const footerLineHeight = 3.5;
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
    doc.setFontSize(6);
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
      offerValidityPeriod: params.offerValidityPeriod
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
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = 25;

    // === TITLE ===
    doc.setFontSize(20);
    doc.setFont('Inter', 'bold');
    const title = `${t('Cash Receipt')} ${invoice.invoiceNumber}`;
    doc.text(sanitizeText(title), margin, currentY);
    currentY += 15;

    // === THREE INFO BOXES ===
    const boxWidth = contentWidth / 3 - 3;
    const boxHeight = 18;
    const boxY = currentY;
    const borderRadius = 2;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.setFontSize(8);

    // Box 1: Purpose
    const box1X = margin;
    doc.roundedRect(box1X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
    doc.setFont('Inter', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(sanitizeText(t('Purpose')), box1X + 3, boxY + 5);
    doc.setFont('Inter', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    const purposeText = `${t('Payment for Invoice')} ${invoice.invoiceNumber}`;
    const purposeLines = doc.splitTextToSize(sanitizeText(purposeText), boxWidth - 6);
    doc.text(purposeLines, box1X + 3, boxY + 11);

    // Box 2: Date of Issue
    const box2X = margin + boxWidth + 4;
    doc.setFontSize(8);
    doc.roundedRect(box2X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
    doc.setFont('Inter', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(sanitizeText(t('Date of Issue')), box2X + 3, boxY + 5);
    doc.setFont('Inter', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(sanitizeText(formatDate(invoice.issueDate)), box2X + 3, boxY + 11);

    // Box 3: Total Price
    const box3X = margin + (boxWidth + 4) * 2;
    doc.setFontSize(8);
    doc.roundedRect(box3X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
    doc.setFont('Inter', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(sanitizeText(t('Total price')), box3X + 3, boxY + 5);
    doc.setFont('Inter', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(sanitizeText(formatCurrency(totalWithVAT)), box3X + 3, boxY + 12);

    currentY = boxY + boxHeight + 15;

    // === TWO COLUMN LAYOUT: Customer (left) | Made by + Signature (right) ===
    const leftColX = margin;
    const rightColX = margin + contentWidth / 2 + 10;
    const rightColWidth = contentWidth / 2 - 10;

    // LEFT COLUMN: Customer info
    doc.setFontSize(11);
    doc.setFont('Inter', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(sanitizeText(t('Customer')), leftColX, currentY);
    currentY += 6;

    doc.setFontSize(9);
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
      doc.setFontSize(9);
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
    doc.setFontSize(10);
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
    doc.setFontSize(11);
    doc.text(sanitizeText(t('Total price')), rightColX, rightY);
    doc.text(sanitizeText(formatCurrency(totalWithVAT)), rightColX + rightColWidth, rightY, { align: 'right' });
    rightY += 12;

    // Signature
    doc.setFontSize(8);
    doc.setFont('Inter', 'normal');
    doc.text(sanitizeText(t('Issued by:')), rightColX, rightY);
    rightY += 3;

    if (contractor?.signature) {
      try {
        let format = 'PNG';
        if (typeof contractor.signature === 'string' && contractor.signature.startsWith('data:image/')) {
          if (contractor.signature.includes('jpeg') || contractor.signature.includes('jpg')) format = 'JPEG';
        }
        doc.addImage(contractor.signature, format, rightColX, rightY, 40, 20);
        rightY += 25;
      } catch (e) {
        console.warn('Failed to add signature:', e);
        doc.line(rightColX, rightY + 15, rightColX + 40, rightY + 15);
        rightY += 20;
      }
    } else {
      doc.line(rightColX, rightY + 15, rightColX + 40, rightY + 15);
      rightY += 20;
    }

    // === FOOTER SECTION - Same as invoice (4 icons + 3 columns) ===
    // Top row ABOVE divider: Name | Phone | Web | Email (equally spaced with icons)
    const topRowY = 252;
    const footerPageWidth = 170; // usable width (20 to 190)
    const startX = 20;

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

    // Calculate positions for 4 equal columns
    const colWidth = footerPageWidth / 4;
    const col1 = startX;
    const col2 = startX + colWidth;
    const col3 = startX + colWidth * 2;
    const col4 = startX + colWidth * 3;
    const iconOffset = 5; // Space after icon for text
    const textMaxWidth = colWidth - iconOffset - 2; // Available width for text (with small margin)
    const iconLineHeight = 2.5; // Line height for wrapped text

    doc.setFontSize(7);
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
      drawWrappedIconText(contactPerson, col1 + iconOffset, topRowY, textMaxWidth, true);
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
    doc.line(20, dividerY, 190, dividerY);

    // Three columns BELOW divider
    const col1X = 20;      // Left column - Address
    const col2X = 80;      // Middle column - Business IDs
    const col3X = 140;     // Right column - Bank info
    let colY = dividerY + 4; // Equal gap below divider

    doc.setFontSize(7);
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
    if (contractor?.name) footerCol1Lines.push({ text: contractor.name, bold: true });
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
    if (bankAccount) footerCol3Lines.push({ text: `IBAN: ${bankAccount}` });
    if (swiftCode) footerCol3Lines.push({ text: `SWIFT kód: ${swiftCode}` });

    // Calculate max lines and bottom Y position
    const footerLineHeight = 3.5;
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
    doc.setFontSize(6);
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
