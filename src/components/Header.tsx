'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/types';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserManager } from '@/components/UserManager';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack, backHref, rightAction }: HeaderProps) {
  const { t, language, setLanguage } = useLanguage();
  const { logOut, profile } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="header-logo">
          {showBack && backHref ? (
            <Link href={backHref} className="btn btn-icon" style={{ marginRight: 4 }}>←</Link>
          ) : (
            <div className="header-logo-icon">🥛</div>
          )}
          <div>
            <div className="header-logo-text">{title || (profile?.dairyName || t('appName'))}</div>
            {!title && <div className="header-logo-sub">{profile?.name || t('dairyName')}</div>}
          </div>
        </div>

        <div className="header-actions">
          {rightAction}

          {/* Settings — visible to all owners */}
          {profile && (
            <button
              className="btn btn-icon"
              title="Settings"
              onClick={() => setShowUsers(true)}
              style={{ fontSize: 16 }}
            >
              ⚙️
            </button>
          )}

          {/* Logout */}
          <button
            className="btn btn-icon"
            title="Logout"
            onClick={() => setConfirmLogout(true)}
            style={{ fontSize: 16 }}
          >
            🚪
          </button>
        </div>
      </header>

      {/* ── User Manager Modal ─────────────────────────── */}
      {showUsers && (
        <div className="modal-overlay" style={{ zIndex: 300 }} onClick={() => setShowUsers(false)}>
          <div
            className="modal-sheet"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '92vh' }}
          >
            <div className="modal-handle" />
            <UserManager onClose={() => setShowUsers(false)} />
          </div>
        </div>
      )}

      {/* ── Logout Confirm Modal ───────────────────────── */}
      {confirmLogout && (
        <div className="modal-overlay" style={{ zIndex: 300 }} onClick={() => setConfirmLogout(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '40vh' }}>
            <div className="modal-handle" />
            <div className="modal-body" style={{ textAlign: 'center', padding: '24px 20px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🚪</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Logout?</div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                Logged in as <strong>{profile?.name || profile?.email}</strong>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-outline btn-md"
                  style={{ flex: 1 }}
                  onClick={() => setConfirmLogout(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-red btn-md"
                  style={{ flex: 1 }}
                  onClick={() => { logOut(); setConfirmLogout(false); }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
