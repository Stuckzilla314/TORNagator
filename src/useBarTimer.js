import { useState, useEffect } from 'react';

/**
 * A custom React hook that calculates and manages a countdown timer for stat bars (e.g., energy, nerve).
 *
 * @param {Object} barData - The data object representing the current state of a stat bar.
 * @param {number} barData.current - The current value of the bar.
 * @param {number} barData.maximum - The maximum value of the bar.
 * @param {number} [barData.increment] - The amount the bar increments per tick.
 * @param {number} [barData.interval] - The interval in seconds between regular ticks.
 * @param {number} [barData.ticktime] - The remaining time in seconds until the next tick.
 * @returns {string} A formatted string representing the time remaining to fill the bar (HH:MM:SS), or an empty string if the bar is full or data is invalid.
 */
export const useBarTimer = (barData) => {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    // If bar is full or data is missing, reset timer
    if (!barData || typeof barData.current === 'undefined' || barData.current >= barData.maximum) {
      setSecondsRemaining(0);
      return;
    }

    /**
     * Calculates the total remaining time in seconds for the bar to reach its maximum capacity.
     * Takes into account the time to the first tick and the remaining ticks based on the increment amount.
     *
     * @returns {number} The calculated total seconds remaining.
     */
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

  /**
   * Formats the given total seconds into a standard HH:MM:SS time string.
   *
   * @param {number} totalSeconds - The total seconds to format.
   * @returns {string} The formatted time string, or an empty string if the input is less than or equal to 0.
   */
  const formatTime = (totalSeconds) => {
    if (totalSeconds <= 0) return '';
    
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return formatTime(secondsRemaining);
};