import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { DataProvider } from '@/contexts/DataContext';
import { AuthProvider } from '@/contexts/AuthContext';
import AppShell from '@/components/AppShell';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'DAIRY DIARY — Buffalo Milk Delivery & Payments',
  description: 'Track daily buffalo milk deliveries, customer payments and generate monthly bills. Telugu, Hindi and English support.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <LanguageProvider>
            <DataProvider>
              <AppShell>
                {children}
              </AppShell>
            </DataProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
