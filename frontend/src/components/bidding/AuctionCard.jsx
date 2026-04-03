import React from 'react';
import { useNavigate } from 'react-router-dom';
import CountdownTimer from '../shared/CountdownTimer';
import { useItemBidUpdates } from '../../hooks/useWebSocket';

export default function AuctionCard({ item: initialItem }) {
  const navigate = useNavigate();
  const { lastUpdate } = useItemBidUpdates(initialItem?.id);

  // Merge live WS updates into display
  const item = lastUpdate
    ? { ...initialItem, currentPrice: lastUpdate.newPrice, currentWinnerName: lastUpdate.winnerName, bidCount: lastUpdate.bidCount }
    : initialItem;

  const fmt = (n) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0
  }).format(n);

  const isActive = item.status === 'ACTIVE';

  return (
    <div
      style={styles.card}
      onClick={() => navigate(`/items/${item.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/items/${item.id}`)}
    >
      {/* Image */}
      <div style={styles.imageWrap}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} style={styles.image} loading="lazy" />
        ) : (
          <div style={styles.imagePlaceholder}>
            <span style={{ fontSize: '2rem', opacity: 0.2 }}>◈</span>
          </div>
        )}
        <div style={styles.imageBadge}>
          <span className={`badge badge-${item.status?.toLowerCase()}`}>{item.status}</span>
        </div>
        {isActive && (
          <div style={styles.liveIndicator}>
            <span style={styles.liveDot} />
            LIVE
          </div>
        )}
      </div>

      {/* Body */}
      <div style={styles.body}>
        <h3 style={styles.title}>{item.title}</h3>

        <div style={styles.priceRow}>
          <div>
            <div style={styles.priceLabel}>Current Bid</div>
            <div style={styles.price} className="mono">{fmt(item.currentPrice)}</div>
          </div>
          {isActive && (
            <div style={{ textAlign: 'right' }}>
              <div style={styles.priceLabel}>Ends In</div>
              <CountdownTimer endTime={item.auctionEndTime} size="compact" />
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <span style={styles.bidCount}>{item.bidCount ?? 0} bids</span>
          {item.currentWinnerName && (
            <span style={styles.leader}>
              Leader: {item.currentWinnerName}
            </span>
          )}
        </div>
      </div>

      <div style={styles.cta}>
        {isActive ? 'Bid Now →' : 'View Auction →'}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    border: 'var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
  },
  imageWrap: {
    position: 'relative',
    height: '180px',
    overflow: 'hidden',
    background: 'var(--canvas-2)',
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.4s ease',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadge: {
    position: 'absolute',
    top: '0.75rem',
    left: '0.75rem',
  },
  liveIndicator: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    background: 'rgba(0,0,0,0.75)',
    color: '#fff',
    padding: '0.2rem 0.5rem',
    borderRadius: '2px',
    fontSize: '0.6rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#2ecc71',
    boxShadow: '0 0 4px #2ecc71',
  },
  body: {
    padding: '1.25rem',
    flex: 1,
  },
  title: {
    fontSize: '0.95rem',
    fontWeight: 400,
    fontFamily: "'Cormorant Garamond', serif",
    lineHeight: 1.3,
    marginBottom: '1rem',
    color: 'var(--ink)',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  },
  priceLabel: {
    fontSize: '0.6rem',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--ink-ghost)',
    marginBottom: '0.2rem',
  },
  price: {
    fontSize: '1.1rem',
    fontWeight: 400,
    color: 'var(--ink)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.75rem',
    borderTop: 'var(--border)',
  },
  bidCount: {
    fontSize: '0.7rem',
    color: 'var(--ink-ghost)',
    fontFamily: "'DM Mono', monospace",
  },
  leader: {
    fontSize: '0.7rem',
    color: 'var(--ink-muted)',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cta: {
    padding: '0.75rem 1.25rem',
    background: 'var(--canvas)',
    fontSize: '0.7rem',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink-muted)',
    borderTop: 'var(--border)',
    transition: 'background 0.15s',
  },
};
