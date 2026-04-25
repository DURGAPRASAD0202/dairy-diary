'use client';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ToastProvider, showToast } from '@/components/Toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate } from 'date-fns';
import { safeFormat } from '@/lib/dateUtils';
import { Customer } from '@/lib/types';
import {
  generateBillText, generateReminderText,
  openWhatsApp, openSMS,
  exportToPDF, exportToExcel, exportMonthlySummaryPDF,
  exportDailyCalendarPDF, shareBillPDF
} from '@/lib/billUtils';

export default function ReportsPage() {
  const { customers, deliveries, payments, recalculateAllBalances } = useData();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const dairyName = profile?.dairyName || '';

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [billModal, setBillModal] = useState<Customer | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ url: string, filename: string } | null>(null);

  const openPdfPreview = (doc: any, filename: string) => {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfPreview({ url, filename });
  };

  // Last 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') };
  });

  const monthDeliveries = deliveries.filter(d => d.date.startsWith(selectedMonth));
  const monthPayments = payments.filter(p => (p.forMonth || p.date.substring(0, 7)) === selectedMonth);

  // Per customer stats
  const customerStats = customers
    .map(c => {
      const cDeliveries = monthDeliveries.filter(d => d.customerId === c.id);
      const delivered = cDeliveries.filter(d => d.status === 'delivered');
      const totalLitres = delivered.reduce((s, x) => s + x.qty, 0);
      const totalAmount = totalLitres * c.pricePerLitre;
      const cPayments = monthPayments.filter(p => p.customerId === c.id);
      const amountPaid = cPayments.reduce((s, p) => s + p.amount, 0);
      const pending = c.pendingBalance;
      return { customer: c, delivered, totalLitres, totalAmount, cPayments, amountPaid, pending };
    })
    .sort((a, b) => b.pending - a.pending);

  const totalLitres = customerStats.reduce((s, x) => s + x.totalLitres, 0);
  const totalAmount = customerStats.reduce((s, x) => s + x.totalAmount, 0);
  const totalCollected = monthPayments.reduce((s, p) => s + p.amount, 0);
  // Reset and start afresh: Show this month's net pending balance in the summary card
  const totalPending = totalAmount - totalCollected;

  const handleExportCustomerPDF = (c: Customer) => {
    const cDeliveries = monthDeliveries.filter(d => d.customerId === c.id);
    const cPayments = monthPayments.filter(p => p.customerId === c.id);
    const doc = exportToPDF(c, cDeliveries, cPayments, selectedMonth, dairyName);
    const filename = `Bill_${c.name.replace(/\s+/g, '_')}_${selectedMonth}.pdf`;
    openPdfPreview(doc, filename);
  };

  const handleExportSummaryPDF = () => {
    const doc = exportMonthlySummaryPDF(customers, deliveries, payments, selectedMonth, dairyName);
    const filename = `Summary_${selectedMonth.replace(/ /g, '_')}.pdf`;
    openPdfPreview(doc, filename);
  };

  const handleExportCalendarPDF = () => {
    const doc = exportDailyCalendarPDF(customers, deliveries, selectedMonth, dairyName);
    const filename = `Delivery_Calendar_${selectedMonth.replace(/ /g, '_')}.pdf`;
    openPdfPreview(doc, filename);
  };

  const handleExportExcel = async () => {
    if (customers.filter(c => c.active).length === 0) {
      showToast('⚠️ No customers to export!'); return;
    }
    setExporting('excel');
    try {
      await exportToExcel(customers.filter(x => x.active), monthDeliveries, monthPayments, selectedMonth, dairyName);
      showToast('📊 Excel file downloaded!');
    } catch (e) {
      console.error(e);
      showToast('❌ Excel export failed. Try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="app-shell">
      <Header title={`📊 ${t('reports')}`} />
      <ToastProvider />

      <div className="page-content">
        {/* Month Filter */}
        <div className="month-filter">
          {months.map(m => (
            <button
              key={m.value}
              className={`month-chip ${selectedMonth === m.value ? 'active' : ''}`}
              onClick={() => setSelectedMonth(m.value)}
            >
              {m.label}
            </button>
          ))}
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="month-chip"
            style={{ fontSize: 12, fontWeight: 600, border: '2px solid var(--border)', cursor: 'pointer' }}
          />
        </div>

        {/* Monthly Summary Card */}
        <div className="card card-green mb-16">
          <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 8 }}>
            📅 {safeFormat(selectedMonth + '-01', 'MMMM yyyy')} Summary
          </div>
          <div className="stat-grid" style={{ margin: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{totalLitres}L</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Delivered</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>₹{totalAmount.toFixed(0)}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Billed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>₹{totalCollected.toFixed(0)}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Collected</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>₹{totalPending.toFixed(0)}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Pending</div>
            </div>
          </div>
        </div>


        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <button onClick={recalculateAllBalances} className="btn btn-outline" style={{ width: '100%' }}>
            🔄 Sync Balances
          </button>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={handleExportCalendarPDF} className="btn btn-primary">
              📅 Calendar PDF
            </button>
            <button onClick={handleExportSummaryPDF} className="btn btn-primary">
              📊 Summary PDF
            </button>
          </div>

          <button onClick={handleExportExcel} className="btn btn-outline" style={{ width: '100%' }}>
            📁 Export Excel Report
          </button>

          {/* Info hint */}
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4 }}>
            💡 PDF reports are opened in preview mode for viewing.
          </div>
        </div>

        {/* Per Customer Reports */}
        <div className="section-title mb-12">Per Customer Report</div>

        {customerStats.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
            No data for this month yet.
          </div>
        )}

        {customerStats.map(({ customer: c, delivered, totalLitres: litres, totalAmount: amount, cPayments, amountPaid, pending }) => (
          <div key={c.id} className={`customer-card ${pending > 0 ? 'pending' : 'paid'}`}>
            <div
              className="flex-between"
              onClick={() => setExpandedCustomer(expandedCustomer === c.id ? null : c.id)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <div className="customer-name">{c.name}</div>
                <div className="customer-info-row">
                  <span className="customer-info-chip">🥛 {litres}L</span>
                  <span className="customer-info-chip">💰 ₹{amount.toFixed(0)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={`pending-amount ${pending > 0 ? 'red' : 'green'}`} style={{ fontSize: 16 }}>
                  {pending > 0 ? `₹${pending.toFixed(0)} 🔴` : (pending < 0 ? `₹${Math.abs(pending).toFixed(0)} CR 🟢` : '✅ Paid')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{expandedCustomer === c.id ? '▲' : '▼'} Details</div>
              </div>
            </div>

            {/* Expanded */}
            {expandedCustomer === c.id && (
              <div style={{ marginTop: 12 }}>
                <div className="divider" />
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  📅 {delivered.length} days delivered · ₹{c.pricePerLitre}/L
                </div>
                {cPayments.map(p => (
                  <div key={p.id} className="flex-between" style={{ fontSize: 13, padding: '4px 0' }}>
                    <span>💰 {p.date} · {p.method}</span>
                    <span style={{ color: 'var(--green-dark)', fontWeight: 700 }}>+₹{p.amount}</span>
                  </div>
                ))}
                <div className="divider" style={{ marginTop: 8 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExportCustomerPDF(c)}
                  >
                    📄 Monthly Bill (PDF)
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const doc = exportDailyCalendarPDF([c], deliveries, selectedMonth, dairyName);
                      const filename = `Calendar_${c.name.replace(/\s+/g, '_')}_${selectedMonth}.pdf`;
                      openPdfPreview(doc, filename);
                    }}
                  >
                    📅 Delivery Calendar (PDF)
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setBillModal(c)}
                  >
                    📋 Send WhatsApp Bill
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--yellow-light)', color: '#92400E' }}
                    onClick={() => {
                      handleExportCustomerPDF(c);
                      setTimeout(() => {
                        openWhatsApp(c.phone, generateReminderText(c, dairyName));
                        showToast('PDF ready! Now opening WhatsApp... 💬');
                      }, 800);
                    }}
                  >
                    📱 Remind & Share PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bill Modal */}
      {billModal && (
        <div className="modal-overlay" onClick={() => setBillModal(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">📋 Send Bill — {billModal.name}</span>
              <button className="btn btn-icon" onClick={() => setBillModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{
                background: 'var(--green-bg)',
                borderRadius: 10, padding: 12, marginBottom: 14,
                fontSize: 13, whiteSpace: 'pre-line',
                fontFamily: 'monospace', color: 'var(--text-primary)',
                maxHeight: '28vh', overflowY: 'auto',
              }}>
                {generateBillText(
                  billModal,
                  monthDeliveries.filter(d => d.customerId === billModal.id),
                  monthPayments.filter(p => p.customerId === billModal.id),
                  selectedMonth, dairyName
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    openWhatsApp(billModal.phone, generateBillText(billModal,
                      monthDeliveries.filter(d => d.customerId === billModal.id),
                      monthPayments.filter(p => p.customerId === billModal.id),
                      selectedMonth, dairyName));
                    showToast('Opening WhatsApp! 💬');
                  }}
                >
                  💬 Send via WhatsApp
                </button>
                <button
                  className="btn btn-outline btn-lg"
                  onClick={() => {
                    openSMS(billModal.phone, generateBillText(billModal,
                      monthDeliveries.filter(d => d.customerId === billModal.id),
                      monthPayments.filter(p => p.customerId === billModal.id),
                      selectedMonth, dairyName));
                    showToast('Opening SMS! 📱');
                  }}
                >
                  📱 Send via SMS
                </button>
                <button
                  className="btn btn-ghost btn-lg"
                  onClick={() => {
                    navigator.clipboard.writeText(generateBillText(billModal,
                      monthDeliveries.filter(d => d.customerId === billModal.id),
                      monthPayments.filter(p => p.customerId === billModal.id),
                      selectedMonth, dairyName));
                    showToast('Bill copied! 📋');
                  }}
                >
                  📋 Copy Bill Text
                </button>
                <button
                  className="btn btn-outline btn-lg"
                  onClick={() => handleExportCustomerPDF(billModal)}
                >
                  📄 Download Customer PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfPreview && (
        <div className="modal-overlay" onClick={() => {
          URL.revokeObjectURL(pdfPreview.url);
          setPdfPreview(null);
        }}>
          <div className="modal-sheet preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">📄 PDF Preview</span>
              <button className="btn btn-icon" onClick={() => {
                URL.revokeObjectURL(pdfPreview.url);
                setPdfPreview(null);
              }}>✕</button>
            </div>
            <div className="modal-body preview-body">
              <div className="pdf-container">
                <iframe 
                  src={pdfPreview.url} 
                  title="PDF Preview"
                  className="pdf-iframe"
                />
              </div>
              <div className="preview-actions">
                <button 
                  className="btn btn-primary btn-lg flex-1" 
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = pdfPreview.url;
                    a.download = pdfPreview.filename;
                    a.click();
                  }}
                >
                  ⬇️ Download PDF
                </button>
                <button 
                  className="btn btn-outline btn-lg flex-1" 
                  onClick={() => {
                    URL.revokeObjectURL(pdfPreview.url);
                    setPdfPreview(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .preview-modal { height: 90vh; max-width: 600px; width: 100%; border-radius: 20px 20px 0 0; }
        .preview-body { display: flex; flexDirection: column; height: calc(100% - 60px); padding: 16px; }
        .pdf-container { flex: 1; position: relative; background: #e5e7eb; borderRadius: 12px; overflow: hidden; marginBottom: 16px; border: 1px solid var(--border); box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
        .pdf-iframe { width: 100%; height: 100%; border: none; }
        .preview-actions { display: flex; gap: 12px; }
        .flex-1 { flex: 1; }
      `}</style>
    </div>
  );
}
