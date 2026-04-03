import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { itemsApi } from '../api/itemsApi';
import BidPanel from '../components/bidding/BidPanel';
import Navbar from '../components/shared/Navbar';

export default function ItemDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [item, setItem]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await itemsApi.getById(id);
        setItem(data);
      } catch (e) {
        setError('Auction not found.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)' }}>
      <Navbar />

      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        <button
          className="btn btn-ghost"
          style={{ color: 'var(--ink-muted)', marginBottom: '1.5rem', paddingLeft: 0 }}
          onClick={() => navigate('/dashboard')}
        >
          ← All Auctions
        </button>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '0.9rem' }}>{error}</div>
        )}

        {!loading && !error && item && (
          <div style={styles.layout}>
            {/* Bid Panel (left/main) */}
            <div style={styles.panelCol}>
              <BidPanel item={item} />
            </div>

            {/* Info sidebar */}
            <div style={styles.sideCol}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={styles.sideTitle}>Auction Details</h3>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Starting Price</span>
                  <span className="mono">${parseFloat(item.startingPrice).toFixed(2)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Total Bids</span>
                  <span className="mono">{item.bidCount ?? 0}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Starts</span>
                  <span style={{ fontSize: '0.8rem' }}>
                    {new Date(item.auctionStartTime).toLocaleString()}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Ends</span>
                  <span style={{ fontSize: '0.8rem' }}>
                    {new Date(item.auctionEndTime).toLocaleString()}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status</span>
                  <span className={`badge badge-${item.status?.toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                <h3 style={styles.sideTitle}>How It Works</h3>
                <ol style={styles.howList}>
                  {[
                    'Enter an amount above the minimum bid.',
                    'Your bid is validated instantly against the live price.',
                    'If accepted, all bidders see the update in real-time.',
                    'The highest bidder when time expires wins.',
                  ].map((step, i) => (
                    <li key={i} style={styles.howItem}>
                      <span style={styles.howNum}>{i + 1}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 300 }}>
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '2rem',
    alignItems: 'start',
  },
  panelCol: {},
  sideCol: {},
  sideTitle: {
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--ink-ghost)',
    marginBottom: '1rem',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 0',
    borderBottom: 'var(--border)',
    gap: '1rem',
  },
  detailLabel: {
    fontSize: '0.75rem',
    color: 'var(--ink-muted)',
    fontWeight: 400,
    flexShrink: 0,
  },
  howList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  howItem: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
  },
  howNum: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--ink)',
    color: '#fff',
    fontSize: '0.6rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '1px',
  },
};
