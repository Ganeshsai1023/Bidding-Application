import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useItemBidUpdates } from '../../hooks/useWebSocket';
import { bidsApi } from '../../api/itemsApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import CountdownTimer from '../shared/CountdownTimer';

const MIN_INCREMENT = 1.00;

export default function BidPanel({ item: initialItem }) {
  const { user }  = useAuth();
  const toast     = useToast();

  const [item, setItem]             = useState(initialItem);
  const [bidAmount, setBidAmount]   = useState('');
  const [status, setStatus]         = useState('idle'); // idle | processing | success | error
  const [lastError, setLastError]   = useState('');
  const priceRef                    = useRef(null);

  // ── WebSocket: subscribe to real-time bid updates ────────────────────────
  const { connected, lastUpdate } = useItemBidUpdates(item?.id);

  useEffect(() => {
    if (!lastUpdate) return;

    // Optimistic update: merge WS payload into local state
    setItem(prev => ({
      ...prev,
      currentPrice:       lastUpdate.newPrice,
      currentWinnerName:  lastUpdate.winnerName,
      currentWinnerId:    lastUpdate.winnerId,
      bidCount:           lastUpdate.bidCount,
    }));

    // Visual flash on price change
    if (priceRef.current) {
      priceRef.current.classList.remove('price-flash');
      void priceRef.current.offsetWidth; // reflow
      priceRef.current.classList.add('price-flash');
    }

    // Notify user if they were outbid
    if (user && lastUpdate.winnerId !== user.id) {
      const isMyBid = item.currentWinnerId === user.id;
      if (isMyBid) {
        toast.error(`⚡ You were outbid on "${item.title}"! New leader: ${lastUpdate.winnerName}`);
      }
    }

    // Reset bid input to new minimum
    const minNext = (parseFloat(lastUpdate.newPrice) + MIN_INCREMENT).toFixed(2);
    setBidAmount(minNext);
    setStatus('idle');
  }, [lastUpdate]);

  // Init bid amount on mount
  useEffect(() => {
    if (item?.currentPrice) {
      setBidAmount((parseFloat(item.currentPrice) + MIN_INCREMENT).toFixed(2));
    }
  }, []);

  const minAllowed = parseFloat(item?.currentPrice || 0) + MIN_INCREMENT;
  const isActive   = item?.status === 'ACTIVE';
  const isWinner   = user && item?.currentWinnerId === user.id;
  const canBid     = isActive && user && !isWinner && status !== 'processing';

  const handleBid = useCallback(async () => {
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minAllowed) {
      setLastError(`Minimum bid is $${minAllowed.toFixed(2)}`);
      return;
    }

    setStatus('processing');
    setLastError('');

    try {
      // POST /api/bids — the server validates and broadcasts via WS on success
      await bidsApi.place(item.id, amount);
      // Don't update state here — wait for the authoritative WS broadcast.
      // If no WS update arrives within 3s, reset to idle (network issue).
      const timeout = setTimeout(() => setStatus('idle'), 3000);
      setStatus('awaiting-confirm');
    } catch (err) {
      const msg = err.response?.data?.message || 'Bid failed. Please try again.';
      setLastError(msg);
      setStatus('error');
      toast.error(msg);
    }
  }, [bidAmount, item?.id, minAllowed]);

  const fmt = (n) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2
  }).format(n);

  if (!item) return null;

  return (
    <div style={styles.panel}>
      {/* Item image */}
      <div style={styles.imageWrap}>
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.title} style={styles.image} />
        )}
        <div style={styles.imageOverlay}>
          <span className={`badge badge-${item.status?.toLowerCase()}`}>
            {item.status}
          </span>
        </div>
      </div>

      {/* Item details */}
      <div style={styles.body}>
        <h2 style={styles.title}>{item.title}</h2>
        <p style={styles.description}>{item.description}</p>

        <hr className="divider" />

        {/* Price + Leader row */}
        <div style={styles.statsRow}>
          <div style={styles.statBlock}>
            <span style={styles.statLabel}>Current Bid</span>
            <span ref={priceRef} style={styles.price} className="mono">
              {fmt(item.currentPrice)}
            </span>
            <span style={styles.statSub}>
              {item.currentWinnerName
                ? <>Leading: <strong>{item.currentWinnerName}</strong>
                    {isWinner && <span style={styles.youBadge}>YOU</span>}
                  </>
                : 'No bids yet'}
            </span>
          </div>

          <div style={styles.statBlock}>
            <span style={styles.statLabel}>Time Left</span>
            <CountdownTimer endTime={item.auctionEndTime} />
            <span style={styles.statSub}>{item.bidCount ?? 0} bids placed</span>
          </div>
        </div>

        <hr className="divider" />

        {/* Connection indicator */}
        <div style={styles.wsRow}>
          <span className={`ws-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span style={styles.wsLabel}>
            {connected ? 'Live updates active' : 'Reconnecting…'}
          </span>
        </div>

        {/* Bid input */}
        {isActive && user ? (
          <div style={styles.bidArea}>
            <div style={styles.inputRow}>
              <span style={styles.currencySymbol}>$</span>
              <input
                type="number"
                className="form-input"
                style={styles.bidInput}
                value={bidAmount}
                onChange={e => { setBidAmount(e.target.value); setLastError(''); }}
                min={minAllowed}
                step="1"
                disabled={status === 'processing' || status === 'awaiting-confirm'}
                placeholder={minAllowed.toFixed(2)}
              />
            </div>

            {lastError && (
              <p style={styles.errorText}>{lastError}</p>
            )}

            <button
              className={`btn btn-gold btn-lg ${status === 'processing' || status === 'awaiting-confirm' ? '' : 'bid-pulse'}`}
              style={{ width: '100%', marginTop: '0.75rem' }}
              onClick={handleBid}
              disabled={!canBid || status === 'processing' || status === 'awaiting-confirm'}
            >
              {status === 'processing' || status === 'awaiting-confirm' ? (
                <><div className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                  {status === 'awaiting-confirm' ? 'Confirming…' : 'Processing…'}
                </>
              ) : isWinner ? (
                '✓ You\'re Leading — Bid Higher'
              ) : (
                `Place Bid — ${fmt(parseFloat(bidAmount) || minAllowed)}`
              )}
            </button>

            <p style={styles.bidHint}>
              Minimum next bid: <strong className="mono">{fmt(minAllowed)}</strong>
            </p>
          </div>
        ) : !user ? (
          <div style={styles.loginPrompt}>
            <p>Sign in to place bids</p>
          </div>
        ) : (
          <div style={styles.endedPrompt}>
            <p>This auction has ended.</p>
            {item.currentWinnerName && (
              <p style={{ marginTop: '0.5rem' }}>
                Winner: <strong>{item.currentWinnerName}</strong> at {fmt(item.currentPrice)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    background: '#fff',
    border: 'var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
    height: '260px',
    overflow: 'hidden',
    background: 'var(--canvas-2)',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  imageOverlay: {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
  },
  body: { padding: '1.75rem' },
  title: {
    fontSize: '1.5rem',
    fontWeight: 300,
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
    marginBottom: '0.5rem',
  },
  description: {
    fontSize: '0.82rem',
    color: 'var(--ink-muted)',
    lineHeight: 1.7,
    fontWeight: 300,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
  },
  statBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  statLabel: {
    fontSize: '0.65rem',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--ink-ghost)',
  },
  price: {
    fontSize: '2rem',
    fontWeight: 400,
    color: 'var(--ink)',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
    transition: 'background 0.3s',
    borderRadius: '2px',
    padding: '0.1rem 0',
  },
  statSub: {
    fontSize: '0.75rem',
    color: 'var(--ink-muted)',
    fontWeight: 300,
  },
  youBadge: {
    display: 'inline-block',
    marginLeft: '0.4rem',
    padding: '0.1rem 0.4rem',
    background: 'var(--gold-pale)',
    color: 'var(--gold)',
    fontSize: '0.6rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    borderRadius: '1px',
    verticalAlign: 'middle',
  },
  wsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  wsLabel: {
    fontSize: '0.7rem',
    color: 'var(--ink-ghost)',
    letterSpacing: '0.05em',
  },
  bidArea: {},
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    border: '1px solid var(--canvas-3)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    background: '#fff',
  },
  currencySymbol: {
    padding: '0 1rem',
    fontSize: '1rem',
    color: 'var(--ink-muted)',
    borderRight: '1px solid var(--canvas-3)',
    fontFamily: "'DM Mono', monospace",
    height: '44px',
    display: 'flex',
    alignItems: 'center',
  },
  bidInput: {
    border: 'none',
    borderRadius: 0,
    flex: 1,
    fontSize: '1.1rem',
    fontFamily: "'DM Mono', monospace",
    fontWeight: 400,
  },
  errorText: {
    fontSize: '0.75rem',
    color: 'var(--red)',
    marginTop: '0.4rem',
  },
  bidHint: {
    fontSize: '0.72rem',
    color: 'var(--ink-ghost)',
    textAlign: 'center',
    marginTop: '0.6rem',
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '1.5rem',
    background: 'var(--canvas)',
    borderRadius: 'var(--radius)',
    fontSize: '0.85rem',
    color: 'var(--ink-muted)',
  },
  endedPrompt: {
    textAlign: 'center',
    padding: '1.5rem',
    background: 'var(--canvas)',
    borderRadius: 'var(--radius)',
    fontSize: '0.85rem',
    color: 'var(--ink-muted)',
  },
};
