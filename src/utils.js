export const isElectron = typeof window !== 'undefined' && 
  window.process && 
  window.process.type === 'renderer';

export const isCapacitor = typeof window !== 'undefined' && 
  !!window.Capacitor;
