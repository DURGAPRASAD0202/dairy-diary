'use client';
import { useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ToastProvider } from '@/components/Toast';
import { PaymentForm } from '@/components/PaymentForm';
import { format } from 'date-fns';
import { Customer } from '@/lib/types';

export default function HomePage() {
  const { customers, deliveries, payments, loading, autoPopulateToday } = useData();
  const { t } = useLanguage();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [greeting, setGreeting] = useState('Good Morning ☀️');

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'EEEE, dd MMMM yyyy');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning ☀️');
    else if (hour < 17) setGreeting('Good Afternoon 🌤️');
    else setGreeting('Good Evening 🌙');
  }, []);

  useEffect(() => {
    if (!loading && customers.length > 0) {
      autoPopulateToday();
    }
  }, [loading, customers.length]); // eslint-disable-line

  const todayDeliveries = deliveries.filter(d => d.date === today);
  const deliveredCount = todayDeliveries.filter(d => d.status === 'delivered').length;
  const totalLitresToday = todayDeliveries
    .filter(d => d.status === 'delivered')
    .reduce((s, d) => s + d.qty, 0);

  const pendingCustomers = customers.filter(c => c.active && c.pendingBalance > 0);
  const totalPending = pendingCustomers.reduce((s, c) => s + c.pendingBalance, 0);

  const thisMonth = format(new Date(), 'yyyy-MM');
  const monthPayments = payments.filter(p => p.date.startsWith(thisMonth));
  const monthCollected = monthPayments.reduce((s, p) => s + p.amount, 0);

  const paidCount = customers.filter(c => c.active && c.pendingBalance <= 0).length;

  if (loading) {
    return (
      <div className="app-shell">
        <Header />
        <div className="page-content flex-center" style={{ minHeight: '80vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🥛</div>
            <div className="loading-pulse" style={{ fontSize: 18, color: 'var(--text-secondary)' }}>Loading...</div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header />
      <ToastProvider />

      <div className="page-content">
        {/* Greeting Banner */}
        <div className="greeting-banner">
          <div className="greeting-time">{todayStr}</div>
          <div className="greeting-title">{greeting}</div>
          <div className="greeting-sub">
            {deliveredCount} deliveries done today
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stat-grid">
          <div className="stat-card green-card">
            <span className="stat-icon">🥛</span>
            <div className="stat-value">{totalLitresToday}L</div>
            <div className="stat-label">Delivered Today</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <div className="stat-value">{customers.filter(c => c.active).length}</div>
            <div className="stat-label">Active Customers</div>
          </div>
          <div className="stat-card red-card">
            <span className="stat-icon">🔴</span>
            <div className="stat-value">₹{totalPending.toFixed(0)}</div>
            <div className="stat-label">Total Pending</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <div className="stat-value">₹{monthCollected.toFixed(0)}</div>
            <div className="stat-label">This Month</div>
          </div>
        </div>

        {/* Pending Customers */}
        {pendingCustomers.length > 0 && (
          <div className="mb-16">
            <div className="section-header">
              <div className="section-title">{t('pendingPayments')}</div>
              <span className="badge badge-red">{pendingCustomers.length}</span>
            </div>

            {pendingCustomers.slice(0, 5).map(c => (
              <div key={c.id} className="customer-card pending">
                <div className="flex-between">
                  <div>
                    <div className="customer-name">{c.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📞 {c.phone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="pending-amount red">₹{c.pendingBalance.toFixed(0)} 🔴</div>
                    <button
                      className="btn btn-primary btn-xs mt-8"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowPaymentModal(true);
                      }}
                    >
                      💰 Pay Now
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {pendingCustomers.length > 5 && (
              <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                +{pendingCustomers.length - 5} more pending customers
              </div>
            )}
          </div>
        )}

        {/* Quick Status */}
        <div className="card">
          <div className="section-title mb-12">📊 Today's Status</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green-primary)' }}>{deliveredCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Delivered</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--red)' }}>
                {todayDeliveries.filter(d => d.status === 'not_delivered').length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Not Delivered</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green-dark)' }}>{paidCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Paid Up</div>
            </div>
          </div>
        </div>

        {/* All Paid celebration */}
        {pendingCustomers.length === 0 && customers.filter(c => c.active).length > 0 && (
          <div className="card card-green text-center">
            <div style={{ fontSize: 40 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>All Payments Received!</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Everyone has paid. Great job! 👏</div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">💰 {t('addPayment')}</span>
              <button className="btn btn-icon" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <PaymentForm
              preSelectedCustomer={selectedCustomer}
              onClose={() => { setShowPaymentModal(false); setSelectedCustomer(undefined); }}
            />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
