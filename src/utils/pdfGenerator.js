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
      // New format: CP {number} - {name} as MAIN TITLE
      const title = `CP ${projectNumber || ''} - ${invoice.projectName || ''}`;
      doc.text(sanitizeText(title), 20, 20);
      
      // Project Notes (Poznámka k cenovej ponuke) - WITHOUT LABEL
      if (projectNotes) {
        doc.setFontSize(9);
        doc.setFont('Inter', 'normal');
        // Add some spacing below title
        const splitNotes = doc.splitTextToSize(sanitizeText(projectNotes), 100);
        doc.text(splitNotes, 20, 30);
      }
    } else {
      doc.text(sanitizeText(`Faktura ${invoice.invoiceNumber}`), 20, 20);
      doc.setFontSize(11);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText(`Cenova ponuka ${invoice.projectName || ''}`), 20, 24);
    }

    // Date info - Right side
    const dateY = 10 + headerLogoSize + 8; // More space below logo
    const rightBlockX = 190;
    const labelX = rightBlockX - 50; // Start labels 50 units left of right edge

    doc.setFontSize(8);

    if (isPriceOffer) {
      // Price Offer Dates
      // 1. Dátum vystavenia (Issue Date - Today)
      const today = new Date();
      doc.text(sanitizeText('Dátum vystavenia:'), labelX, dateY, { align: 'left' });
      doc.text(sanitizeText(formatDate(today.toISOString())), rightBlockX, dateY, { align: 'right' });

      // 2. Platné do (Valid Until)
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + parseInt(offerValidityPeriod || 30));
      
      doc.text(sanitizeText('Platné do:'), labelX, dateY + 4, { align: 'left' });
      doc.text(sanitizeText(formatDate(validUntil.toISOString())), rightBlockX, dateY + 4, { align: 'right' });

    } else {
      // Invoice Dates
      // Row 1 - Issue date
      doc.text(sanitizeText('Dátum vystavenia:'), labelX, dateY, { align: 'left' });
      doc.text(sanitizeText(formatDate(invoice.issueDate)), rightBlockX, dateY, { align: 'right' });

      // Row 2 - Payment due date
      doc.text(sanitizeText('Dátum splatnosti:'), labelX, dateY + 4, { align: 'left' });
      doc.text(sanitizeText(formatDate(invoice.dueDate)), rightBlockX, dateY + 4, { align: 'right' });

      // Row 3 - Delivery/Dispatch date
      doc.text(sanitizeText('Dátum dodania:'), labelX, dateY + 8, { align: 'left' });
      doc.text(sanitizeText(formatDate(invoice.dispatchDate || invoice.issueDate)), rightBlockX, dateY + 8, { align: 'right' });

      // Row 4 - Payment method
      const paymentText = invoice.paymentMethod === 'cash' ? 'Hotovosť' : 'Prevodom';
      doc.text(sanitizeText('Forma úhrady:'), labelX, dateY + 12, { align: 'left' });
      doc.text(sanitizeText(paymentText), rightBlockX, dateY + 12, { align: 'right' });
    }

    // === CLIENT SECTION (Odberatel) - Left side under header ===
    // Adjust start Y based on whether notes were shown
    let clientY = isPriceOffer && projectNotes ? 55 : 35; // Push down if notes exist
    
    doc.setFontSize(8);
    doc.setFont('Inter', 'bold');
    doc.text(sanitizeText('Odberatel'), 20, clientY);

    doc.setFontSize(8);
    doc.setFont('Inter', 'normal');
    clientY += 5;
    
    // Track vertical position for address (left) and business info (right)
    const contentStartY = clientY;
    let addressY = contentStartY;

    if (client) {
      // --- LEFT COLUMN: Address ---
      if (client.name) {
        doc.text(sanitizeText(client.name), 20, addressY);
        addressY += 4;
      }
      // Street
      if (client.street) {
        doc.text(sanitizeText(client.street), 20, addressY);
        addressY += 4;
      }
      // Additional info (apartment, suite)
      const additionalInfo = client.additionalInfo || client.second_row_street;
      if (additionalInfo) {
        doc.text(sanitizeText(additionalInfo), 20, addressY);
        addressY += 4;
      }
      // City and postal code
      const cityPostal = [client.postal_code || client.postalCode, client.city].filter(Boolean).join(' ');
      if (cityPostal) {
        doc.text(sanitizeText(cityPostal), 20, addressY);
        addressY += 4;
      }
      // Country
      if (client.country) {
        doc.text(sanitizeText(client.country), 20, addressY);
        addressY += 4;
      }

      // --- RIGHT COLUMN: Business IDs ---
      // Positioned at x=70 (moved left from 80)
      const businessX = 70; 
      
      const businessId = client.business_id || client.businessId;
      const taxId = client.tax_id || client.taxId;
      const vatId = client.vat_registration_number || client.vatId || client.vatNumber;

      // Start business info slightly lower than address start
      let businessY = contentStartY + 10;

      if (businessId || taxId || vatId) {
        if (businessId) {
          doc.text(sanitizeText(`IČO: ${businessId}`), businessX, businessY);
          businessY += 4;
        }
        if (taxId) {
          doc.text(sanitizeText(`DIČ: ${taxId}`), businessX, businessY);
          businessY += 4;
        }
        if (vatId) {
          doc.text(sanitizeText(`IČ DPH: ${vatId}`), businessX, businessY);
          businessY += 4;
        }
      }
      
      // Update global clientY to the bottom of the tallest column
      clientY = Math.max(addressY, businessY);
      
    } else {
      doc.text(sanitizeText('-'), 20, clientY);
      clientY += 4;
    }

    // === FOUR INFO BOXES - Only for Invoice ===
    let tableStartY = clientY + 10;
    let boxY = 0;
    let boxHeight = 0;

    if (!isPriceOffer) {
      boxY = clientY + 5; // Reduced gap, removed min height constraint
      const ibanBoxWidth = 52; // Wider box for IBAN
      const boxWidth = 36; // Smaller equal width for other 3 boxes
      boxHeight = 12; // Reduced height (less bottom padding)
      const boxStartX = 20;
      const gap = 3; // Gaps between boxes
      const borderRadius = 4; // Bigger border radius

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);

      // Get bank account for first box
      const contractorBankAccount = contractor?.bank_account_number || contractor?.bankAccount || '';

      // Box 1: Cislo uctu / IBAN (wider)
      doc.roundedRect(boxStartX, boxY, ibanBoxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(6);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText('Číslo účtu / IBAN'), boxStartX + 2, boxY + 4);
      doc.setFontSize(7);
      doc.setFont('Inter', 'bold');
      // Truncate IBAN if too long to fit in wider box
      const ibanDisplay = contractorBankAccount.length > 26 ? contractorBankAccount.substring(0, 26) + '...' : contractorBankAccount;
      doc.text(sanitizeText(ibanDisplay || '-'), boxStartX + 2, boxY + 8);

      // Box 2: Variabilny symbol
      const box2X = boxStartX + ibanBoxWidth + gap;
      doc.roundedRect(box2X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(6);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText('Variabilný symbol'), box2X + 2, boxY + 4);
      doc.setFontSize(7);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(invoice.invoiceNumber), box2X + 2, boxY + 8);

      // Box 3: Datum splatnosti
      const box3X = box2X + boxWidth + gap;
      doc.roundedRect(box3X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(6);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText('Dátum splatnosti'), box3X + 2, boxY + 4);
      doc.setFontSize(7);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(formatDate(invoice.dueDate)), box3X + 2, boxY + 8);

      // Box 4: Suma na uhradu
      const box4X = box3X + boxWidth + gap;
      doc.roundedRect(box4X, boxY, boxWidth, boxHeight, borderRadius, borderRadius);
      doc.setFontSize(6);
      doc.setFont('Inter', 'normal');
      doc.text(sanitizeText('Suma na úhradu'), box4X + 2, boxY + 4);
      doc.setFontSize(7);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(formatCurrency(totalWithVAT)), box4X + 2, boxY + 8);
      
      tableStartY = boxY + boxHeight + 5;
    } else {
      // For Price Offer, start table closer to client section
      tableStartY = clientY + 5;
    }

    // === ITEMS TABLE ===

    // Build detailed breakdown from project
    const tableData = [];

    // Add work items with category header
    if (projectBreakdown && projectBreakdown.items && projectBreakdown.items.length > 0) {
      tableData.push([
        { content: sanitizeText('PRACA'), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], fontSize: 7 } }
      ]);

      projectBreakdown.items.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const workCost = item.calculation?.workCost || 0;
        const pricePerUnit = quantity > 0 ? workCost / quantity : 0;
        const unit = item.calculation?.unit || item.unit || '';
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = workCost * itemVatRate;
        const displayName = item.subtitle ? `${item.name} - ${item.subtitle}` : item.name;

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)} ${unit}`),
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
        { content: sanitizeText('MATERIAL'), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], fontSize: 7 } }
      ]);

      projectBreakdown.materialItems.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const materialCost = item.calculation?.materialCost || 0;
        const pricePerUnit = quantity > 0 ? materialCost / quantity : 0;
        const unit = item.calculation?.unit || item.unit || '';
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = materialCost * itemVatRate;
        const displayName = item.subtitle ? `${item.name} - ${item.subtitle}` : item.name;

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)} ${unit}`),
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
        { content: sanitizeText('OSTATNE'), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], fontSize: 7 } }
      ]);

      projectBreakdown.othersItems.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const othersCost = item.calculation?.workCost || 0;
        const pricePerUnit = quantity > 0 ? othersCost / quantity : 0;
        const unit = item.calculation?.unit || item.unit || '';
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = othersCost * itemVatRate;
        const displayName = item.subtitle ? `${item.name} - ${item.subtitle}` : item.name;

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)} ${unit}`),
          sanitizeText(formatCurrency(pricePerUnit)),
          sanitizeText(`${Math.round(itemVatRate * 100)} %`),
          sanitizeText(formatCurrency(vatAmount)),
          sanitizeText(formatCurrency(othersCost))
        ]);
      });
    }

    // Render the items table - full width, no outer border
    autoTable(doc, {
      startY: tableStartY,
      head: [[
        sanitizeText('Popis'),
        sanitizeText('Počet'),
        sanitizeText('Cena za mj.'),
        sanitizeText('DPH(%)'),
        sanitizeText('DPH'),
        sanitizeText('Cena')
      ]],
      body: tableData,
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
      tableWidth: 170,
      margin: { left: 20, right: 20 },
      tableLineColor: [255, 255, 255],
      tableLineWidth: 0,
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' }
      },
      didDrawCell: (data) => {
        // Draw horizontal lines between rows only (no outer border)
        if (data.row.index >= 0 && data.section === 'body') {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
        // Draw line under header
        if (data.section === 'head') {
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
        
        // Draw vertical lines between columns (not on outer edges)
        if (data.column.index < data.table.columns.length - 1) {
             doc.setDrawColor(200, 200, 200); // Same gray as horizontal
             doc.setLineWidth(0.1);
             // Line on the right side of the cell
             doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      }
    });

    const finalY = doc.lastAutoTable.finalY || tableStartY + 20;

    // === TOTALS SECTION - Right aligned, with gap from table ===
    const rightX = 190;
    const totalsLabelX = rightX - 60; // More space between label and value
    let totalY = finalY + 8; // Gap from table
    const rowSpacing = 5; // Equal spacing between all rows

    doc.setFontSize(10);
    doc.setFont('Inter', 'normal');
    doc.text(sanitizeText('bez DPH:'), totalsLabelX, totalY);
    // Values are now normal font, not bold
    doc.text(sanitizeText(formatCurrency(totalWithoutVAT)), rightX, totalY, { align: 'right' });

    totalY += rowSpacing;
    // doc.setFont('Inter', 'normal'); // Already normal
    doc.text(sanitizeText('DPH:'), totalsLabelX, totalY);
    // Values are now normal font, not bold
    doc.text(sanitizeText(formatCurrency(vat)), rightX, totalY, { align: 'right' });

    totalY += rowSpacing;
    doc.setFontSize(11);
    doc.setFont('Inter', 'bold');
    doc.text(sanitizeText('Celková cena:'), totalsLabelX, totalY);
    doc.text(sanitizeText(formatCurrency(totalWithVAT)), rightX, totalY, { align: 'right' });

    // === SIGNATURE SECTION ===
    const signatureY = totalY + 12; // Proportionally moved down
    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');
    doc.text(sanitizeText('Vystavila:'), rightX - 40, signatureY);

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

    // Column 1: Name with user icon
    if (contractor?.name) {
      drawIcon('user', col1, topRowY, 3);
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(contractor.name), col1 + 5, topRowY);
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

    // Column 1: Address
    const contractorStreet = contractor?.street;
    const contractorAdditional = contractor?.second_row_street || contractor?.additionalInfo;
    const contractorCity = contractor?.city;
    const contractorPostal = contractor?.postal_code || contractor?.postalCode;
    const contractorCountry = contractor?.country;

    let col1Y = colY;
    if (contractor?.name) {
      doc.setFont('Inter', 'bold');
      doc.text(sanitizeText(contractor.name), col1X, col1Y);
      doc.setFont('Inter', 'normal');
      col1Y += 4;
    }
    if (contractorStreet) {
      doc.text(sanitizeText(contractorStreet), col1X, col1Y);
      col1Y += 3.5;
    }
    if (contractorAdditional) {
      doc.text(sanitizeText(contractorAdditional), col1X, col1Y);
      col1Y += 3.5;
    }
    const cityLine = [contractorPostal, contractorCity].filter(Boolean).join(' ');
    if (cityLine) {
      doc.text(sanitizeText(cityLine), col1X, col1Y);
      col1Y += 3.5;
    }
    if (contractorCountry) {
      doc.text(sanitizeText(contractorCountry), col1X, col1Y);
    }

    // Column 2: Business IDs (ICO, DIC, IC DPH)
    const contractorBusinessId = contractor?.business_id || contractor?.businessId;
    const contractorTaxId = contractor?.tax_id || contractor?.taxId;
    const contractorVatId = contractor?.vat_registration_number || contractor?.vatNumber;

    let col2Y = colY;
    if (contractorBusinessId) {
      doc.text(sanitizeText(`ICO: ${contractorBusinessId}`), col2X, col2Y);
      col2Y += 3.5;
    }
    if (contractorTaxId) {
      doc.text(sanitizeText(`DIC: ${contractorTaxId}`), col2X, col2Y);
      col2Y += 3.5;
    }
    if (contractorVatId) {
      doc.text(sanitizeText(`IC DPH: ${contractorVatId}`), col2X, col2Y);
    }

    // Column 3: Bank info (Spisova vlozka, IBAN, SWIFT)
    const legalNotice = contractor?.legal_notice || contractor?.legalAppendix;
    const bankAccount = contractor?.bank_account_number || contractor?.bankAccount;
    const swiftCode = contractor?.swift_code || contractor?.bankCode;

    let col3Y = colY;
    if (legalNotice) {
      doc.text(sanitizeText(`Spisova vlozka: ${legalNotice}`), col3X, col3Y);
      col3Y += 3.5;
    }
    if (bankAccount) {
      doc.text(sanitizeText(`IBAN: ${bankAccount}`), col3X, col3Y);
      col3Y += 3.5;
    }
    if (swiftCode) {
      doc.text(sanitizeText(`SWIFT kod: ${swiftCode}`), col3X, col3Y);
    }

    // App attribution - bottom center
    doc.setFontSize(6);
    doc.text(sanitizeText('Vytvorene aplikaciou Fido Building Calcul.'), 105, 290, { align: 'center' });

    // Open PDF in new tab
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');

    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generatePriceOfferPDF = (params) => {
  return generateInvoicePDF({
    ...params,
    options: {
      isPriceOffer: true,
      projectNotes: params.projectNotes || '',
      projectNumber: params.projectNumber,
      offerValidityPeriod: params.offerValidityPeriod
    }
  });
};
