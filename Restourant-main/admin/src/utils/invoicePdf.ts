import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '../types';
import { getPrintSettings, PrintAndBillSettings } from './printSettings';

export interface InvoicePrintOptions {
  download?: boolean;
  autoPrint?: boolean;
  fileName?: string;
  customSettings?: PrintAndBillSettings;
}

/**
 * Generates an exact 80mm Thermal Receipt POS Slip in PDF format.
 * Matches the printed thermal receipt layout 100% (branding, dashed dividers,
 * metadata rows, itemized rates & totals, GST breakdown, solid total border, and footer).
 */
export function generateThermalReceiptPdf(
  bill: Bill,
  settings: PrintAndBillSettings,
  options: InvoicePrintOptions = { download: true }
): jsPDF {
  const slipWidth = 80; // Standard 80mm roll width
  const itemCount = (bill.items || []).length;
  
  // Calculate dynamic height so receipt is continuous without broken page breaks
  let estimatedHeight = 90 + itemCount * 7.5;
  if (settings.showGstin) estimatedHeight += 6;
  if (settings.showCustomer && bill.customerName) estimatedHeight += 4;
  if (settings.showTaxBreakdown) estimatedHeight += 8;
  if (settings.showServiceCharge && bill.serviceCharge > 0) estimatedHeight += 4;
  if (bill.discountAmount > 0) estimatedHeight += 4;
  if (bill.roundOff !== 0) estimatedHeight += 4;
  if (bill.paidAmount > 0 || bill.status === 'PAID') estimatedHeight += 6;
  if (settings.showFooterNote) estimatedHeight += 12;
  const pageHeight = Math.max(125, estimatedHeight);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [slipWidth, pageHeight]
  });

  const marginX = 4;
  const rightX = slipWidth - marginX;
  const centerX = slipWidth / 2;
  let currentY = 7;

  // 1. Restaurant Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(184, 115, 29); // Bhatigal Amber #b8731d
  doc.text((settings.restaurantName || 'BHATIGAL BHANU').toUpperCase(), centerX, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(settings.tagline || 'Traditional Kathiyawadi Dining', centerX, currentY, { align: 'center' });

  currentY += 3.8;
  doc.setFontSize(6.8);
  doc.setTextColor(100, 100, 100);
  doc.text(settings.address || 'Kothariya Ring Road, Rajkot - 360022', centerX, currentY, { align: 'center' });

  if (settings.showGstin) {
    currentY += 3.5;
    const gstinText = `GSTIN: ${settings.gstin || '24AAAFB1234A1Z8'} | Ph: ${settings.phone || '+91 98790 12345'}`;
    doc.text(gstinText, centerX, currentY, { align: 'center' });
  }

  // 2. Status Badge (PAID TAX INVOICE vs UNPAID INVOICE)
  currentY += 4.5;
  const isPaid = bill.status === 'PAID';
  doc.setFillColor(isPaid ? 25 : 220, isPaid ? 135 : 53, isPaid ? 84 : 69);
  doc.roundedRect(centerX - 18, currentY - 3, 36, 4.8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(255, 255, 255);
  doc.text(isPaid ? 'PAID TAX INVOICE' : 'UNPAID INVOICE', centerX, currentY + 0.5, { align: 'center' });

  // Divider line
  currentY += 4;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(marginX, currentY, rightX, currentY);

  // 3. Metadata Rows
  currentY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  doc.text('Bill No:', marginX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${bill.billNumber}`, marginX + 11, currentY);

  if (settings.showTable) {
    doc.setFont('helvetica', 'bold');
    doc.text('Table:', centerX + 4, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bill.tableNumber || 'Dine-In'}`, centerX + 12, currentY);
  }

  currentY += 3.5;
  const billDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const formattedDate = `${billDate.getDate()}/${billDate.getMonth() + 1}/${billDate.getFullYear()}`;
  const formattedTime = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', marginX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formattedDate}`, marginX + 11, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text('Time:', centerX + 4, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formattedTime}`, centerX + 12, currentY);

  if (settings.showCustomer && bill.customerName) {
    currentY += 3.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Guest:', marginX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bill.customerName}`, marginX + 11, currentY);

    doc.setFont('helvetica', 'bold');
    doc.text('Status:', centerX + 4, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bill.status}`, centerX + 14, currentY);
  }

  // Divider line
  currentY += 3;
  doc.line(marginX, currentY, rightX, currentY);

  // 4. Items List (Matches thermal printer slip format)
  currentY += 3.5;
  (bill.items || []).forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    // Truncate item name if too long
    const itemText = item.itemName.length > 25 ? item.itemName.substring(0, 23) + '..' : item.itemName;
    doc.text(itemText, marginX, currentY);

    doc.text(`₹${Number(item.totalPrice).toFixed(2)}`, rightX, currentY, { align: 'right' });

    currentY += 3.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`${item.quantity} × ₹${Number(item.unitPrice).toFixed(2)}`, marginX, currentY);
    currentY += 3.5;
  });

  // Divider line
  doc.line(marginX, currentY, rightX, currentY);
  currentY += 3.5;

  // 5. Financial Summary Rows
  const drawSlipRow = (label: string, value: string, bold = false, textColor = [60, 60, 60]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(label, marginX, currentY);
    doc.text(value, rightX, currentY, { align: 'right' });
    currentY += 3.3;
  };

  drawSlipRow('Subtotal:', `₹${Number(bill.subtotal).toFixed(2)}`);

  if (bill.discountAmount > 0) {
    drawSlipRow('Discount:', `-₹${Number(bill.discountAmount).toFixed(2)}`, false, [220, 53, 69]);
  }

  if (settings.showTaxBreakdown) {
    const halfTax = (bill.taxAmount || 0) / 2;
    drawSlipRow('CGST (2.5%):', `₹${halfTax.toFixed(2)}`);
    drawSlipRow('SGST (2.5%):', `₹${halfTax.toFixed(2)}`);
  }

  if (settings.showServiceCharge && bill.serviceCharge > 0) {
    drawSlipRow('Service Charge:', `₹${Number(bill.serviceCharge).toFixed(2)}`);
  }

  if (bill.roundOff !== 0) {
    drawSlipRow('Round Off:', `${bill.roundOff > 0 ? '+' : ''}₹${Number(bill.roundOff).toFixed(2)}`);
  }

  // Solid Lines for Grand Total
  currentY += 0.5;
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, rightX, currentY);
  currentY += 4.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(10, 10, 10);
  doc.text('GRAND TOTAL:', marginX, currentY);
  doc.text(`₹${Number(bill.totalPayable).toFixed(2)}`, rightX, currentY, { align: 'right' });

  currentY += 2;
  doc.line(marginX, currentY, rightX, currentY);
  currentY += 3.5;

  if (bill.status === 'PAID') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(25, 135, 84);
    doc.text('Amount Paid:', marginX, currentY);
    doc.text(`₹${Number(bill.paidAmount || bill.totalPayable).toFixed(2)}`, rightX, currentY, { align: 'right' });
    currentY += 3.5;
  } else if (bill.balanceAmount > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(220, 53, 69);
    doc.text('Balance Due:', marginX, currentY);
    doc.text(`₹${Number(bill.balanceAmount).toFixed(2)}`, rightX, currentY, { align: 'right' });
    currentY += 3.5;
  }

  // Divider line
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(marginX, currentY, rightX, currentY);

  // 6. Footer Thank You Note
  if (settings.showFooterNote) {
    currentY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 90, 90);
    const footerText = settings.customFooterText || 'Thank you for dining with us! Please Visit Again 🙏';
    doc.text(footerText, centerX, currentY, { align: 'center' });
  }

  // Handle Download / AutoPrint
  if (options.download !== false) {
    const fileName = options.fileName || `${bill.billNumber || 'INVOICE'}_Receipt.pdf`;
    doc.save(fileName);
  }

  if (options.autoPrint) {
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.src = blobUrl;
    document.body.appendChild(printFrame);
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        window.open(blobUrl, '_blank');
      }
    };
  }

  return doc;
}

/**
 * Standard Full-page A4 Tax Invoice PDF
 */
export function generateA4InvoicePdf(
  bill: Bill,
  settings: PrintAndBillSettings,
  options: InvoicePrintOptions = { download: true }
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 18;

  // 1. Restaurant Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(212, 139, 40); // Bhatigal Bhanu Gold
  doc.text(settings.restaurantName || 'BHATIGAL BHANU', pageWidth / 2, currentY, { align: 'center' });

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(settings.tagline || 'Traditional Kathiyawadi & Gujarati Dining Experience', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(settings.address || 'Kothariya Ring Road, Rajkot, Gujarat - 360022', pageWidth / 2, currentY, { align: 'center' });

  if (settings.showGstin) {
    currentY += 4.5;
    doc.text(`GSTIN: ${settings.gstin || '24AAAFB1234A1Z8'} | FSSAI: ${settings.fssai || '10724026000123'} | Phone: ${settings.phone || '+91 98790 12345'}`, pageWidth / 2, currentY, { align: 'center' });
  }

  currentY += 6;
  doc.setDrawColor(212, 139, 40);
  doc.setLineWidth(0.8);
  doc.line(14, currentY, pageWidth - 14, currentY);

  currentY += 7;
  // Tax Invoice Tag
  doc.setFillColor(248, 245, 238);
  doc.roundedRect(pageWidth / 2 - 28, currentY - 4.5, 56, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 30, 30);
  doc.text('ORIGINAL TAX INVOICE', pageWidth / 2, currentY, { align: 'center' });

  currentY += 8;

  // 2. Invoice Meta Box
  const billDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const formattedDate = billDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);

  // Left column
  doc.text(`Invoice No:`, 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${bill.billNumber}`, 36, currentY);

  if (settings.showTable) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Table No:`, 14, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bill.tableNumber || 'Dine-In / Counter'}`, 36, currentY + 5);
  }

  if (settings.showCustomer) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Customer:`, 14, currentY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${bill.customerName || 'Walk-in Guest'}`, 36, currentY + 10);
  }

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text(`Date:`, pageWidth - 65, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formattedDate}`, pageWidth - 45, currentY);

  doc.setFont('helvetica', 'bold');
  doc.text(`Time:`, pageWidth - 65, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formattedTime}`, pageWidth - 45, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text(`Status:`, pageWidth - 65, currentY + 10);
  doc.setFont('helvetica', 'bold');
  if (bill.status === 'PAID') {
    doc.setTextColor(25, 135, 84); // Green
    doc.text('PAID (SETTLED)', pageWidth - 45, currentY + 10);
  } else if (bill.status === 'PARTIALLY_PAID') {
    doc.setTextColor(255, 193, 7); // Yellow
    doc.text('PARTIALLY PAID', pageWidth - 45, currentY + 10);
  } else {
    doc.setTextColor(220, 53, 69); // Red
    doc.text('UNPAID', pageWidth - 45, currentY + 10);
  }

  currentY += 15;

  // 3. Items Table using jspdf-autotable
  const tableRows = (bill.items || []).map((it, idx) => [
    idx + 1,
    it.itemName,
    it.quantity,
    `₹${Number(it.unitPrice).toFixed(2)}`,
    `₹${Number(it.totalPrice).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [212, 139, 40],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: [30, 30, 30]
    },
    alternateRowStyles: {
      fillColor: [253, 251, 247]
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // 4. Financial Calculations Summary Box
  const summaryX = pageWidth - 80;
  let sumY = finalY;

  const drawRow = (label: string, value: string, isBold = false, isDanger = false, isTotal = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 11 : 9);
    doc.setTextColor(isDanger ? 220 : 50, isDanger ? 53 : 50, isDanger ? 69 : 50);
    doc.text(label, summaryX, sumY);
    doc.text(value, pageWidth - 14, sumY, { align: 'right' });
    sumY += isTotal ? 6.5 : 4.8;
  };

  drawRow('Subtotal:', `₹${Number(bill.subtotal).toFixed(2)}`);

  if (bill.discountAmount > 0) {
    drawRow('Discount:', `-₹${Number(bill.discountAmount).toFixed(2)}`, false, true);
  }

  if (settings.showTaxBreakdown) {
    const halfTax = (bill.taxAmount || 0) / 2;
    drawRow('CGST (2.5%):', `₹${halfTax.toFixed(2)}`);
    drawRow('SGST (2.5%):', `₹${halfTax.toFixed(2)}`);
  }

  if (settings.showServiceCharge && bill.serviceCharge > 0) {
    drawRow('Service Charge:', `₹${Number(bill.serviceCharge).toFixed(2)}`);
  }

  if (bill.roundOff !== 0) {
    drawRow('Round Off:', `${bill.roundOff > 0 ? '+' : ''}₹${Number(bill.roundOff).toFixed(2)}`);
  }

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(summaryX, sumY - 1, pageWidth - 14, sumY - 1);
  sumY += 2;

  // Grand Total
  drawRow('Grand Total:', `₹${Number(bill.totalPayable).toFixed(2)}`, true, false, true);

  if (bill.paidAmount > 0 || bill.status === 'PAID') {
    const paidAmt = bill.status === 'PAID' ? (bill.paidAmount || bill.totalPayable) : bill.paidAmount;
    drawRow('Amount Paid:', `₹${Number(paidAmt).toFixed(2)}`, true);
    if (bill.balanceAmount > 0 && bill.status !== 'PAID') {
      drawRow('Balance Due:', `₹${Number(bill.balanceAmount).toFixed(2)}`, true, true);
    }
  }

  // 5. Footer & Terms
  const footerY = Math.max(sumY + 12, 260);
  doc.setDrawColor(220, 220, 220);
  doc.line(14, footerY, pageWidth - 14, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(settings.customFooterText || 'Thank you for dining with Bhatigal Bhanu! Please visit again.', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text('This is a computer-generated tax invoice and does not require a physical signature.', pageWidth / 2, footerY + 9, { align: 'center' });

  if (options.download !== false) {
    const fileName = options.fileName || `${bill.billNumber || 'INVOICE'}.pdf`;
    doc.save(fileName);
  }

  return doc;
}

/**
 * Universal PDF Generator:
 * Generates an exact 80mm Thermal Receipt PDF by default (matching print format 1:1),
 * or standard A4 if preferred in settings.
 */
export function generateInvoicePdf(bill: Bill, options: InvoicePrintOptions = { download: true }): jsPDF {
  const settings = options.customSettings || getPrintSettings();
  if (settings.printReceiptFormat === 'A4') {
    return generateA4InvoicePdf(bill, settings, options);
  }
  return generateThermalReceiptPdf(bill, settings, options);
}

/**
 * Universal Native Receipt Printer:
 * Formats an 80mm thermal receipt and triggers window.print() immediately.
 * Injects point-to-point customizable settings (branding, GSTIN, table, taxes, copies).
 */
export function printInvoiceReceipt(bill: Bill, customSettings?: PrintAndBillSettings): void {
  const settings = customSettings || getPrintSettings();
  const printWindow = window.open('', '_blank', 'width=450,height=650,location=no,toolbar=no');
  if (!printWindow) {
    // If popup blocked, fallback to PDF auto-print
    generateInvoicePdf(bill, { autoPrint: true, download: false, customSettings: settings });
    return;
  }

  const billDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const formattedDate = `${billDate.getDate()}/${billDate.getMonth() + 1}/${billDate.getFullYear()}`;
  const formattedTime = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const renderSingleReceipt = (copyLabel?: string) => `
    <div class="receipt">
      ${copyLabel ? `<div class="copy-badge text-center">--- ${copyLabel} ---</div>` : ''}
      <div class="text-center">
        ${settings.showLogo ? `<img src="/logo.jpg" style="width: 58px; height: 58px; border-radius: 50%; border: 2px solid #D48B28; margin: 0 auto 6px auto; display: block; object-fit: contain;" />` : ''}
        <h1 class="brand-title">${settings.restaurantName || 'BHATIGAL BHANU'}</h1>
        <p class="brand-sub">${settings.tagline || 'Traditional Kathiyawadi & Gujarati Dining'}</p>
        <p style="font-size: 10.5px; color: #666; margin: 1px 0;">${settings.address || 'Kothariya Ring Road, Rajkot, Gujarat - 360022'}</p>
        ${settings.showGstin ? `<p style="font-size: 10.5px; color: #666; margin: 1px 0;">GSTIN: ${settings.gstin || '24AAAFB1234A1Z8'} | ${settings.phone || '+91 98790 12345'}</p>` : ''}
        <div>
          <span class="${bill.status === 'PAID' ? 'paid-tag' : 'unpaid-tag'}">
            ${bill.status === 'PAID' ? 'PAID TAX INVOICE' : 'UNPAID INVOICE'}
          </span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="meta-row">
        <span><strong>Bill No:</strong> ${bill.billNumber}</span>
        ${settings.showTable ? `<span><strong>Table:</strong> ${bill.tableNumber || 'Dine-In'}</span>` : ''}
      </div>
      <div class="meta-row">
        <span><strong>Date:</strong> ${formattedDate}</span>
        <span><strong>Time:</strong> ${formattedTime}</span>
      </div>
      ${settings.showCustomer && bill.customerName ? `
        <div class="meta-row">
          <span><strong>Guest:</strong> ${bill.customerName}</span>
          <span><strong>Status:</strong> ${bill.status}</span>
        </div>
      ` : ''}

      <div class="divider"></div>

      <table class="items">
        ${(bill.items || []).map(it => `
          <tr>
            <td style="padding: 3px 0; text-align: left;">
              <div style="font-weight: 700; color: #111;">${it.itemName}</div>
              <small style="color: #666; font-size: 11px;">${it.quantity} × ₹${Number(it.unitPrice).toFixed(2)}</small>
            </td>
            <td style="padding: 3px 0; text-align: right; vertical-align: top; font-weight: 700; color: #111;">
              ₹${Number(it.totalPrice).toFixed(2)}
            </td>
          </tr>
        `).join('')}
      </table>

      <div class="divider"></div>

      <div class="total-row">
        <span>Subtotal:</span>
        <span>₹${Number(bill.subtotal).toFixed(2)}</span>
      </div>
      ${bill.discountAmount > 0 ? `
        <div class="total-row" style="color: #dc3545;">
          <span>Discount:</span>
          <span>-₹${Number(bill.discountAmount).toFixed(2)}</span>
        </div>
      ` : ''}
      ${settings.showTaxBreakdown ? `
        <div class="total-row">
          <span>CGST (2.5%):</span>
          <span>₹${((bill.taxAmount || 0) / 2).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>SGST (2.5%):</span>
          <span>₹${((bill.taxAmount || 0) / 2).toFixed(2)}</span>
        </div>
      ` : ''}
      ${settings.showServiceCharge && bill.serviceCharge > 0 ? `
        <div class="total-row">
          <span>Service Charge:</span>
          <span>₹${Number(bill.serviceCharge).toFixed(2)}</span>
        </div>
      ` : ''}
      ${bill.roundOff !== 0 ? `
        <div class="total-row">
          <span>Round Off:</span>
          <span>${bill.roundOff > 0 ? '+' : ''}₹${Number(bill.roundOff).toFixed(2)}</span>
        </div>
      ` : ''}

      <div class="total-row grand-total">
        <span>GRAND TOTAL:</span>
        <span>₹${Number(bill.totalPayable).toFixed(2)}</span>
      </div>

      ${bill.status === 'PAID' ? `
        <div class="total-row" style="margin-top: 5px; font-weight: 700; color: #198754; font-size: 13.5px;">
          <span>Amount Paid:</span>
          <span>₹${Number(bill.paidAmount || bill.totalPayable).toFixed(2)}</span>
        </div>
      ` : bill.balanceAmount > 0 ? `
        <div class="total-row" style="margin-top: 5px; font-weight: 700; color: #dc3545; font-size: 13.5px;">
          <span>Balance Due:</span>
          <span>₹${Number(bill.balanceAmount).toFixed(2)}</span>
        </div>
      ` : ''}

      <div class="divider"></div>

      ${settings.showFooterNote ? `
        <div class="text-center" style="font-size: 11px; color: #666; margin-top: 8px;">
          <p style="margin: 2px 0;">${settings.customFooterText || 'Thank you for dining with us! Please Visit Again 🙏'}</p>
        </div>
      ` : ''}
    </div>
  `;

  let fullBodyHtml = renderSingleReceipt(settings.copiesCount === 2 ? 'CUSTOMER COPY' : undefined);
  if (settings.copiesCount === 2) {
    fullBodyHtml += `
      <div style="page-break-before: always; margin-top: 20px;"></div>
      ${renderSingleReceipt('MERCHANT / KITCHEN COPY')}
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - ${bill.billNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 12px;
            color: #111;
            font-size: 12.5px;
            line-height: 1.35;
          }
          .receipt {
            max-width: 320px;
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .brand-title {
            font-size: 19px;
            font-weight: 800;
            color: #b8731d;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .brand-sub {
            font-size: 11px;
            color: #555;
            margin: 2px 0;
          }
          .copy-badge {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #777;
            margin-bottom: 6px;
          }
          .divider {
            border-top: 1px solid #e0e0e0;
            margin: 8px 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 11.5px;
            margin: 2.5px 0;
          }
          table.items {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin: 3px 0;
            color: #555;
          }
          .grand-total {
            font-size: 16.5px;
            font-weight: 800;
            border-top: 1.5px solid #111;
            border-bottom: 1.5px solid #111;
            padding: 6px 0;
            margin-top: 6px;
            color: #111;
          }
          .paid-tag {
            display: inline-block;
            background: #198754;
            color: #fff;
            padding: 3px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-top: 6px;
          }
          .unpaid-tag {
            display: inline-block;
            background: #dc3545;
            color: #fff;
            padding: 3px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        ${fullBodyHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
