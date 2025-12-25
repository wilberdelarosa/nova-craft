import jsPDF from 'jspdf';
import type { Sale, StoreConfig } from '@/types/inventory';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function generateTicketPdf(sale: Sale, storeConfig: StoreConfig): jsPDF {
  // Ticket paper width 80mm = ~226 points (72 dpi)
  const width = 80;
  const doc = new jsPDF({
    unit: 'mm',
    // Use a generous height to avoid clipping long tickets.
    format: [width, 400],
  });

  const margin = 4;
  let y = 8;
  const lineHeight = 5;
  const contentWidth = width - margin * 2;

  // Helper functions
  const centerText = (text: string, size = 10) => {
    doc.setFontSize(size);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (width - textWidth) / 2, y);
    y += lineHeight;
  };

  const leftText = (text: string, size = 9) => {
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += lineHeight - 1;
  };

  const rightText = (text: string, size = 9) => {
    doc.setFontSize(size);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, width - margin - textWidth, y);
    y += lineHeight - 1;
  };

  const line = () => {
    doc.setLineWidth(0.3);
    doc.line(margin, y, width - margin, y);
    y += 3;
  };

  const dashedLine = () => {
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, width - margin, y);
    doc.setLineDashPattern([], 0);
    y += 3;
  };

  // ===== HEADER =====
  doc.setFont('helvetica', 'bold');
  centerText(storeConfig.storeName, 14);
  
  doc.setFont('helvetica', 'normal');
  if (storeConfig.storeAddress) {
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(storeConfig.storeAddress, contentWidth);
    lines.forEach((l: string) => {
      centerText(l, 8);
    });
  }
  
  if (storeConfig.storePhone) {
    centerText(`Tel: ${storeConfig.storePhone}`, 8);
  }

  y += 2;
  line();

  // ===== TICKET INFO =====
  doc.setFont('helvetica', 'bold');
  centerText(`TICKET: ${sale.saleNumber}`, 11);
  
  doc.setFont('helvetica', 'normal');
  centerText(formatDate(sale.createdAt), 8);

  if (sale.customerName) {
    y += 1;
    leftText(`Cliente: ${sale.customerName}`, 8);
  }
  if (sale.customerPhone) {
    leftText(`Tel: ${sale.customerPhone}`, 8);
  }

  y += 1;
  dashedLine();

  // ===== ITEMS =====
  sale.items.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    // Product name (might wrap)
    const productName = `${item.productName}`;
    const nameLines = doc.splitTextToSize(productName, contentWidth - 20);
    nameLines.forEach((l: string) => {
      doc.text(l, margin, y);
      y += 4;
    });
    
    // Variant info
    if (item.variantName) {
      doc.setFontSize(7);
      doc.text(`  ${item.variantName}`, margin, y);
      y += 3;
    }
    
    // Qty x Price = Total (on same line)
    doc.setFontSize(8);
    const qtyPrice = `${item.quantity} x ${formatCurrency(item.unitPrice)}`;
    const itemTotal = formatCurrency(item.quantity * item.unitPrice - item.discount);
    
    doc.text(qtyPrice, margin + 2, y);
    const totalWidth = doc.getTextWidth(itemTotal);
    doc.text(itemTotal, width - margin - totalWidth, y);
    y += 5;

    if (item.discount > 0) {
      doc.setFontSize(7);
      doc.text(`  Desc: -${formatCurrency(item.discount)}`, margin, y);
      y += 4;
    }
  });

  dashedLine();

  // ===== TOTALS =====
  const drawTotalLine = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 9);
    doc.text(label, margin, y);
    const valWidth = doc.getTextWidth(value);
    doc.text(value, width - margin - valWidth, y);
    y += lineHeight;
  };

  drawTotalLine('Subtotal:', formatCurrency(sale.subtotal));
  
  if (sale.discount > 0) {
    drawTotalLine('Descuento:', `-${formatCurrency(sale.discount)}`);
  }
  
  drawTotalLine('IVA:', formatCurrency(sale.tax));
  
  y += 1;
  doc.setFont('helvetica', 'bold');
  drawTotalLine('TOTAL:', formatCurrency(sale.total), true);

  y += 1;
  dashedLine();

  // ===== PAYMENT =====
  doc.setFont('helvetica', 'normal');
  const paymentLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
  };
  
  leftText(`Pago: ${paymentLabels[sale.paymentMethod] || sale.paymentMethod}`, 9);
  
  if (sale.paymentMethod === 'efectivo') {
    leftText(`Recibido: ${formatCurrency(sale.amountReceived)}`, 9);
    leftText(`Cambio: ${formatCurrency(sale.change)}`, 9);
  }

  y += 3;
  line();

  // ===== FOOTER =====
  y += 2;
  doc.setFontSize(8);
  
  if (storeConfig.ticketFooter) {
    const footerLines = doc.splitTextToSize(storeConfig.ticketFooter, contentWidth);
    footerLines.forEach((l: string) => {
      centerText(l, 8);
    });
  }

  y += 2;
  centerText('¡Gracias por su compra!', 9);

  return doc;
}

export function printTicket(sale: Sale, storeConfig: StoreConfig) {
  const doc = generateTicketPdf(sale, storeConfig);
  
  // Open PDF in new window for printing
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  const printWindow = window.open(pdfUrl, '_blank');
  if (!printWindow) return false;

  printWindow.onload = () => {
    printWindow.print();
  };

  return true;
}

export function downloadTicket(sale: Sale, storeConfig: StoreConfig) {
  const doc = generateTicketPdf(sale, storeConfig);
  doc.save(`ticket-${sale.saleNumber}.pdf`);
}
