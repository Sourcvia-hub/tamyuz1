import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to format currency
const formatCurrency = (amount, currency = 'SAR') => {
  if (!amount && amount !== 0) return 'N/A';
  return `${currency} ${Number(amount).toLocaleString()}`;
};

// Common PDF header
const addHeader = (doc, title, subtitle) => {
  // Header background
  doc.setFillColor(37, 99, 235); // Blue
  doc.rect(0, 0, 210, 35, 'F');
  
  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Sourcevia', 14, 15);
  
  // Document title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 25);
  
  // Document number/subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, 14, 32);
  }
  
  // Date on right side
  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate(new Date())}`, 196, 15, { align: 'right' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  return 45; // Return Y position after header
};

// Add section title
const addSectionTitle = (doc, title, y) => {
  doc.setFillColor(243, 244, 246); // Light gray
  doc.rect(14, y - 5, 182, 8, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text(title, 16, y);
  doc.setTextColor(0, 0, 0);
  return y + 8;
};

// Add key-value pair
const addField = (doc, label, value, x, y, width = 80) => {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 114, 128);
  doc.text(label, x, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  const displayValue = value || 'N/A';
  const lines = doc.splitTextToSize(String(displayValue), width - 5);
  doc.text(lines, x, y + 5);
  
  return y + 5 + (lines.length * 4);
};

// Export Vendor to PDF
export const exportVendorToPDF = (vendor) => {
  const doc = new jsPDF();
  
  let y = addHeader(doc, 'Vendor Profile', vendor.vendor_number);
  
  // Basic Information
  y = addSectionTitle(doc, 'Basic Information', y);
  y += 5;
  
  const col1X = 14;
  const col2X = 110;
  
  let y1 = addField(doc, 'Vendor Number', vendor.vendor_number, col1X, y);
  let y2 = addField(doc, 'Status', (vendor.status || '').toUpperCase(), col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Name (English)', vendor.name_english || vendor.commercial_name, col1X, y);
  y2 = addField(doc, 'Name (Arabic)', vendor.name_arabic, col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Vendor Type', vendor.vendor_type, col1X, y);
  y2 = addField(doc, 'CR Number', vendor.cr_number, col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'VAT Number', vendor.vat_number, col1X, y);
  y2 = addField(doc, 'Risk Level', vendor.risk_level, col2X, y);
  y = Math.max(y1, y2) + 8;
  
  // Contact Information
  y = addSectionTitle(doc, 'Contact Information', y);
  y += 5;
  
  y1 = addField(doc, 'Email', vendor.email, col1X, y);
  y2 = addField(doc, 'Mobile', vendor.mobile, col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Landline', vendor.landline, col1X, y);
  y2 = addField(doc, 'Fax', vendor.fax, col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Website', vendor.website, col1X, y);
  y = y1 + 8;
  
  // Address
  y = addSectionTitle(doc, 'Address', y);
  y += 5;
  
  y1 = addField(doc, 'Country', vendor.country, col1X, y);
  y2 = addField(doc, 'City', vendor.city, col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'District', vendor.district, col1X, y);
  y2 = addField(doc, 'Street', vendor.street, col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Building', vendor.building_number, col1X, y);
  y2 = addField(doc, 'Postal Code', vendor.postal_code, col2X, y);
  y = Math.max(y1, y2) + 8;
  
  // Bank Information
  y = addSectionTitle(doc, 'Bank Information', y);
  y += 5;
  
  y1 = addField(doc, 'Bank Name', vendor.bank_name, col1X, y);
  y2 = addField(doc, 'IBAN', vendor.iban, col2X, y);
  y = Math.max(y1, y2) + 3;
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('This document is auto-generated from Sourcevia Procurement System', 105, 285, { align: 'center' });
  
  doc.save(`Vendor_${vendor.vendor_number}.pdf`);
};

// Export Contract to PDF
export const exportContractToPDF = (contract, vendor) => {
  const doc = new jsPDF();
  
  let y = addHeader(doc, 'Contract Document', contract.contract_number);
  
  // Contract Details
  y = addSectionTitle(doc, 'Contract Details', y);
  y += 5;
  
  const col1X = 14;
  const col2X = 110;
  
  let y1 = addField(doc, 'Contract Number', contract.contract_number, col1X, y);
  let y2 = addField(doc, 'Status', (contract.status || '').toUpperCase(), col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Title', contract.title, col1X, y, 170);
  y = y1 + 3;
  
  y1 = addField(doc, 'Contract Type', contract.contract_type, col1X, y);
  y2 = addField(doc, 'Contract Value', formatCurrency(contract.value), col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Start Date', formatDate(contract.start_date), col1X, y);
  y2 = addField(doc, 'End Date', formatDate(contract.end_date), col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Payment Terms', contract.payment_terms, col1X, y);
  y2 = addField(doc, 'Currency', contract.currency || 'SAR', col2X, y);
  y = Math.max(y1, y2) + 8;
  
  // Vendor Information
  y = addSectionTitle(doc, 'Vendor Information', y);
  y += 5;
  
  const vendorName = vendor?.name_english || vendor?.commercial_name || contract.vendor_name || 'N/A';
  y1 = addField(doc, 'Vendor Name', vendorName, col1X, y);
  y2 = addField(doc, 'Vendor Number', vendor?.vendor_number, col2X, y);
  y = Math.max(y1, y2) + 8;
  
  // Description
  if (contract.description) {
    y = addSectionTitle(doc, 'Description', y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(contract.description, 180);
    doc.text(descLines, col1X, y);
    y += descLines.length * 4 + 8;
  }
  
  // Scope of Work
  if (contract.scope_of_work) {
    y = addSectionTitle(doc, 'Scope of Work', y);
    y += 5;
    doc.setFontSize(9);
    const scopeLines = doc.splitTextToSize(contract.scope_of_work, 180);
    doc.text(scopeLines, col1X, y);
    y += scopeLines.length * 4 + 8;
  }
  
  // Terms & Conditions
  if (contract.terms_conditions) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    y = addSectionTitle(doc, 'Terms & Conditions', y);
    y += 5;
    doc.setFontSize(9);
    const termsLines = doc.splitTextToSize(contract.terms_conditions, 180);
    doc.text(termsLines, col1X, y);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('This document is auto-generated from Sourcevia Procurement System', 105, 285, { align: 'center' });
  
  doc.save(`Contract_${contract.contract_number}.pdf`);
};

// Export Purchase Order to PDF
export const exportPOToPDF = (po, vendor, lineItems = []) => {
  const doc = new jsPDF();
  
  let y = addHeader(doc, 'Purchase Order', po.po_number);
  
  // PO Details
  y = addSectionTitle(doc, 'Purchase Order Details', y);
  y += 5;
  
  const col1X = 14;
  const col2X = 110;
  
  let y1 = addField(doc, 'PO Number', po.po_number, col1X, y);
  let y2 = addField(doc, 'Status', (po.status || '').toUpperCase(), col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Title', po.title, col1X, y, 170);
  y = y1 + 3;
  
  y1 = addField(doc, 'PO Date', formatDate(po.po_date || po.created_at), col1X, y);
  y2 = addField(doc, 'Delivery Date', formatDate(po.delivery_date), col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Total Amount', formatCurrency(po.total_amount || po.total_value), col1X, y);
  y2 = addField(doc, 'Currency', po.currency || 'SAR', col2X, y);
  y = Math.max(y1, y2) + 8;
  
  // Vendor Information
  y = addSectionTitle(doc, 'Vendor Information', y);
  y += 5;
  
  const vendorName = vendor?.name_english || vendor?.commercial_name || vendor?.vendor_number || 'N/A';
  y1 = addField(doc, 'Vendor Name', vendorName, col1X, y);
  y2 = addField(doc, 'Vendor Number', vendor?.vendor_number, col2X, y);
  y = Math.max(y1, y2) + 8;
  
  // Line Items Table
  if (lineItems && lineItems.length > 0) {
    y = addSectionTitle(doc, 'Line Items', y);
    y += 3;
    
    autoTable(doc, {
      startY: y,
      head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
      body: lineItems.map((item, index) => [
        index + 1,
        item.description || item.name || item.item_description || 'N/A',
        item.quantity || 0,
        formatCurrency(item.unit_price || item.price),
        formatCurrency(item.total || (item.quantity * (item.unit_price || item.price || 0)))
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 80 },
        2: { cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 }
      },
      margin: { left: 14, right: 14 }
    });
    
    y = doc.lastAutoTable.finalY + 10;
  }
  
  // Totals
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 130, y);
  doc.text(formatCurrency(po.subtotal || po.total_amount), 196, y, { align: 'right' });
  y += 6;
  
  if (po.vat_amount) {
    doc.text('VAT (15%):', 130, y);
    doc.text(formatCurrency(po.vat_amount), 196, y, { align: 'right' });
    y += 6;
  }
  
  doc.setFillColor(37, 99, 235);
  doc.setTextColor(255, 255, 255);
  doc.rect(125, y - 4, 71, 8, 'F');
  doc.text('TOTAL:', 130, y);
  doc.text(formatCurrency(po.total_amount || po.total_value), 193, y, { align: 'right' });
  
  // Footer
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(8);
  doc.text('This document is auto-generated from Sourcevia Procurement System', 105, 285, { align: 'center' });
  
  doc.save(`PO_${po.po_number}.pdf`);
};

// Export Business Request (PR/Tender) to PDF
export const exportPRToPDF = (tender, proposals = []) => {
  const doc = new jsPDF();
  
  let y = addHeader(doc, 'Business Request / Tender', tender.tender_number);
  
  // Basic Information
  y = addSectionTitle(doc, 'Request Details', y);
  y += 5;
  
  const col1X = 14;
  const col2X = 110;
  
  let y1 = addField(doc, 'Request Number', tender.tender_number, col1X, y);
  let y2 = addField(doc, 'Status', (tender.status || '').replace(/_/g, ' ').toUpperCase(), col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Title', tender.title, col1X, y, 170);
  y = y1 + 3;
  
  y1 = addField(doc, 'Category', tender.category, col1X, y);
  y2 = addField(doc, 'Priority', tender.priority, col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Estimated Budget', formatCurrency(tender.budget), col1X, y);
  y2 = addField(doc, 'Currency', tender.currency || 'SAR', col2X, y);
  y = Math.max(y1, y2) + 3;
  
  y1 = addField(doc, 'Submission Deadline', formatDate(tender.submission_deadline), col1X, y);
  y2 = addField(doc, 'Created Date', formatDate(tender.created_at), col2X, y);
  y = Math.max(y1, y2) + 8;
  
  // Description
  if (tender.description) {
    y = addSectionTitle(doc, 'Description', y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(tender.description, 180);
    doc.text(descLines, col1X, y);
    y += descLines.length * 4 + 8;
  }
  
  // Business Case
  if (tender.business_case) {
    y = addSectionTitle(doc, 'Business Case / Justification', y);
    y += 5;
    doc.setFontSize(9);
    const caseLines = doc.splitTextToSize(tender.business_case, 180);
    doc.text(caseLines, col1X, y);
    y += caseLines.length * 4 + 8;
  }
  
  // Requirements
  if (tender.requirements) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    y = addSectionTitle(doc, 'Requirements', y);
    y += 5;
    doc.setFontSize(9);
    const reqLines = doc.splitTextToSize(tender.requirements, 180);
    doc.text(reqLines, col1X, y);
    y += reqLines.length * 4 + 8;
  }
  
  // Proposals Summary
  if (proposals && proposals.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    y = addSectionTitle(doc, 'Proposals Summary', y);
    y += 3;
    
    autoTable(doc, {
      startY: y,
      head: [['Vendor', 'Proposed Value', 'Status', 'Score']],
      body: proposals.map(p => [
        p.vendor_name || 'N/A',
        formatCurrency(p.proposed_value),
        (p.status || '').replace(/_/g, ' ').toUpperCase(),
        p.evaluation_score ? `${p.evaluation_score}/100` : 'N/A'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('This document is auto-generated from Sourcevia Procurement System', 105, 285, { align: 'center' });
  
  doc.save(`PR_${tender.tender_number}.pdf`);
};

// Print function - opens print dialog
export const printDocument = (elementId) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for printing');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Document</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

export default {
  exportVendorToPDF,
  exportContractToPDF,
  exportPOToPDF,
  exportPRToPDF,
  printDocument
};
