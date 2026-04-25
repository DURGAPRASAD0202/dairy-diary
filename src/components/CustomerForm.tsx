'use client';
import { useState } from 'react';
import { Customer } from '@/lib/types';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { showToast } from './Toast';

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
}

export function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const { addCustomer, updateCustomer } = useData();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    qtyPerDay: customer?.qtyPerDay?.toString() || '1',
    pricePerLitre: customer?.pricePerLitre?.toString() || '70',
    notes: customer?.notes || '',
    active: customer?.active !== false,
    customerType: customer?.customerType || 'regular',
    startParity: customer?.startParity || 'even',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      showToast('Name and Phone are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        qtyPerDay: parseFloat(form.qtyPerDay) || 1,
        pricePerLitre: parseFloat(form.pricePerLitre) || 70,
        notes: form.notes.trim(),
        active: form.active,
        customerType: form.customerType as 'regular' | 'day-by-day',
        startParity: form.customerType === 'day-by-day' ? form.startParity as 'even' | 'odd' : null,
      };
      if (customer) {
        await updateCustomer(customer.id, data);
        showToast('Customer updated! ✅');
      } else {
        await addCustomer(data);
        showToast('Customer added! 🎉');
      }
      onClose();
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">👤 {t('name')} *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Praveen"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">📞 {t('phone')} *</label>
          <input
            className="form-input"
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="e.g. 9876543210"
            inputMode="numeric"
          />
        </div>

        <div className="form-group">
          <label className="form-label">📍 {t('address')}</label>
          <input
            className="form-input"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="e.g. Main Road, Near Temple"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">🥛 {t('qtyPerDay')}</label>
            <input
              className="form-input"
              type="number"
              inputMode="decimal"
              value={form.qtyPerDay}
              onChange={e => setForm({ ...form, qtyPerDay: e.target.value })}
              min="0.25"
              step="0.25"
            />
          </div>
          <div className="form-group">
            <label className="form-label">💰 {t('pricePerLitre')}</label>
            <input
              className="form-input"
              type="number"
              inputMode="decimal"
              value={form.pricePerLitre}
              onChange={e => setForm({ ...form, pricePerLitre: e.target.value })}
              min="1"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">📝 {t('notes')}</label>
          <textarea
            className="form-textarea"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Any special instructions..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('customerType')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn btn-md ${form.customerType === 'regular' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setForm({ ...form, customerType: 'regular' })}
              style={{ flex: 1 }}
            >
              {t('regular')}
            </button>
            <button
              type="button"
              className={`btn btn-md ${form.customerType === 'day-by-day' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setForm({ ...form, customerType: 'day-by-day' })}
              style={{ flex: 1 }}
            >
              {t('dayByDay')}
            </button>
          </div>
        </div>

        {form.customerType === 'day-by-day' && (
          <div className="form-group shadow-sm" style={{ background: 'var(--green-bg)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
            <label className="form-label" style={{ fontSize: 12 }}>📅 {t('deliverySchedule')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${form.startParity === 'even' ? 'btn-primary' : 'btn-white'}`}
                onClick={() => setForm({ ...form, startParity: 'even' })}
                style={{ flex: 1 }}
              >
                {t('evenDays')}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${form.startParity === 'odd' ? 'btn-primary' : 'btn-white'}`}
                onClick={() => setForm({ ...form, startParity: 'odd' })}
                style={{ flex: 1 }}
              >
                {t('oddDays')}
              </button>
            </div>
          </div>
        )}

        <div className="form-group flex-between">
          <label className="form-label" style={{ marginBottom: 0 }}>Active Customer</label>
          <button
            type="button"
            onClick={() => setForm({ ...form, active: !form.active })}
            style={{
              width: 52, height: 28, borderRadius: 14,
              background: form.active ? 'var(--green-primary)' : 'var(--border)',
              border: 'none', cursor: 'pointer',
              transition: 'background 0.2s',
              position: 'relative',
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: form.active ? 27 : 3,
              width: 22, height: 22, borderRadius: '50%',
              background: 'white',
              transition: 'left 0.2s',
              boxShadow: 'var(--shadow-sm)',
              display: 'block',
            }} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
            {loading ? '⏳ Saving...' : `✅ ${t('save')}`}
          </button>
        </div>
      </div>
    </form>
  );
}
