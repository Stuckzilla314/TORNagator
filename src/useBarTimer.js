import { useState, useEffect } from 'react';

export const useBarTimer = (barData) => {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    // If bar is full or data is missing, reset timer
    if (!barData || typeof barData.current === 'undefined' || barData.current >= barData.maximum) {
      setSecondsRemaining(0);
      return;
    }

    const calculateTotalSeconds = () => {
      const { current, maximum, increment, interval, ticktime } = barData;
      
      // Determine how many ticks are needed to reach maximum
      const needed = maximum - current;
      const ticksNeeded = Math.ceil(needed / (increment || 1));
      
      // Total time = time to first tick + (remaining ticks * interval)
      return (ticktime || 0) + (Math.max(0, ticksNeeded - 1) * (interval || 0));
    };

    setSecondsRemaining(calculateTotalSeconds());

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [barData]);

  const formatTime = (totalSeconds) => {
    if (totalSeconds <= 0) return '';
    
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return formatTime(secondsRemaining);
};