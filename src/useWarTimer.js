import { useState, useEffect } from 'react';

/**
 * A custom React hook that tracks the time remaining until a war starts, or the time elapsed since it started.
 *
 * @param {number} start - The Unix timestamp (in seconds) for when the war is scheduled to start.
 * @returns {{status: string, display: string, isFuture: boolean}} An object containing the current status ('Starts in' or 'War Time'), the formatted time string, and a boolean indicating if the war is still in the future.
 */
export const useWarTimer = (start) => {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!start) return { status: 'Unknown', display: '00:00:00' };

  const isFuture = now < start;
  const diff = Math.abs(start - now);
  
  const days = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  const timeStr = days > 0 
    ? `${days}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return {
    status: isFuture ? 'Starts in' : 'War Time',
    display: timeStr,
    isFuture
  };
};
