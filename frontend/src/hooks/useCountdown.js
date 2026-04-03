import { useState, useEffect } from 'react';

/**
 * Returns live countdown values from now until `endTime` (ISO string or Date).
 * Updates every second. Returns { days, hours, minutes, seconds, expired, urgency }
 */
export function useCountdown(endTime) {
  const calc = () => {
    const diff = new Date(endTime) - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, urgency: 'expired' };

    const days    = Math.floor(diff / 86_400_000);
    const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1_000);

    const urgency = diff < 60_000 ? 'critical'    // < 1 min
                  : diff < 300_000 ? 'warning'    // < 5 min
                  : 'normal';

    return { days, hours, minutes, seconds, expired: false, urgency, totalMs: diff };
  };

  const [time, setTime] = useState(calc);

  useEffect(() => {
    if (!endTime) return;
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return time;
}
