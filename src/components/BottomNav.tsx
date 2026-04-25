'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

const navItems = [
  { href: '/', icon: '🏠', key: 'home' },
  { href: '/deliveries', icon: '🥛', key: 'deliveries' },
  { href: '/customers', icon: '👥', key: 'customers' },
  { href: '/payments', icon: '💰', key: 'payments' },
  { href: '/reports', icon: '📊', key: 'reports' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${pathname === item.href ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{t(item.key)}</span>
        </Link>
      ))}
    </nav>
  );
}
