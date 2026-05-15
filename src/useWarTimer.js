import { useState, useEffect } from 'react';

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
