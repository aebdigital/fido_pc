import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InterRegular } from './fonts/InterRegular';
import { InterBold } from './fonts/InterBold';

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

export const generateInvoicePDF = ({
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

    // Logo - Top Right
    const headerLogoSize = 25;
    const logoX = 190 - headerLogoSize;
    if (contractor?.logo) {
      try {
        let format = 'JPEG';
        if (typeof contractor.logo === 'string' && contractor.logo.startsWith('data:image/')) {
          if (contractor.logo.includes('png')) format = 'PNG';
        }
        doc.addImage(contractor.logo, format, logoX, 10, headerLogoSize, headerLogoSize);
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
    const lineHeight = 4;
    const addressBottomY = contentStartY + (addressLines.length * lineHeight);

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
        const unit = item.calculation?.unit || item.unit || '';
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = workCost * itemVatRate;
        const displayName = item.subtitle ? `${t(item.name)} - ${t(item.subtitle)}` : t(item.name);

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)} ${t(unit)}`),
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
        const unit = item.calculation?.unit || item.unit || '';
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = materialCost * itemVatRate;
        const displayName = item.subtitle ? `${t(item.name)} - ${t(item.subtitle)}` : t(item.name);

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)} ${t(unit)}`),
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
        const quantity = item.calculation?.quantity || 0;
        const othersCost = item.calculation?.workCost || 0;
        const pricePerUnit = quantity > 0 ? othersCost / quantity : 0;
        const unit = item.calculation?.unit || item.unit || '';
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = othersCost * itemVatRate;
        const displayName = item.subtitle ? `${t(item.name)} - ${t(item.subtitle)}` : t(item.name);

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)} ${t(unit)}`),
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
        doc.addImage(contractor.signature, format, rightX - 40, signatureY + 3, 40, 20);
      } catch (e) {
        console.warn('Failed to add signature to PDF:', e);
        doc.setLineWidth(0.3);
        doc.line(rightX - 40, signatureY + 18, rightX, signatureY + 18);
      }
    } else {
      doc.setLineWidth(0.3);
      doc.line(rightX - 40, signatureY + 18, rightX, signatureY + 18);
    }

    // === INVOICE NOTES - Centered above footer ===
    if (invoice.notes) {
      doc.setFontSize(8);
      doc.setFont('Inter', 'normal');
      const notesText = doc.splitTextToSize(sanitizeText(invoice.notes), 150);
      doc.text(notesText, 105, 242, { align: 'center' });
    }

    // === FOOTER SECTION - Contractor info ===

    // Top row ABOVE divider: Name | Phone | Web | Email (equally spaced with icons)
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
        doc.circle(x + size/2, y - size * 0.6, size/4, 'S');
        doc.circle(x + size/2, y - size * 0.1, size/3, 'S');
      } else if (type === 'phone') {
        // Simple phone icon - rectangle
        doc.roundedRect(x, y - size, size * 0.6, size, 0.3, 0.3, 'S');
      } else if (type === 'web') {
        // Simple globe icon - circle with cross lines
        doc.circle(x + size/2, y - size/2, size/2, 'S');
        doc.line(x, y - size/2, x + size, y - size/2);
        doc.line(x + size/2, y - size, x + size/2, y);
      } else if (type === 'email') {
        // Simple envelope icon - rectangle with V
        doc.rect(x, y - size * 0.7, size, size * 0.7, 'S');
        doc.line(x, y - size * 0.7, x + size/2, y - size * 0.3);
        doc.line(x + size, y - size * 0.7, x + size/2, y - size * 0.3);
      }
    };

    // Calculate positions for 4 equal columns
    const colWidth = pageWidth / 4;
    const col1 = startX;
    const col2 = startX + colWidth;
    const col3 = startX + colWidth * 2;
    const col4 = startX + colWidth * 3;

    doc.setFontSize(7);

    // Column 1: Contact Person with user icon (not company name)
    const contactPerson = contractor?.contactPerson || contractor?.contact_person_name || '';
    if (contactPerson) {
      drawIcon('user', col1, topRowY, 3);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(contactPerson), col1 + 5, topRowY);
    }

    // Column 2: Phone with phone icon
    doc.setFont('Inter', 'normal');
    if (contractor?.phone) {
      drawIcon('phone', col2, topRowY, 3);
      doc.text(sanitizeText(contractor.phone), col2 + 5, topRowY);
    }

    // Column 3: Web with globe icon
    if (contractor?.website) {
      drawIcon('web', col3, topRowY, 3);
      doc.text(sanitizeText(contractor.website), col3 + 5, topRowY);
    }

    // Column 4: Email with envelope icon
    if (contractor?.email) {
      drawIcon('email', col4, topRowY, 3);
      doc.text(sanitizeText(contractor.email), col4 + 5, topRowY);
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
