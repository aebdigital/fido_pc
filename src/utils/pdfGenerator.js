import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to sanitize text for PDF
const sanitizeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/č/g, 'c').replace(/Č/g, 'C')
    .replace(/ď/g, 'd').replace(/Ď/g, 'D')
    .replace(/ě/g, 'e').replace(/Ě/g, 'E')
    .replace(/ň/g, 'n').replace(/Ň/g, 'N')
    .replace(/ř/g, 'r').replace(/Ř/g, 'R')
    .replace(/š/g, 's').replace(/Š/g, 'S')
    .replace(/ť/g, 't').replace(/Ť/g, 'T')
    .replace(/ů/g, 'u').replace(/Ů/g, 'U')
    .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
    .replace(/á/g, 'a').replace(/Á/g, 'A')
    .replace(/é/g, 'e').replace(/É/g, 'E')
    .replace(/í/g, 'i').replace(/Í/g, 'I')
    .replace(/ó/g, 'o').replace(/Ó/g, 'O')
    .replace(/ú/g, 'u').replace(/Ú/g, 'U')
    .replace(/ý/g, 'y').replace(/Ý/g, 'Y')
    .replace(/ô/g, 'o').replace(/Ô/g, 'O')
    .replace(/ľ/g, 'l').replace(/Ľ/g, 'L')
    .replace(/ĺ/g, 'l').replace(/Ĺ/g, 'L')
    .replace(/ŕ/g, 'r').replace(/Ŕ/g, 'R');
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
  formatPrice
}) => {
  try {
    const doc = new jsPDF();
    doc.setFont('helvetica');

    // Invoice number and project name - left side
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(`Faktura ${invoice.invoiceNumber}`), 20, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeText(`Cenova ponuka ${invoice.projectName || ''}`), 20, 27);

    // Date info - right side
    doc.setFontSize(9);
    doc.text(sanitizeText(`Datum vystavenia: ${formatDate(invoice.issueDate)}`), 200, 20, { align: 'right' });
    doc.text(sanitizeText(`Datum dodania: ${formatDate(invoice.issueDate)}`), 200, 25, { align: 'right' });
    const paymentText = invoice.paymentMethod === 'cash' ? 'Hotovost' : 'Prevodom';
    doc.text(sanitizeText(`Forma uhrady: ${paymentText}`), 200, 30, { align: 'right' });

    // Three info boxes
    const boxY = 40;
    const boxWidth = 56;
    const boxHeight = 18;
    const gap = 6;

    // Box 1: Variabilny symbol
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, boxY, boxWidth, boxHeight, 3, 3);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeText('Variabilny symbol'), 22, boxY + 6);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(invoice.invoiceNumber), 22, boxY + 13);

    // Box 2: Datum splatnosti
    doc.roundedRect(20 + boxWidth + gap, boxY, boxWidth, boxHeight, 3, 3);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeText('Datum splatnosti'), 22 + boxWidth + gap, boxY + 6);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(formatDate(invoice.dueDate)), 22 + boxWidth + gap, boxY + 13);

    // Box 3: Suma na uhradu
    doc.roundedRect(20 + (boxWidth + gap) * 2, boxY, boxWidth, boxHeight, 3, 3);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeText('Suma na uhradu'), 22 + (boxWidth + gap) * 2, boxY + 6);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(formatPrice(totalWithVAT) + ' €'), 22 + (boxWidth + gap) * 2, boxY + 13);

    // Build detailed breakdown from project
    const tableData = [];

    // Add work items with category header
    if (projectBreakdown && projectBreakdown.items && projectBreakdown.items.length > 0) {
      // Add work category header
      tableData.push([
        { content: sanitizeText('PRACA'), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]);

      projectBreakdown.items.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const workCost = item.calculation?.workCost || 0;
        const pricePerUnit = quantity > 0 ? workCost / quantity : 0;
        const unit = item.calculation?.unit || item.unit || '';
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = workCost * itemVatRate;

        // Display name with subtitle if available
        const displayName = item.subtitle ? `${item.name} - ${item.subtitle}` : item.name;

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)} ${unit}`),
          sanitizeText(formatPrice(pricePerUnit) + ' €'),
          sanitizeText(`${Math.round(itemVatRate * 100)} %`),
          sanitizeText(formatPrice(vatAmount) + ' €'),
          sanitizeText(formatPrice(workCost) + ' €')
        ]);
      });
    }

    // Add material items with category header
    if (projectBreakdown && projectBreakdown.materialItems && projectBreakdown.materialItems.length > 0) {
      // Add material category header
      tableData.push([
        { content: sanitizeText('MATERIAL'), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]);

      projectBreakdown.materialItems.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const materialCost = item.calculation?.materialCost || 0;
        const pricePerUnit = quantity > 0 ? materialCost / quantity : 0;
        const unit = item.calculation?.unit || item.unit || '';
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = materialCost * itemVatRate;

        // Display name with subtitle if available
        const displayName = item.subtitle ? `${item.name} - ${item.subtitle}` : item.name;

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)} ${unit}`),
          sanitizeText(formatPrice(pricePerUnit) + ' €'),
          sanitizeText(`${Math.round(itemVatRate * 100)} %`),
          sanitizeText(formatPrice(vatAmount) + ' €'),
          sanitizeText(formatPrice(materialCost) + ' €')
        ]);
      });
    }

    // Add others items with category header
    if (projectBreakdown && projectBreakdown.othersItems && projectBreakdown.othersItems.length > 0) {
      // Add others category header
      tableData.push([
        { content: sanitizeText('OSTATNE'), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]);

      projectBreakdown.othersItems.forEach(item => {
        const quantity = item.calculation?.quantity || 0;
        const othersCost = item.calculation?.workCost || 0;
        const pricePerUnit = quantity > 0 ? othersCost / quantity : 0;
        const unit = item.calculation?.unit || item.unit || '';
        const itemVatRate = (item.vatRate !== undefined && item.vatRate !== null) ? item.vatRate : vatRate;
        const vatAmount = othersCost * itemVatRate;

        // Display name with subtitle if available
        const displayName = item.subtitle ? `${item.name} - ${item.subtitle}` : item.name;

        tableData.push([
          sanitizeText(displayName || ''),
          sanitizeText(`${quantity.toFixed(2)} ${unit}`),
          sanitizeText(formatPrice(pricePerUnit) + ' €'),
          sanitizeText(`${Math.round(itemVatRate * 100)} %`),
          sanitizeText(formatPrice(vatAmount) + ' €'),
          sanitizeText(formatPrice(othersCost) + ' €')
        ]);
      });
    }

    // Items table
    autoTable(doc, {
      startY: boxY + boxHeight + 10,
      head: [[
        sanitizeText('Popis'),
        sanitizeText('Pocet'),
        sanitizeText('Cena za mj.'),
        sanitizeText('DPH(%)'),
        sanitizeText('DPH'),
        sanitizeText('Cena')
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY || 60;

    // Right-aligned totals below table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const rightX = 200;
    let totalY = finalY + 10;

    doc.text(sanitizeText('bez DPH:'), rightX - 50, totalY, { align: 'left' });
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(formatPrice(totalWithoutVAT) + ' €'), rightX, totalY, { align: 'right' });

    totalY += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(sanitizeText('DPH:'), rightX - 50, totalY, { align: 'left' });
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(formatPrice(vat) + ' €'), rightX, totalY, { align: 'right' });

    totalY += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText('Celkova cena:'), rightX - 50, totalY, { align: 'left' });
    doc.text(sanitizeText(formatPrice(totalWithVAT) + ' €'), rightX, totalY, { align: 'right' });

    // Divider line at bottom
    const dividerY = 260;
    doc.setLineWidth(0.5);
    doc.line(20, dividerY, 190, dividerY);

    // Contractor info - bottom left
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(contractor?.name || ''), 20, dividerY + 7);
    doc.setFont('helvetica', 'normal');
    if (contractor?.email) {
      doc.text(sanitizeText(contractor.email), 20, dividerY + 12);
    }
    if (contractor?.phone) {
      doc.text(sanitizeText(contractor.phone), 20, dividerY + 17);
    }

    // Footer - bottom right
    doc.setFontSize(8);
    doc.text(sanitizeText('Vytvorene aplikaciou Fido Building Calcul.'), 200, dividerY + 12, { align: 'right' });

    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
