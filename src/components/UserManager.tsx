'use client';
import { useState } from 'react';
import { useAuth, SubUser } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/types';
import { showToast } from '@/components/Toast';

interface UserManagerProps {
  onClose: () => void;
}

export function UserManager({ onClose }: UserManagerProps) {
  const { profile, subUsers, addSubUser, removeSubUser, updateSubUser, updateProfile_ } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [tab, setTab] = useState<'users' | 'dairy' | 'pref'>('users');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editUser, setEditUser] = useState<SubUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SubUser | null>(null);
  const [showPassFor, setShowPassFor] = useState<string | null>(null);

  // Sub-user form
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' as 'admin' | 'viewer' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Dairy profile form
  const [dairyName, setDairyName] = useState(profile?.dairyName || '');
  const [ownerName, setOwnerName] = useState(profile?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'viewer' });
    setFormError(''); setShowAddForm(false); setEditUser(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setFormError('All fields are required.'); return; }
    if (form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setFormLoading(true); setFormError('');
    try {
      addSubUser({ name: form.name, email: form.email, password: form.password, role: form.role });
      showToast(`✅ ${form.name} added!`);
      resetForm();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add user.');
    } finally { setFormLoading(false); }
  };

  const handleSaveEdit = () => {
    if (!editUser || !form.name) { setFormError('Name is required.'); return; }
    const updates: Partial<SubUser> = { name: form.name, role: form.role };
    if (form.password) {
      if (form.password.length < 6) { setFormError('Password must be at least 6 chars.'); return; }
      updates.password = form.password;
    }
    updateSubUser(editUser.email, updates);
    showToast(`✅ ${form.name} updated!`);
    resetForm();
  };

  const startEdit = (u: SubUser) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setEditUser(u); setShowAddForm(true); setFormError('');
  };

  const saveDairyProfile = async () => {
    if (!dairyName || !ownerName) return;
    setProfileSaving(true);
    await updateProfile_({ name: ownerName, dairyName });
    showToast('✅ Profile updated!');
    setProfileSaving(false);
  };

  return (
    <div>
      <div className="modal-header">
        <div>
          <span className="modal-title">⚙️ Settings</span>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {profile?.dairyName}
          </div>
        </div>
        <button className="btn btn-icon" onClick={onClose}>✕</button>
      </div>

      {/* Settings tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {([['users', '👥 Team'], ['dairy', '🐃 Dairy'], ['pref', '⚙️ App']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: '10px 8px', border: 'none', background: 'transparent',
              fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 600,
              whiteSpace: 'nowrap',
              color: tab === key ? 'var(--green-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', position: 'relative',
              borderBottom: tab === key ? '2px solid var(--green-primary)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="modal-body">
        {/* ── Team / Sub-users ───────────────────────── */}
        {tab === 'users' && (
          <>
            <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              Add family or staff who can log in to your dairy account.
            </div>
            <div style={{ marginBottom: 12 }}>
              {subUsers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                  No team members yet.
                </div>
              )}
              {subUsers.map(u => (
                <div key={u.email} className="card" style={{
                  marginBottom: 8, borderLeft: `4px solid ${u.role === 'admin' ? 'var(--green-primary)' : 'var(--border)'}`,
                  padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</span>
                        <span className={`badge ${u.role === 'admin' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                          {u.role === 'admin' ? '👑 Admin' : '👁️ Viewer'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>📧 {u.email}</div>
                      <div
                        style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2, cursor: 'pointer' }}
                        onClick={() => setShowPassFor(showPassFor === u.email ? null : u.email)}
                      >
                        🔑 {showPassFor === u.email ? u.password : '••••••'}
                        <span style={{ marginLeft: 4, color: 'var(--green-primary)', fontSize: 11 }}>
                          {showPassFor === u.email ? '🙈' : '👁️'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => startEdit(u)}>✏️</button>
                      <button className="btn btn-xs" style={{ background: 'var(--red-light)', color: 'var(--red-dark)' }}
                        onClick={() => setConfirmDelete(u)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!showAddForm ? (
              <button className="btn btn-primary btn-lg" onClick={() => { setShowAddForm(true); setEditUser(null); }}>
                ➕ Add Team Member
              </button>
            ) : (
              <div className="card" style={{ background: 'var(--green-bg)', border: '1.5px solid var(--green-light)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                  {editUser ? `✏️ Edit ${editUser.name}` : '➕ Add Team Member'}
                </div>
                <form onSubmit={editUser ? (e) => { e.preventDefault(); handleSaveEdit(); } : handleAdd}>
                  <div className="form-group">
                    <label className="form-label">👤 Name</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. My Son" autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">📧 Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="son@gmail.com" disabled={!!editUser} style={editUser ? { opacity: 0.6 } : {}} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🔑 Password {editUser && <span style={{ fontWeight: 400, fontSize: 11 }}>(blank = keep)</span>}</label>
                    <input className="form-input" type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editUser ? 'New password (optional)' : 'Min 6 characters'} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🎭 Role</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['admin', 'viewer'] as const).map(r => (
                        <button key={r} type="button" className={`btn btn-md ${form.role === r ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setForm({ ...form, role: r })}>
                          {r === 'admin' ? '👑 Admin' : '👁️ Viewer'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {formError && <div style={{ background: 'var(--red-light)', color: 'var(--red-dark)', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 8 }}>❌ {formError}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-outline btn-md" onClick={resetForm} style={{ flex: 1 }}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-md" disabled={formLoading} style={{ flex: 2 }}>
                      {formLoading ? '⏳' : editUser ? '✅ Save' : '✅ Add'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="card card-cream mt-12" style={{ padding: '10px 14px', fontSize: 12, color: '#92400E', marginTop: 12 }}>
              💡 Team members log in with their own email + password and see <strong>your</strong> dairy data.
            </div>
          </>
        )}

        {/* ── Dairy Info ─────────────────────────────── */}
        {tab === 'dairy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">👤 Owner Name</label>
              <input className="form-input" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label className="form-label">🐃 Dairy / Farm Name</label>
              <input className="form-input" value={dairyName} onChange={e => setDairyName(e.target.value)} placeholder="Dairy name" />
            </div>
            <div className="form-group">
              <label className="form-label">📧 Email (login)</label>
              <input className="form-input" value={profile?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
            <button className="btn btn-primary btn-lg" onClick={saveDairyProfile} disabled={profileSaving}>
              {profileSaving ? '⏳ Saving...' : '✅ Save Profile'}
            </button>
          </div>
        )}

        {/* ── App Preferences ──────────────────────────── */}
        {tab === 'pref' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label" style={{ marginBottom: 10 }}>🌐 {t('language')}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  { code: 'en', label: 'English', sub: 'Default' },
                  { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
                  { code: 'hi', label: 'हिन्दी', sub: 'Hindi' }
                ] as const).map(l => (
                  <button
                    key={l.code}
                    className={`card ${language === l.code ? 'paid' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', margin: 0, textAlign: 'left', cursor: 'pointer',
                      borderWidth: language === l.code ? 2 : 1,
                      borderColor: language === l.code ? 'var(--green-primary)' : 'var(--border)',
                    }}
                    onClick={() => {
                      setLanguage(l.code);
                      showToast(`✅ Language set to ${l.label}`);
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{l.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.sub}</div>
                    </div>
                    {language === l.code && <span style={{ fontSize: 20 }}>✅</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="card card-cream" style={{ fontSize: 12, padding: 12 }}>
              💡 Changing the language updates all menus, buttons, and reports immediately.
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-overlay" style={{ zIndex: 400 }} onClick={() => setConfirmDelete(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '45vh' }}>
            <div className="modal-handle" />
            <div className="modal-body" style={{ textAlign: 'center', paddingTop: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Remove Team Member?</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                <strong>{confirmDelete.name}</strong> will no longer be able to log in.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-md" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn btn-red btn-md" style={{ flex: 1 }} onClick={() => { removeSubUser(confirmDelete.email); showToast(`Removed ${confirmDelete.name}`); setConfirmDelete(null); }}>
                  🗑️ Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
