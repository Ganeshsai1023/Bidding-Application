import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();

  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    username: '', password: '', email: '', displayName: '',
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ username: form.username, password: form.password });
        toast.success('Welcome back!');
      } else {
        await register(form);
        toast.success('Account created! Welcome to BidStream.');
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left panel — decorative */}
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.wordmark}>BID<span style={{ color: 'rgba(255,255,255,0.35)' }}>STREAM</span></div>
          <p style={styles.tagline}>
            Where rare objects find<br />
            <em>their rightful owners.</em>
          </p>
          <div style={styles.decorLine} />
          <p style={styles.subtext}>
            Real-time competitive auctions.<br />
            Every bid. Every second. Live.
          </p>
        </div>
        <div style={styles.decorGrid} aria-hidden="true">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} style={{ ...styles.decorCell, opacity: Math.random() * 0.12 + 0.03 }} />
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={styles.right}>
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p style={styles.formSub}>
            {mode === 'login'
              ? 'Access your bidder account'
              : 'Join the auction house'}
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
            {mode === 'register' && (
              <>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Display Name</label>
                  <input
                    className="form-input"
                    placeholder="How others will see you"
                    value={form.displayName}
                    onChange={set('displayName')}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={set('email')}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Username</label>
              <input
                className="form-input"
                placeholder="username"
                value={form.username}
                onChange={set('username')}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
            </div>

            {error && (
              <div style={styles.errorBox}>{error}</div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (
                <><div className="spinner" style={{ borderTopColor: '#fff' }} /> Processing…</>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <hr className="divider" />

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
            {mode === 'login' ? "Don't have an account?" : 'Already a member?'}{' '}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer',
                       fontWeight: 500, fontSize: '0.8rem', textDecoration: 'underline' }}
            >
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>

          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--ink-ghost)', marginTop: '1rem' }}>
            Demo: <strong>alice</strong> / password123
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
  },
  left: {
    flex: '1 1 45%',
    background: 'var(--ink)',
    padding: '4rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  leftContent: { position: 'relative', zIndex: 1 },
  wordmark: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '2.5rem',
    fontWeight: 300,
    letterSpacing: '0.25em',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: '3rem',
  },
  tagline: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '2.2rem',
    fontWeight: 300,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 1.4,
    marginBottom: '2rem',
  },
  decorLine: {
    width: '3rem',
    height: '1px',
    background: 'var(--gold)',
    marginBottom: '2rem',
  },
  subtext: {
    fontSize: '0.85rem',
    fontWeight: 300,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 1.8,
    letterSpacing: '0.03em',
  },
  decorGrid: {
    position: 'absolute',
    top: 0, right: 0,
    width: '50%',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gridTemplateRows: 'repeat(5, 1fr)',
    pointerEvents: 'none',
  },
  decorCell: {
    border: '1px solid rgba(255,255,255,0.1)',
  },
  right: {
    flex: '1 1 55%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    background: 'var(--canvas)',
  },
  formCard: {
    width: '100%',
    maxWidth: '420px',
    background: '#fff',
    padding: '3rem',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-lg)',
    border: 'var(--border)',
  },
  formTitle: {
    fontSize: '1.8rem',
    fontWeight: 300,
    letterSpacing: '-0.01em',
  },
  formSub: {
    fontSize: '0.8rem',
    color: 'var(--ink-muted)',
    marginTop: '0.3rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: 'var(--red)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius)',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
};
