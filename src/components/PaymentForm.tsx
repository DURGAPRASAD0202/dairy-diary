'use client';
import { useState } from 'react';
import { Customer } from '@/lib/types';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { showToast } from './Toast';
import { format } from 'date-fns';

interface PaymentFormProps {
  preSelectedCustomer?: Customer;
  onClose: () => void;
}

export function PaymentForm({ preSelectedCustomer, onClose }: PaymentFormProps) {
  const { customers, addPayment } = useData();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    customerId: preSelectedCustomer?.id || '',
    amount: '',
    method: 'Cash' as 'Cash' | 'UPI',
    date: format(new Date(), 'yyyy-MM-dd'),
    forMonth: format(new Date(), 'yyyy-MM'),
  });

  const selectedCustomer = customers.find(c => c.id === form.customerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) { showToast('Select a customer', 'error'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { showToast('Enter a valid amount', 'error'); return; }
    setLoading(true);
    try {
      await addPayment({
        customerId: form.customerId,
        customerName: selectedCustomer?.name || '',
        amount: parseFloat(form.amount),
        method: form.method,
        date: form.date,
        forMonth: form.forMonth,
      });
      showToast(`Payment of ₹${form.amount} recorded! 💰`);
      onClose();
    } catch {
      showToast('Failed to record payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        {/* Customer Select */}
        <div className="form-group">
          <label className="form-label">👤 Customer</label>
          <select
            className="form-select"
            value={form.customerId}
            onChange={e => setForm({ ...form, customerId: e.target.value })}
          >
            <option value="">-- Select Customer --</option>
            {customers.filter(c => c.active).map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.pendingBalance > 0 ? `(₹${c.pendingBalance.toFixed(0)} pending)` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Pending Balance Info */}
        {selectedCustomer && (
          <div className="card card-cream mb-12" style={{ padding: '10px 14px' }}>
            <div className="flex-between">
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Pending Balance</span>
              <span className={`pending-amount ${selectedCustomer.pendingBalance > 0 ? 'red' : 'green'}`}>
                ₹{selectedCustomer.pendingBalance.toFixed(2)}
                {selectedCustomer.pendingBalance > 0 ? ' 🔴' : ' ✅'}
              </span>
            </div>
          </div>
        )}

        {/* Amount - Quick fill buttons */}
        <div className="form-group">
          <label className="form-label">💰 {t('amount')}</label>
          <input
            className="form-input"
            type="number"
            inputMode="numeric"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            placeholder="e.g. 1200"
            autoFocus={!!preSelectedCustomer}
          />
          {selectedCustomer && selectedCustomer.pendingBalance > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setForm({ ...form, amount: selectedCustomer.pendingBalance.toFixed(0) })}
              >
                Full: ₹{selectedCustomer.pendingBalance.toFixed(0)}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setForm({ ...form, amount: (selectedCustomer.pendingBalance / 2).toFixed(0) })}
              >
                Half: ₹{(selectedCustomer.pendingBalance / 2).toFixed(0)}
              </button>
            </div>
          )}
        </div>

        {/* Method */}
        <div className="form-group">
          <label className="form-label">💳 {t('method')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['Cash', 'UPI'] as const).map(m => (
              <button
                key={m}
                type="button"
                className={`btn btn-md ${form.method === m ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setForm({ ...form, method: m })}
                style={{ flex: 1 }}
              >
                {m === 'Cash' ? '💵 ' : '📱 '}{m}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="form-group">
          <label className="form-label">📅 {t('date')}</label>
          <input
            className="form-input"
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
          />
        </div>

        {/* Payment For Month */}
        <div className="form-group">
          <label className="form-label">🗓️ {t('paymentForMonth')}</label>
          <input
            className="form-input"
            type="month"
            value={form.forMonth}
            onChange={e => setForm({ ...form, forMonth: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-outline btn-md"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-md"
            disabled={loading}
            style={{ flex: 2 }}
          >
            {loading ? '⏳ Saving...' : `💰 ${t('addPayment')}`}
          </button>
        </div>
      </div>
    </form>
  );
}
