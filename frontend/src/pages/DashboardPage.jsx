import React, { useEffect, useState } from 'react';
import { itemsApi } from '../api/itemsApi';
import AuctionCard from '../components/bidding/AuctionCard';
import Navbar from '../components/shared/Navbar';

export default function DashboardPage() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | ACTIVE | SCHEDULED | ENDED

  useEffect(() => {
    const load = async () => {
      try {
        const data = await itemsApi.getAll();
        setItems(data);
      } catch (e) {
        setError('Failed to load auctions. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filters = ['ALL', 'ACTIVE', 'SCHEDULED', 'ENDED'];
  const visible = filter === 'ALL' ? items : items.filter(i => i.status === filter);

  const counts = filters.reduce((acc, f) => {
    acc[f] = f === 'ALL' ? items.length : items.filter(i => i.status === f).length;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)' }}>
      <Navbar />

      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>Live Auctions</h1>
            <p style={styles.pageSub}>Real-time competitive bidding. Every second counts.</p>
          </div>
          <div style={styles.activePulse}>
            <span style={styles.activeDot} />
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', letterSpacing: '0.05em' }}>
              {counts['ACTIVE']} live now
            </span>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={styles.filterRow}>
          {filters.map(f => (
            <button
              key={f}
              style={{
                ...styles.filterBtn,
                ...(filter === f ? styles.filterBtnActive : {}),
              }}
              onClick={() => setFilter(f)}
            >
              {f} <span style={styles.filterCount}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {/* States */}
        {loading && (
          <div style={styles.stateCenter}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <p style={{ marginTop: '1rem', color: 'var(--ink-ghost)', fontSize: '0.85rem' }}>
              Loading auctions…
            </p>
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            <strong>Connection error</strong>
            <p style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>{error}</p>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div style={styles.stateCenter}>
            <p style={{ color: 'var(--ink-ghost)', fontSize: '0.9rem' }}>
              No auctions match this filter.
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && visible.length > 0 && (
          <div style={styles.grid}>
            {visible.map(item => (
              <AuctionCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '2rem',
  },
  pageTitle: {
    fontSize: '2.5rem',
    fontWeight: 300,
    letterSpacing: '-0.02em',
    color: 'var(--ink)',
  },
  pageSub: {
    fontSize: '0.8rem',
    color: 'var(--ink-ghost)',
    marginTop: '0.35rem',
    letterSpacing: '0.05em',
  },
  activePulse: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: '#fff',
    border: 'var(--border)',
    borderRadius: 'var(--radius)',
  },
  activeDot: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: '#2ecc71',
    boxShadow: '0 0 6px #2ecc71',
  },
  filterRow: {
    display: 'flex',
    gap: '0.25rem',
    marginBottom: '2rem',
    borderBottom: 'var(--border)',
    paddingBottom: '0',
  },
  filterBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '0.6rem 1rem',
    fontSize: '0.72rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink-ghost)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginBottom: '-1px',
  },
  filterBtnActive: {
    color: 'var(--ink)',
    borderBottomColor: 'var(--ink)',
  },
  filterCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: 'var(--canvas-3)',
    fontSize: '0.6rem',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  stateCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: 'var(--red)',
    padding: '1.25rem 1.5rem',
    borderRadius: 'var(--radius)',
    maxWidth: '500px',
  },
};
