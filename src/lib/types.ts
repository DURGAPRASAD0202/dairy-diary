export type DeliveryStatus = 'delivered' | 'not_delivered';
export type PaymentMethod = 'Cash' | 'UPI';
export type Language = 'en' | 'te' | 'hi';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  qtyPerDay: number;
  pricePerLitre: number;
  notes: string;
  pendingBalance: number;
  customerType?: 'regular' | 'day-by-day';
  startParity?: 'even' | 'odd' | null;
  active: boolean;
  createdAt: Date;
}

export interface Delivery {
  id: string;
  customerId: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  qty: number;
  status: DeliveryStatus;
  timestamp: Date;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  date: string; // YYYY-MM-DD
  forMonth?: string; // YYYY-MM
  timestamp: Date;
}

export interface MonthlyBill {
  customerId: string;
  customerName: string;
  phone: string;
  month: string; // YYYY-MM
  totalDeliveries: number;
  totalLitres: number;
  totalAmount: number;
  amountPaid: number;
  pendingAmount: number;
  deliveries: Delivery[];
  payments: Payment[];
}
