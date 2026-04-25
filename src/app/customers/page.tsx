'use client';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ToastProvider, showToast } from '@/components/Toast';
import { CustomerForm } from '@/components/CustomerForm';
import { PaymentForm } from '@/components/PaymentForm';
import { Customer } from '@/lib/types';
import { openWhatsApp, generateReminderText } from '@/lib/billUtils';

export default function CustomersPage() {
  const { customers, deleteCustomer, payments, deliveries } = useData();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const dairyName = profile?.dairyName || '';

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>();
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<Customer | undefined>();
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const filtered = customers
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      const matchFilter = filter === 'all' ? true :
        filter === 'pending' ? c.pendingBalance > 0 :
          c.pendingBalance <= 0;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => b.pendingBalance - a.pendingBalance);

  const handleDelete = async (c: Customer) => {
    await deleteCustomer(c.id);
    showToast(`${c.name} deleted`);
    setConfirmDelete(undefined);
  };

  const getPaymentStatus = (c: Customer) => {
    if (c.pendingBalance <= 0) return 'paid';
    const totalBilled = deliveries
      .filter(d => d.customerId === c.id && d.status === 'delivered')
      .reduce((s, d) => s + d.qty * c.pricePerLitre, 0);
    const paid = payments.filter(p => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
    if (paid > 0 && paid < totalBilled) return 'partial';
    return 'pending';
  };

  return (
    <div className="app-shell">
      <Header title={`👥 ${t('customers')}`} />
      <ToastProvider />

      <div className="page-content">

        {/* Search */}
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder={t('searchCustomer')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['all', 'pending', 'paid'] as const).map(f => (
            <button
              key={f}
              className={`month-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `All (${customers.filter(c => c.active).length})` :
                f === 'pending' ? `🔴 Pending (${customers.filter(c => c.pendingBalance > 0).length})` :
                  `✅ Paid (${customers.filter(c => c.active && c.pendingBalance <= 0).length})`}
            </button>
          ))}
        </div>

        {/* Customer Cards */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-title">{t('noCustomers')}</div>
            <div className="empty-state-sub">Tap + to add your first customer</div>
          </div>
        ) : (
          filtered.map(c => {
            const status = getPaymentStatus(c);
            return (
              <div key={c.id} className={`customer-card ${status}`}>
                <div className="flex-between mb-8">
                  <div style={{ flex: 1 }}>
                    <div className="customer-name">{c.name}</div>
                    <div className="customer-info-row">
                      <span className="customer-info-chip">📞 {c.phone}</span>
                      {c.address && <span className="customer-info-chip">📍 {c.address}</span>}
                    </div>
                    <div className="customer-info-row">
                      <span className="customer-info-chip">🥛 {c.qtyPerDay}L/day</span>
                      <span className="customer-info-chip">💰 ₹{c.pricePerLitre}/L</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className={`pending-amount ${status === 'paid' ? 'green' : status === 'partial' ? 'yellow' : 'red'}`}
                      style={{ fontSize: 15, marginBottom: 4 }}
                    >
                      {status === 'paid' ? '✅ Paid' : `₹${c.pendingBalance.toFixed(0)} 🔴`}
                    </div>
                    <span className={`badge badge-${status === 'paid' ? 'green' : status === 'partial' ? 'yellow' : 'red'}`}>
                      {status === 'paid' ? 'PAID' : status === 'partial' ? 'PARTIAL' : 'PENDING'}
                    </span>
                  </div>
                </div>

                {c.notes && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    📝 {c.notes}
                  </div>
                )}

                <div className="divider" />

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setPaymentCustomer(c)}
                  >
                    💰 Pay
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => openWhatsApp(c.phone, generateReminderText(c, dairyName))}
                  >
                    📱 Remind
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setEditCustomer(c)}
                  >
                    ✏️ {t('edit')}
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--red-light)', color: 'var(--red-dark)' }}
                    onClick={() => setConfirmDelete(c)}
                  >
                    🗑️ {t('delete')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowAddModal(true)}>+</button>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">👤 {t('addCustomer')}</span>
              <button className="btn btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <CustomerForm onClose={() => setShowAddModal(false)} />
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editCustomer && (
        <div className="modal-overlay" onClick={() => setEditCustomer(undefined)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">✏️ {t('editCustomer')}</span>
              <button className="btn btn-icon" onClick={() => setEditCustomer(undefined)}>✕</button>
            </div>
            <CustomerForm customer={editCustomer} onClose={() => setEditCustomer(undefined)} />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentCustomer && (
        <div className="modal-overlay" onClick={() => setPaymentCustomer(undefined)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">💰 {t('addPayment')}</span>
              <button className="btn btn-icon" onClick={() => setPaymentCustomer(undefined)}>✕</button>
            </div>
            <PaymentForm preSelectedCustomer={paymentCustomer} onClose={() => setPaymentCustomer(undefined)} />
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(undefined)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="modal-handle" />
            <div className="modal-body" style={{ textAlign: 'center', paddingTop: 24 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Delete Customer?</div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                Are you sure you want to delete <strong>{confirmDelete.name}</strong>? All their records will be removed.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-md" style={{ flex: 1 }} onClick={() => setConfirmDelete(undefined)}>
                  {t('cancel')}
                </button>
                <button className="btn btn-red btn-md" style={{ flex: 1 }} onClick={() => handleDelete(confirmDelete)}>
                  🗑️ {t('delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
