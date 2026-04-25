'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, Timestamp, getDocs, where, increment, writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Customer, Delivery, Payment, DeliveryStatus } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const DEMO_MODE = !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'dairy-tracker-demo';

// ── localStorage helpers (namespaced by uid) ─────────────
function lsGet<T>(uid: string, key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(`${key}-${uid}`) || '') as T; }
  catch { return fallback; }
}
function lsSet(uid: string, key: string, val: unknown) {
  if (typeof window !== 'undefined') localStorage.setItem(`${key}-${uid}`, JSON.stringify(val));
}

let idCounter = Date.now();
const newId = (prefix: string) => `${prefix}_${++idCounter}`;

// ── Context type ─────────────────────────────────────────
interface DataContextType {
  customers: Customer[];
  deliveries: Delivery[];
  payments: Payment[];
  loading: boolean;
  addCustomer: (c: Omit<Customer, 'id' | 'pendingBalance' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addDelivery: (d: Omit<Delivery, 'id' | 'timestamp'>) => Promise<void>;
  updateDelivery: (id: string, status: DeliveryStatus) => Promise<void>;
  markAllDelivered: (date: string) => Promise<void>;
  addPayment: (p: Omit<Payment, 'id' | 'timestamp'>) => Promise<void>;
  autoPopulateToday: () => Promise<void>;
  getTodayDeliveries: () => Delivery[];
  getCustomerBalance: (customerId: string) => number;
  recalculateAllBalances: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export function DataProvider({ children }: { children: ReactNode }) {
  const { currentUid } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload when uid changes (different owner logged in)
  useEffect(() => {
    if (!currentUid) {
      setCustomers([]); setDeliveries([]); setPayments([]);
      setLoading(false);
      return;
    }

    if (DEMO_MODE) {
      const storedCustomers = lsGet<Customer[]>(currentUid, 'dairy-customers', []);
      const storedDeliveries = lsGet<Delivery[]>(currentUid, 'dairy-deliveries', []);
      const storedPayments = lsGet<Payment[]>(currentUid, 'dairy-payments', []);
      setCustomers(storedCustomers);
      setDeliveries(storedDeliveries);
      setPayments(storedPayments);
      setLoading(false);

      // Auto-populate today (Robust)
      const today = format(new Date(), 'yyyy-MM-dd');
      const dayNum = new Date().getDate();
      const isEvenDay = dayNum % 2 === 0;

      const todayDeliveries = storedDeliveries.filter(d => d.date === today);
      const missingCustomers = storedCustomers.filter(c => 
        c.active && !todayDeliveries.some(d => d.customerId === c.id)
      );

      if (missingCustomers.length > 0) {
        const newDeliveries = missingCustomers.map(c => {
          const isRegular = !c.customerType || c.customerType === 'regular';
          const isAltMatch = c.customerType === 'day-by-day' && 
            ((c.startParity === 'even' && isEvenDay) || (c.startParity === 'odd' && !isEvenDay));
          
          return {
            id: newId('d'),
            customerId: c.id,
            customerName: c.name,
            date: today,
            qty: c.qtyPerDay,
            status: (isRegular || isAltMatch) ? 'delivered' : 'not_delivered' as DeliveryStatus,
            timestamp: new Date(),
          };
        });
        const allDels = [...storedDeliveries, ...newDeliveries];
        setDeliveries(allDels);
        lsSet(currentUid, 'dairy-deliveries', allDels);

        // Also update balances for auto-marked ones
        const updatedCustomers = [...storedCustomers];
        newDeliveries.filter(d => d.status === 'delivered').forEach(d => {
          const idx = updatedCustomers.findIndex(c => c.id === d.customerId);
          if (idx !== -1) updatedCustomers[idx].pendingBalance += d.qty * updatedCustomers[idx].pricePerLitre;
        });
        setCustomers(updatedCustomers);
        lsSet(currentUid, 'dairy-customers', updatedCustomers);
      }
      return;
    }

    // Firebase — scoped to owner's sub-collections
    const base = `owners/${currentUid}`;
    let loaded = { customers: false, deliveries: false, payments: false };
    
    // Safety timeout: force loading to false after 5 seconds if Firebase is slow or fails
    const safetyTimer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('Data loading timed out, forcing false. Check Firebase connection or environment variables.');
          return false;
        }
        return prev;
      });
    }, 5000);

    const checkDone = () => {
      if (loaded.customers && loaded.deliveries && loaded.payments) {
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    const unsub1 = onSnapshot(query(collection(db, base, 'customers'), orderBy('createdAt', 'desc')), snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Customer, 'id'>) })));
      loaded.customers = true;
      checkDone();
    }, error => {
      console.error('Firestore customers listener error:', error);
      loaded.customers = true; // Mark as done to avoid hanging
      checkDone();
    });

    const unsub2 = onSnapshot(query(collection(db, base, 'deliveries'), orderBy('timestamp', 'desc')), snap => {
      setDeliveries(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Delivery, 'id'>) })));
      loaded.deliveries = true;
      checkDone();
    }, error => {
      console.error('Firestore deliveries listener error:', error);
      loaded.deliveries = true;
      checkDone();
    });

    const unsub3 = onSnapshot(query(collection(db, base, 'payments'), orderBy('timestamp', 'desc')), snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Payment, 'id'>) })));
      loaded.payments = true;
      checkDone();
    }, error => {
      console.error('Firestore payments listener error:', error);
      loaded.payments = true;
      checkDone();
    });

    return () => { 
      unsub1(); unsub2(); unsub3(); 
      clearTimeout(safetyTimer);
    };
  }, [currentUid]);

  // ── Auto-populate ───────────────────────────────────────
  const autoPopulateToday = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (loading || !currentUid) return;

    const todayDeliveries = deliveries.filter(d => d.date === today);
    const missingCustomers = customers.filter(c => 
      c.active && !todayDeliveries.some(d => d.customerId === c.id)
    );

    if (missingCustomers.length === 0) return;

    if (DEMO_MODE) {
      const dayNum = new Date().getDate();
      const isEvenDay = dayNum % 2 === 0;
      const newDels = missingCustomers.map(c => {
        const isRegular = !c.customerType || c.customerType === 'regular';
        const isAltMatch = c.customerType === 'day-by-day' && 
          ((c.startParity === 'even' && isEvenDay) || (c.startParity === 'odd' && !isEvenDay));
        return {
          id: newId('d'), customerId: c.id, customerName: c.name, date: today, qty: c.qtyPerDay,
          status: (isRegular || isAltMatch) ? 'delivered' : 'not_delivered' as DeliveryStatus,
          timestamp: new Date()
        };
      });
      const allD = [...deliveries, ...newDels];
      setDeliveries(allD);
      lsSet(currentUid, 'dairy-deliveries', allD);
      
      const updatedC = [...customers];
      newDels.filter(d => d.status === 'delivered').forEach(d => {
        const idx = updatedC.findIndex(x => x.id === d.customerId);
        if (idx !== -1) updatedC[idx].pendingBalance += d.qty * updatedC[idx].pricePerLitre;
      });
      setCustomers(updatedC);
      lsSet(currentUid, 'dairy-customers', updatedC);
      return;
    }

    const batch = writeBatch(db);
    const dayNum = new Date().getDate();
    const isEvenDay = dayNum % 2 === 0;

    for (const c of missingCustomers) {
      const isRegular = !c.customerType || c.customerType === 'regular';
      const isAltMatch = c.customerType === 'day-by-day' && 
        ((c.startParity === 'even' && isEvenDay) || (c.startParity === 'odd' && !isEvenDay));
      const status = (isRegular || isAltMatch) ? 'delivered' : 'not_delivered';

      const dRef = doc(collection(db, `owners/${currentUid}/deliveries`));
      batch.set(dRef, {
        customerId: c.id,
        customerName: c.name,
        date: today,
        qty: c.qtyPerDay,
        status,
        timestamp: Timestamp.now()
      });

      if (status === 'delivered') {
        const cRef = doc(db, `owners/${currentUid}/customers`, c.id);
        batch.update(cRef, { pendingBalance: increment(c.qtyPerDay * c.pricePerLitre) });
      }
    }
    await batch.commit();
  };

  // ── Customer CRUD ───────────────────────────────────────
  const addCustomer = async (c: Omit<Customer, 'id' | 'pendingBalance' | 'createdAt'>) => {
    if (!currentUid) return;
    if (DEMO_MODE) {
      const newC: Customer = { 
        ...c, 
        customerType: c.customerType || 'regular',
        startParity: c.startParity ?? null,
        id: newId('c'), 
        pendingBalance: 0, 
        createdAt: new Date() 
      };
      const arr = [...customers, newC];
      setCustomers(arr);
      lsSet(currentUid, 'dairy-customers', arr);
      return;
    }
    await addDoc(collection(db, `owners/${currentUid}/customers`), { 
      ...c, 
      customerType: c.customerType || 'regular',
      startParity: c.startParity ?? null,
      pendingBalance: 0, 
      createdAt: Timestamp.now() 
    });
  };

  const updateCustomer = async (id: string, c: Partial<Customer>) => {
    if (!currentUid) return;
    if (DEMO_MODE) {
      const arr = customers.map(x => x.id === id ? { ...x, ...c } : x);
      setCustomers(arr);
      lsSet(currentUid, 'dairy-customers', arr);
      return;
    }
    await updateDoc(doc(db, `owners/${currentUid}/customers`, id), c);
  };

  const deleteCustomer = async (id: string) => {
    if (!currentUid) return;
    if (DEMO_MODE) {
      const arr = customers.filter(x => x.id !== id);
      setCustomers(arr);
      lsSet(currentUid, 'dairy-customers', arr);
      return;
    }
    await deleteDoc(doc(db, `owners/${currentUid}/customers`, id));
  };

  // ── Delivery CRUD ───────────────────────────────────────
  const addDelivery = async (d: Omit<Delivery, 'id' | 'timestamp'>) => {
    if (!currentUid) return;
    if (DEMO_MODE) {
      const newD: Delivery = { ...d, id: newId('d'), timestamp: new Date() };
      const arr = [...deliveries, newD];
      setDeliveries(arr);
      lsSet(currentUid, 'dairy-deliveries', arr);
      if (d.status === 'delivered') {
        const cust = customers.find(c => c.id === d.customerId);
        if (cust) await updateCustomer(d.customerId, { pendingBalance: (cust.pendingBalance || 0) + d.qty * cust.pricePerLitre });
      }
      return;
    }
    await addDoc(collection(db, `owners/${currentUid}/deliveries`), { ...d, timestamp: Timestamp.now() });
    if (d.status === 'delivered') {
      const cust = customers.find(c => c.id === d.customerId);
      if (cust) {
        await updateDoc(doc(db, `owners/${currentUid}/customers`, d.customerId), {
          pendingBalance: increment(d.qty * cust.pricePerLitre)
        });
      }
    }
  };

  const updateDelivery = async (id: string, status: DeliveryStatus) => {
    if (!currentUid) return;
    const old = deliveries.find(d => d.id === id);
    if (!old) return;
    if (DEMO_MODE) {
      const arr = deliveries.map(d => d.id === id ? { ...d, status } : d);
      setDeliveries(arr);
      lsSet(currentUid, 'dairy-deliveries', arr);
      const cust = customers.find(c => c.id === old.customerId);
      if (cust) {
        const change = old.qty * cust.pricePerLitre;
        if (old.status === 'delivered' && status === 'not_delivered') {
          await updateCustomer(old.customerId, { pendingBalance: (cust.pendingBalance || 0) - change });
        } else if (old.status === 'not_delivered' && status === 'delivered') {
          await updateCustomer(old.customerId, { pendingBalance: (cust.pendingBalance || 0) + change });
        }
      }
      return;
    }

    // Firebase: update status and balance
    await updateDoc(doc(db, `owners/${currentUid}/deliveries`, id), { status });
    const cust = customers.find(c => c.id === old.customerId);
    if (cust) {
      const amount = old.qty * cust.pricePerLitre;
      let diff = 0;
      if (old.status === 'delivered' && status === 'not_delivered') diff = -amount;
      else if (old.status === 'not_delivered' && status === 'delivered') diff = amount;

      if (diff !== 0) {
        await updateDoc(doc(db, `owners/${currentUid}/customers`, old.customerId), {
          pendingBalance: increment(diff)
        });
      }
    }
  };

  const markAllDelivered = async (date: string) => {
    if (!currentUid) return;
    const dateDeliveries = deliveries.filter(d => d.date === date);
    const activeCustomers = customers.filter(c => c.active);
    
    // Existing records to update
    const toUpdate = dateDeliveries.filter(d => d.status !== 'delivered');
    // Customers with NO record for this date
    const missing = activeCustomers.filter(c => !dateDeliveries.some(d => d.customerId === c.id));

    if (toUpdate.length === 0 && missing.length === 0) return;

    if (DEMO_MODE) {
      const updatedDels = deliveries.map(d => {
        if (d.date === date && d.status !== 'delivered') return { ...d, status: 'delivered' as DeliveryStatus };
        return d;
      });
      const newDels = missing.map(c => ({
        id: newId('d'), customerId: c.id, customerName: c.name, date, qty: c.qtyPerDay, status: 'delivered' as DeliveryStatus, timestamp: new Date()
      }));
      const allDels = [...updatedDels, ...newDels];
      setDeliveries(allDels);
      lsSet(currentUid, 'dairy-deliveries', allDels);
      
      // Update balances
      const updatedCusts = [...customers];
      [...toUpdate, ...newDels].forEach(d => {
        const idx = updatedCusts.findIndex(x => x.id === d.customerId);
        if (idx !== -1) updatedCusts[idx].pendingBalance += d.qty * updatedCusts[idx].pricePerLitre;
      });
      setCustomers(updatedCusts);
      lsSet(currentUid, 'dairy-customers', updatedCusts);
      return;
    }

    const batch = writeBatch(db);
    for (const d of toUpdate) {
      const dRef = doc(db, `owners/${currentUid}/deliveries`, d.id);
      batch.update(dRef, { status: 'delivered' });
      const c = customers.find(x => x.id === d.customerId);
      if (c) {
        const cRef = doc(db, `owners/${currentUid}/customers`, c.id);
        batch.update(cRef, { pendingBalance: increment(d.qty * c.pricePerLitre) });
      }
    }
    for (const c of missing) {
      const dRef = doc(collection(db, `owners/${currentUid}/deliveries`));
      batch.set(dRef, {
        customerId: c.id, customerName: c.name, date, qty: c.qtyPerDay, status: 'delivered', timestamp: Timestamp.now()
      });
      const cRef = doc(db, `owners/${currentUid}/customers`, c.id);
      batch.update(cRef, { pendingBalance: increment(c.qtyPerDay * c.pricePerLitre) });
    }
    await batch.commit();
  };

  // ── Payment CRUD ────────────────────────────────────────
  const addPayment = async (p: Omit<Payment, 'id' | 'timestamp'>) => {
    if (!currentUid) return;
    if (DEMO_MODE) {
      const newP: Payment = { ...p, id: newId('p'), timestamp: new Date() };
      const arr = [...payments, newP];
      setPayments(arr);
      lsSet(currentUid, 'dairy-payments', arr);
      const cust = customers.find(c => c.id === p.customerId);
      if (cust) await updateCustomer(p.customerId, { pendingBalance: (cust.pendingBalance || 0) - p.amount });
      return;
    }
    await addDoc(collection(db, `owners/${currentUid}/payments`), { ...p, timestamp: Timestamp.now() });
    await updateDoc(doc(db, `owners/${currentUid}/customers`, p.customerId), {
      pendingBalance: increment(-p.amount)
    });
  };

  const getTodayDeliveries = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return deliveries.filter(d => d.date === today);
  };

  const getCustomerBalance = (customerId: string) =>
    customers.find(x => x.id === customerId)?.pendingBalance || 0;

  const recalculateAllBalances = async () => {
    if (!currentUid || loading) return;
    for (const c of customers) {
      const cDels = deliveries.filter(d => d.customerId === c.id && d.status === 'delivered');
      const cPays = payments.filter(p => p.customerId === c.id);
      const totalBilled = cDels.reduce((s, d) => s + (d.qty * c.pricePerLitre), 0);
      const totalPaid = cPays.reduce((s, p) => s + p.amount, 0);
      const correctBalance = totalBilled - totalPaid;

      if (Math.abs(c.pendingBalance - correctBalance) > 0.1) {
        console.log(`Fixing balance for ${c.name}: ${c.pendingBalance} -> ${correctBalance}`);
        await updateCustomer(c.id, { pendingBalance: correctBalance });
      }
    }
  };

  // Run fix on load
  useEffect(() => {
    if (!loading && customers.length > 0) {
      recalculateAllBalances();
    }
  }, [loading]);

  return (
    <DataContext.Provider value={{
      customers, deliveries, payments, loading,
      addCustomer, updateCustomer, deleteCustomer,
      addDelivery, updateDelivery, markAllDelivered,
      addPayment, autoPopulateToday,
      getTodayDeliveries, getCustomerBalance,
      recalculateAllBalances,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
