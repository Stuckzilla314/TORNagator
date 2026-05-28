import { useState, useEffect } from 'react';

/**
 * A custom React hook that calculates and formats the remaining travel time.
 *
 * @param {number} until - The Unix timestamp (in seconds) when the travel is expected to finish.
 * @returns {string|null} A formatted string representing the time remaining (HH:MM:SS), or null if the timer is finished or no target timestamp is provided.
 */
export const useTravelTimer = (until) => {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!until || until <= 0) {
      setSecondsRemaining(0);
      return;
    }

    const calculate = () => {
      const now = Math.floor(Date.now() / 1000);
      setSecondsRemaining(Math.max(0, until - now));
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [until]);

  if (secondsRemaining <= 0) return null;

  const h = Math.floor(secondsRemaining / 3600);
  const m = Math.floor((secondsRemaining % 3600) / 60);
  const s = secondsRemaining % 60;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};