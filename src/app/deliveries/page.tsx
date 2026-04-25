'use client';
import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ToastProvider, showToast } from '@/components/Toast';
import { format, subDays } from 'date-fns';
import { safeFormat } from '@/lib/dateUtils';
import { DeliveryStatus } from '@/lib/types';

export default function DeliveriesPage() {
  const { customers, deliveries, addDelivery, updateDelivery, markAllDelivered, autoPopulateToday, loading } = useData();
  const { t } = useLanguage();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && customers.length > 0) {
      autoPopulateToday();
    }
  }, [loading, customers.length]); // eslint-disable-line

  const dateDeliveries = deliveries.filter(d => d.date === selectedDate);

  // Build list: for each active customer, find or create delivery record
  const customerDeliveryList = customers
    .filter(c => c.active)
    .map(c => {
      const delivery = dateDeliveries.find(d => d.customerId === c.id);
      return { customer: c, delivery };
    });

  const handleToggle = async (customerId: string, existingId: string | undefined, newStatus: DeliveryStatus) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    setUpdating(customerId);
    try {
      if (existingId) {
        await updateDelivery(existingId, newStatus);
      } else {
        await addDelivery({
          customerId,
          customerName: customer.name,
          date: selectedDate,
          qty: customer.qtyPerDay,
          status: newStatus,
        });
      }
      showToast(newStatus === 'delivered' ? `✅ ${customer.name} - Delivered!` : `❌ ${customer.name} - Not Delivered`);
    } finally {
      setUpdating(null);
    }
  };

  const handleMarkAll = async () => {
    await markAllDelivered(selectedDate);
    showToast(`✅ All marked as Delivered!`);
  };

  // Recent 7 days for quick date selector
  const recentDates = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), i);
    return { value: format(d, 'yyyy-MM-dd'), label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : format(d, 'dd MMM') };
  });

  const deliveredCount = dateDeliveries.filter(d => d.status === 'delivered').length;
  const totalLitres = dateDeliveries.filter(d => d.status === 'delivered').reduce((s, d) => s + d.qty, 0);

  return (
    <div className="app-shell">
      <Header title={`🥛 ${t('deliveries')}`} />
      <ToastProvider />

      <div className="page-content">
        {/* Date Selector */}
        <div className="month-filter">
          {recentDates.map(d => (
            <button
              key={d.value}
              className={`month-chip ${selectedDate === d.value ? 'active' : ''}`}
              onClick={() => setSelectedDate(d.value)}
            >
              {d.label}
            </button>
          ))}
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="month-chip"
            style={{ fontSize: 12, fontWeight: 600, border: '2px solid var(--border)', cursor: 'pointer' }}
          />
        </div>

        {/* Summary for the day */}
        <div className="card card-green mb-16" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>{safeFormat(selectedDate, 'EEEE, dd MMM yyyy')}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{deliveredCount} Customers • {totalLitres}L</div>
            </div>
            <button className="btn btn-white btn-sm" onClick={handleMarkAll}>
              ✅ Mark All
            </button>
          </div>
        </div>

        {/* Customer Delivery Cards */}
        {customerDeliveryList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🥛</div>
            <div className="empty-state-title">{t('noCustomers')}</div>
          </div>
        ) : (
          customerDeliveryList.map(({ customer, delivery }) => {
            const isUpdating = updating === customer.id;
            const status = delivery?.status;

            return (
              <div
                key={customer.id}
                className={`customer-card ${status === 'delivered' ? 'paid' : status === 'not_delivered' ? 'pending' : ''}`}
              >
                <div className="flex-between">
                  <div>
                    <div className="customer-name">{customer.name}</div>
                    <div className="customer-info-row">
                      <span className="customer-info-chip">📞 {customer.phone}</span>
                      <span className="customer-info-chip">🥛 {customer.qtyPerDay}L/day</span>
                      <span className="customer-info-chip">💰 ₹{customer.pricePerLitre}/L</span>
                      <span className="customer-info-chip" style={{ color: 'var(--green-dark)', fontWeight: 600 }}>
                        {customer.customerType === 'day-by-day' 
                          ? `📅 Alt (${customer.startParity === 'even' ? 'Even' : 'Odd'})` 
                          : '🥛 Daily'}
                      </span>
                    </div>
                  </div>
                  {status && (
                    <span className={`badge ${status === 'delivered' ? 'badge-green' : 'badge-red'}`}>
                      {status === 'delivered' ? '✅ Done' : '❌ Skipped'}
                    </span>
                  )}
                </div>

                <div className="delivery-toggle">
                  <button
                    className={`btn btn-delivered btn-md ${status === 'delivered' ? 'active' : ''}`}
                    onClick={() => handleToggle(customer.id, delivery?.id, 'delivered')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? '⏳' : '✅'} {t('delivered')}
                  </button>
                  <button
                    className={`btn btn-not-delivered btn-md ${status === 'not_delivered' ? 'active' : ''}`}
                    onClick={() => handleToggle(customer.id, delivery?.id, 'not_delivered')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? '⏳' : '❌'} {t('notDelivered')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
