import { Customer, Delivery, Payment } from './types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isValid } from 'date-fns';
import { safeFormat } from './dateUtils';
import { jsPDF } from 'jspdf';

// ── Bill text (WhatsApp / SMS) ────────────────────────────
export function generateBillText(
  customer: Customer,
  deliveries: Delivery[],
  payments: Payment[],
  month: string,
  dairyName: string
): string {
  const monthLabel = safeFormat(month + '-01', 'MMMM yyyy');
  const totalLitres = deliveries.filter(d => d.status === 'delivered').reduce((s, d) => s + d.qty, 0);
  const totalAmount = totalLitres * customer.pricePerLitre;
  const amountPaid = payments.reduce((s, p) => s + p.amount, 0);
  const pending = Math.max(0, customer.pendingBalance);

  return `
🥛 *${dairyName}*
📅 Bill for *${monthLabel}*
━━━━━━━━━━━━━━━━━━━
👤 Customer: *${customer.name}*
📞 Phone: ${customer.phone}
━━━━━━━━━━━━━━━━━━━
🥛 Milk Delivered: *${totalLitres} Litres*
💰 Rate: ₹${customer.pricePerLitre}/litre
📊 Total Amount: *₹${totalAmount.toFixed(2)}*
✅ Amount Paid: ₹${amountPaid.toFixed(2)}
🔴 Pending: *₹${pending.toFixed(2)}*
━━━━━━━━━━━━━━━━━━━
${pending > 0 ? '⚠️ Please pay the pending amount.' : '✅ Account is clear. Thank you!'}
🙏 Thank you for your business!
`.trim();
}

export function generateReminderText(customer: Customer, dairyName: string): string {
  return `
🥛 *${dairyName}* — Payment Reminder
━━━━━━━━━━━━━━━━━━
Hello *${customer.name}* 👋

This is a friendly reminder that you have a pending milk bill of *₹${customer.pendingBalance.toFixed(2)}* with *${dairyName}*.

Please pay at your earliest convenience.

Thank you! ✨
`.trim();
}

export function openWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, '_blank');
}

export function openSMS(phone: string, message: string) {
  window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank');
}

// ── Excel Export (XLSX via ArrayBuffer → Blob download) ───
export async function exportToExcel(
  customers: Customer[],
  deliveries: Delivery[],
  payments: Payment[],
  month: string,
  dairyName = 'Dairy'
) {
  // Dynamic import — works in browser only
  const XLSX = await import('./xlsx-secure.js');
  const monthLabel = safeFormat(month + '-01', 'MMMM-yyyy');

  const summaryData = customers.map(c => {
    const cDel = deliveries.filter(d => d.customerId === c.id && d.status === 'delivered');
    const cPay = payments.filter(p => p.customerId === c.id);
    const litres = cDel.reduce((s, d) => s + d.qty, 0);
    const billed = litres * c.pricePerLitre;
    const paid = cPay.reduce((s, p) => s + p.amount, 0);
    return {
      'Customer': c.name,
      'Phone': c.phone,
      'Address': c.address,
      'Qty/Day (L)': c.qtyPerDay,
      'Price/L (₹)': c.pricePerLitre,
      'Days Delivered': cDel.length,
      'Total Litres': litres,
      'Billed (₹)': +billed.toFixed(2),
      'Paid (₹)': +paid.toFixed(2),
      'Pending (₹)': +Math.max(0, c.pendingBalance).toFixed(2),
      'Status': c.pendingBalance <= 0 ? 'PAID' : 'PENDING',
    };
  });

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const ws = XLSX.utils.json_to_sheet(summaryData);
  ws['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 26 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, `${monthLabel} Summary`);

  // Per-customer delivery sheets
  for (const c of customers) {
    const cDel = deliveries.filter(d => d.customerId === c.id);
    if (cDel.length === 0) continue;
    const rows = cDel.map(d => ({
      'Date': d.date,
      'Qty (L)': d.qty,
      'Status': d.status === 'delivered' ? 'Delivered' : 'Not Delivered',
      'Amount (₹)': d.status === 'delivered' ? +(d.qty * c.pricePerLitre).toFixed(2) : 0,
    }));
    const dws = XLSX.utils.json_to_sheet(rows);
    dws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 14 }];
    // Sheet name max 31 chars
    const sheetName = c.name.slice(0, 28);
    XLSX.utils.book_append_sheet(wb, dws, sheetName);
  }

  // Use writeFile with type 'buffer' then create a Blob — works in Next.js
  try {
    XLSX.writeFile(wb, `${dairyName}_Report_${monthLabel}.xlsx`);
  } catch {
    // Fallback: manual blob download
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dairyName}_Report_${monthLabel}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ── Customer PDF (print-based, always works) ──────────────
export function exportToPDF(
  customer: Customer,
  deliveries: Delivery[],
  payments: Payment[],
  month: string,
  dairyName = 'My Dairy'
) {
  const monthLabel = safeFormat(month + '-01', 'MMMM yyyy');
  const delivered = deliveries.filter(d => d.status === 'delivered');
  const totalLitres = delivered.reduce((s, d) => s + d.qty, 0);
  const totalAmount = totalLitres * customer.pricePerLitre;
  const amountPaid = payments.reduce((s, p) => s + p.amount, 0);
  const pending = customer.pendingBalance;

  const deliveryRows = deliveries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
        <td style="padding:6px 10px">${d.date}</td>
        <td style="padding:6px 10px;text-align:center">${d.qty}L</td>
        <td style="padding:6px 10px;text-align:right">${d.status === 'delivered' ? '₹' + (d.qty * customer.pricePerLitre).toFixed(2) : '-'}</td>
        <td style="padding:6px 10px;text-align:center;color:${d.status === 'delivered' ? '#16a34a' : '#dc2626'};font-weight:600">
          ${d.status === 'delivered' ? '✓ Delivered' : '✗ Not Delivered'}
        </td>
      </tr>`).join('');

  const paymentRows = payments.map((p, i) => `
    <tr style="background:${i % 2 === 0 ? '#f0fdf4' : '#fff'}">
      <td style="padding:6px 10px">${p.date}</td>
      <td style="padding:6px 10px;text-align:center">${p.method}</td>
      <td style="padding:6px 10px;text-align:right;color:#16a34a;font-weight:700">₹${p.amount.toFixed(2)}</td>
    </tr>`).join('');

  // Option A (Legacy): Print dialog
  // printDocument(html, `Bill_${customer.name.replace(/\s+/g, '_')}_${monthLabel}.pdf`);

  // Option B: Direct Download via jspdf
  return generateBillPDF(customer, deliveries, payments, month, dairyName);
}

function generateBillPDF(
  customer: Customer,
  deliveries: Delivery[],
  payments: Payment[],
  month: string,
  dairyName: string
) {
  const doc = new jsPDF();
  const monthLabel = safeFormat(month + '-01', 'MMMM yyyy');
  const delivered = deliveries.filter(d => d.status === 'delivered');
  const totalLitres = delivered.reduce((s, d) => s + d.qty, 0);
  const totalAmount = totalLitres * customer.pricePerLitre;
  const amountPaid = payments.reduce((s, p) => s + p.amount, 0);
  const pending = customer.pendingBalance;

  // Header
  doc.setFillColor(22, 163, 74); // #16a34a
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(`${dairyName}`, 15, 20);
  doc.setFontSize(12);
  doc.text(`Monthly Bill - ${monthLabel}`, 15, 30);

  // Info
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER:', 15, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(customer.name, 45, 55);
  
  doc.setFont('helvetica', 'bold');
  doc.text('PHONE:', 15, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(customer.phone, 45, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('ADDRESS:', 15, 69);
  doc.setFont('helvetica', 'normal');
  doc.text(customer.address || '-', 45, 69);

  // Summary Table
  doc.setFillColor(240, 253, 244);
  doc.rect(15, 80, 180, 30, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.rect(15, 80, 180, 30, 'D');

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('TOTAL MILK', 25, 90);
  doc.text('BILLED', 70, 90);
  doc.text('PAID', 115, 90);
  doc.text('BALANCE', 160, 90);

  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text(`${totalLitres}L`, 25, 102);
  doc.text(`Rs. ${totalAmount.toFixed(0)}`, 70, 102);
  doc.setTextColor(22, 163, 74);
  doc.text(`Rs. ${amountPaid.toFixed(0)}`, 115, 102);
  doc.setTextColor(pending > 0 ? 220 : 22, pending > 0 ? 38 : 163, pending > 0 ? 38 : 74);
  doc.text(`Rs. ${Math.abs(pending).toFixed(0)}${pending < 0 ? ' CR' : ''}`, 160, 102);

  // Delivery Table Header
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Delivery Details', 15, 125);
  doc.setFontSize(9);
  doc.line(15, 128, 195, 128);

  let y = 135;
  doc.text('Date', 15, y);
  doc.text('Qty', 70, y);
  doc.text('Amount', 110, y);
  doc.text('Status', 160, y);
  doc.line(15, y + 2, 195, y + 2);
  y += 8;

  doc.setFont('helvetica', 'normal');
  deliveries.sort((a,b) => a.date.localeCompare(b.date)).forEach((d, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (i % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(15, y - 5, 180, 8, 'F');
    }
    doc.text(d.date, 15, y);
    doc.text(`${d.qty}L`, 70, y);
    doc.text(d.status === 'delivered' ? `Rs. ${(d.qty * customer.pricePerLitre).toFixed(2)}` : '-', 110, y);
    doc.text(d.status === 'delivered' ? 'Delivered' : 'Skipped', 160, y);
    y += 8;
  });

  doc.text(`Generated by DAIRY DIARY on ${new Date().toLocaleDateString()}`, 105, 290, { align: 'center' });

  return doc;
}

// ── Monthly Summary PDF ───────────────────────────────────
export function exportMonthlySummaryPDF(
  customers: Customer[],
  deliveries: Delivery[],
  payments: Payment[],
  month: string,
  dairyName = 'My Dairy'
) {
  const monthLabel = safeFormat(month + '-01', 'MMMM yyyy');
  const monthDeliveries = deliveries.filter(d => d.date.startsWith(month));
  const monthPayments = payments.filter(p => (p.forMonth || p.date.substring(0, 7)) === month);

  const stats = customers.map(c => {
    const cDel = monthDeliveries.filter(d => d.customerId === c.id && d.status === 'delivered');
    const cPay = monthPayments.filter(p => p.customerId === c.id);
    const litres = cDel.reduce((s, d) => s + d.qty, 0);
    const billed = litres * c.pricePerLitre;
    const paid = cPay.reduce((s, p) => s + p.amount, 0);
    const pending = billed - paid;
    return { c, litres, billed, paid, pending };
  }).sort((a, b) => b.pending - a.pending);

  const totLitres = stats.reduce((s, x) => s + x.litres, 0);
  const totBilled = stats.reduce((s, x) => s + x.billed, 0);
  const totPaid = stats.reduce((s, x) => s + x.paid, 0);
  const totPending = totBilled - totPaid;

  const rows = stats.map((x, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
      <td style="padding:8px 10px;font-weight:600">${x.c.name}</td>
      <td style="padding:8px 10px">${x.c.phone}</td>
      <td style="padding:8px 10px;text-align:center">${x.litres}L</td>
      <td style="padding:8px 10px;text-align:right">₹${x.billed.toFixed(0)}</td>
      <td style="padding:8px 10px;text-align:right;color:#16a34a;font-weight:600">₹${x.paid.toFixed(0)}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:700;color:${x.pending > 0 ? '#dc2626' : (x.pending < 0 ? '#16a34a' : '#374151')}">
        ${x.pending > 0 ? '₹' + x.pending.toFixed(0) : (x.pending < 0 ? '₹' + Math.abs(x.pending).toFixed(0) + ' CR' : '✓ Nil')}
      </td>
      <td style="padding:8px 10px;text-align:center">
        <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;
          background:${x.pending > 0 ? '#fef2f2' : (x.pending < 0 ? '#f0fdf4' : '#f3f4f6')};color:${x.pending > 0 ? '#dc2626' : (x.pending < 0 ? '#16a34a' : '#6b7280')}">
          ${x.pending > 0 ? 'PENDING' : (x.pending < 0 ? 'CREDIT' : 'PAID')}
        </span>
      </td>
    </tr>`).join('');

  // printDocument(html, `Summary_${monthLabel.replace(/ /g, '_')}.pdf`);
  
  // Direct Download via jspdf
  return generateSummaryPDF(stats, totLitres, totBilled, totPaid, totPending, monthLabel, dairyName);
}

function generateSummaryPDF(
  stats: any[],
  totLitres: number,
  totBilled: number,
  totPaid: number,
  totPending: number,
  monthLabel: string,
  dairyName: string
) {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

  // Header
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, 297, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(`${dairyName} - Financial Summary`, 15, 15);
  doc.setFontSize(10);
  doc.text(`Month: ${monthLabel}`, 15, 23);

  // Summary Cards
  doc.setTextColor(31, 41, 55);
  let x = 15;
  const cardWidth = 65;
  [
    { lbl: 'TOTAL LITER', val: `${totLitres}L` },
    { lbl: 'TOTAL BILLED', val: `Rs. ${totBilled.toFixed(0)}` },
    { lbl: 'TOTAL PAID', val: `Rs. ${totPaid.toFixed(0)}` },
    { lbl: 'BALANCE', val: `Rs. ${totPending.toFixed(0)}` },
  ].forEach(c => {
    doc.setFillColor(249, 250, 251);
    doc.rect(x, 35, cardWidth, 20, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(x, 35, cardWidth, 20, 'D');
    doc.setFontSize(8);
    doc.text(c.lbl, x + 5, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(c.val, x + 5, 51);
    doc.setFont('helvetica', 'normal');
    x += cardWidth + 5;
  });

  // Table
  let y = 65;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer', 15, y);
  doc.text('Phone', 70, y);
  doc.text('Liters', 120, y);
  doc.text('Billed', 150, y);
  doc.text('Paid', 180, y);
  doc.text('Balance', 210, y);
  doc.text('Status', 250, y);
  doc.line(15, y + 2, 282, y + 2);
  y += 10;

  doc.setFont('helvetica', 'normal');
  stats.forEach((s, i) => {
    if (y > 190) { doc.addPage(); y = 20; }
    if (i % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(15, y - 6, 267, 10, 'F');
    }
    doc.text(s.c.name, 15, y);
    doc.text(s.c.phone, 70, y);
    doc.text(`${s.litres}L`, 120, y);
    doc.text(`Rs. ${s.billed.toFixed(0)}`, 150, y);
    doc.text(`Rs. ${s.paid.toFixed(0)}`, 180, y);
    doc.text(`Rs. ${s.pending.toFixed(0)}`, 210, y);
    doc.text(s.pending > 0 ? 'Pending' : 'Paid', 250, y);
    y += 10;
  });

  return doc;
}

// ── Daily Calendar PDF (Per customer, one per page) ──────────
export function exportDailyCalendarPDF(
  customers: Customer[],
  deliveries: Delivery[],
  month: string,
  dairyName: string
) {
  const monthLabel = safeFormat(month + '-01', 'MMMM yyyy');
  // Direct Download via jspdf
  return generateCalendarPDF(customers, deliveries, month, dairyName, monthLabel);
}

function generateCalendarPDF(
  customers: Customer[],
  deliveries: Delivery[],
  month: string,
  dairyName: string,
  monthLabel: string
) {
  const doc = new jsPDF();
  const d = new Date(month + '-01');
  const firstDay = startOfMonth(d);
  const lastDay = endOfMonth(d);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startOffset = firstDay.getDay();

  customers.forEach((c, idx) => {
    if (idx > 0) doc.addPage();

    // Header
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`${dairyName}`, 15, 12);
    doc.setFontSize(10);
    doc.text(`${c.name}'s Delivery Calendar - ${monthLabel}`, 15, 20);

    // Grid
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let xBase = 15;
    let yBase = 40;
    const boxSize = 25;

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    weekdays.forEach((w, i) => {
      doc.text(w, xBase + i * boxSize + 8, yBase - 5);
    });

    const monthDeliveries = deliveries.filter(d => d.date.startsWith(month) && d.customerId === c.id && d.status === 'delivered');
    const totalLitres = monthDeliveries.reduce((s, d) => s + d.qty, 0);

    doc.setFont('helvetica', 'normal');
    let currentX = startOffset;
    let currentY = 0;

    days.forEach(day => {
      const x = xBase + currentX * boxSize;
      const y = yBase + currentY * boxSize;
      const dStr = format(day, 'yyyy-MM-dd');
      const del = monthDeliveries.find(d => d.date === dStr);

      doc.setDrawColor(229, 231, 235);
      doc.rect(x, y, boxSize, boxSize, 'D');
      if (del) {
        doc.setFillColor(240, 253, 244);
        doc.rect(x + 1, y + 1, boxSize - 2, boxSize - 2, 'F');
      }

      doc.setFontSize(8);
      doc.text(getDate(day).toString(), x + 2, y + 6);
      if (del) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${del.qty}L`, x + boxSize / 2, y + boxSize / 2 + 2, { align: 'center' });
        doc.setFont('helvetica', 'normal');
      }

      currentX++;
      if (currentX > 6) {
        currentX = 0;
        currentY++;
      }
    });

    // Summary at bottom
    doc.setFontSize(10);
    doc.text(`Total Litres: ${totalLitres}L`, 15, 200);
    doc.text(`Customer: ${c.name} (${c.phone})`, 15, 207);
  });

  return doc;
}

// ── Integrated Share Logic ───────────────────────────────
export async function shareBillPDF(
  customer: Customer,
  deliveries: Delivery[],
  payments: Payment[],
  month: string,
  dairyName = 'My Dairy'
) {
  const reminderText = generateReminderText(customer, dairyName);

  if (navigator.share) {
    try {
      // NOTE: We can't easily generate a real PDF file object in browser to share without a library like html2pdf.js
      // So we fallback to sharing the link/text, but opening the print dialog first.
      await navigator.share({
        title: `${dairyName} Bill`,
        text: reminderText,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// ── Core: open print dialog in a new window ───────────────
function printDocument(html: string, filename: string) {
  void filename; // filename is for reference; browser controls the actual name
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Please allow pop-ups for this site to download PDFs.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Small delay to let styles load
  setTimeout(() => {
    win.print();
    // Don't close immediately — let user save/cancel
    setTimeout(() => win.close(), 1000);
  }, 600);
}
