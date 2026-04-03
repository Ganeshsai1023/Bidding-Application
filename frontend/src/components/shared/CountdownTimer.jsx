import React from 'react';
import { useCountdown } from '../../hooks/useCountdown';

export default function CountdownTimer({ endTime, size = 'normal' }) {
  const { days, hours, minutes, seconds, expired, urgency } = useCountdown(endTime);

  if (expired) {
    return (
      <div style={{ ...styles.container, ...styles.expired }}>
        <span style={styles.expiredText}>AUCTION ENDED</span>
      </div>
    );
  }

  const urgencyColor = urgency === 'critical' ? 'var(--red)'
                     : urgency === 'warning'  ? '#e67e22'
                     : 'var(--ink)';

  const isCompact = size === 'compact';

  return (
    <div style={{ ...styles.container, gap: isCompact ? '0.5rem' : '1rem' }}>
      {days > 0 && <TimeUnit value={days}    label="d" color={urgencyColor} compact={isCompact} />}
      <TimeUnit value={hours}   label="h" color={urgencyColor} compact={isCompact} />
      <TimeUnit value={minutes} label="m" color={urgencyColor} compact={isCompact} />
      <TimeUnit value={seconds} label="s" color={urgencyColor} compact={isCompact} blink={urgency === 'critical'} />
    </div>
  );
}

function TimeUnit({ value, label, color, compact, blink }) {
  const pad = String(value).padStart(2, '0');
  return (
    <div style={{ ...styles.unit, color, animation: blink ? 'bidPulse 1s infinite' : 'none' }}>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: compact ? '1.1rem' : '1.6rem',
        fontWeight: 400,
        lineHeight: 1,
      }}>
        {pad}
      </span>
      <span style={{
        fontSize: compact ? '0.55rem' : '0.65rem',
        fontWeight: 500,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        opacity: 0.5,
        marginTop: '0.15rem',
      }}>
        {label}
      </span>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  unit: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  expired: {
    padding: '0.5rem 0',
  },
  expiredText: {
    fontSize: '0.7rem',
    fontWeight: 500,
    letterSpacing: '0.15em',
    color: 'var(--ink-ghost)',
    textTransform: 'uppercase',
  },
};
