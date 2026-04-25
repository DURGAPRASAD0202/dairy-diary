'use client';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ToastProvider } from '@/components/Toast';
import { PaymentForm } from '@/components/PaymentForm';
import { format } from 'date-fns';
import { safeFormat } from '@/lib/dateUtils';

export default function PaymentsPage() {
  const { customers, payments } = useData();
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  const filteredPayments = payments
    .filter(p => (p.forMonth || p.date.substring(0, 7)) === filterMonth)
    .sort((a, b) => b.date.localeCompare(a.date));

  const monthTotal = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const cashTotal = filteredPayments.filter(p => p.method === 'Cash').reduce((s, p) => s + p.amount, 0);
  const upiTotal = filteredPayments.filter(p => p.method === 'UPI').reduce((s, p) => s + p.amount, 0);

  // Last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') };
  });

  return (
    <div className="app-shell">
      <Header title={`💰 ${t('payments')}`} />
      <ToastProvider />

      <div className="page-content">
        {/* Month Filter */}
        <div className="month-filter">
          {months.map(m => (
            <button
              key={m.value}
              className={`month-chip ${filterMonth === m.value ? 'active' : ''}`}
              onClick={() => setFilterMonth(m.value)}
            >
              {m.label}
            </button>
          ))}
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="month-chip"
            style={{ fontSize: 12, fontWeight: 600, border: '2px solid var(--border)', cursor: 'pointer' }}
          />
        </div>

        {/* Month Summary */}
        <div className="card card-green mb-16" style={{ padding: '16px' }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {safeFormat(filterMonth + '-01', 'MMMM yyyy')} Collections
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, marginTop: 4 }}>₹{monthTotal.toFixed(0)}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13 }}>
            <span>💵 Cash: ₹{cashTotal.toFixed(0)}</span>
            <span>📱 UPI: ₹{upiTotal.toFixed(0)}</span>
          </div>
        </div>

        {/* Payment List */}
        {filteredPayments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <div className="empty-state-title">{t('noPayments')}</div>
          </div>
        ) : (
          filteredPayments.map(p => {
            const customer = customers.find(c => c.id === p.customerId);
            return (
              <div key={p.id} className="card" style={{ borderLeft: '4px solid var(--green-primary)' }}>
                <div className="flex-between">
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{p.customerName || customer?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      📅 {p.date} &nbsp;·&nbsp;
                      {p.method === 'Cash' ? '💵' : '📱'} {p.method}
                      {p.forMonth && p.forMonth !== p.date.substring(0, 7) && (
                        <span style={{ marginLeft: 8, color: 'var(--green-dark)', fontWeight: 600 }}>
                          🗓️ For {safeFormat(p.forMonth + '-01', 'MMM yy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-dark)' }}>
                    +₹{p.amount.toFixed(0)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowModal(true)}>+</button>

      {/* Add Payment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">💰 {t('addPayment')}</span>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <PaymentForm onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
