let logs = [];
const MAX_LOGS = 200;

// Initialize session counters
let sessionCounters = {
  TORN: 0,
  YATA: 0,
  Firebase: 0
};

// Initialize lifetime counters from localStorage
const getLifetimeCounters = () => {
  try {
    return {
      TORN: parseInt(localStorage.getItem('tornagator_lifetime_torn') || '0', 10),
      YATA: parseInt(localStorage.getItem('tornagator_lifetime_yata') || '0', 10),
      Firebase: parseInt(localStorage.getItem('tornagator_lifetime_firebase') || '0', 10)
    };
  } catch (e) {
    return { TORN: 0, YATA: 0, Firebase: 0 };
  }
};

const saveLifetimeCounters = (counters) => {
  try {
    localStorage.setItem('tornagator_lifetime_torn', counters.TORN.toString());
    localStorage.setItem('tornagator_lifetime_yata', counters.YATA.toString());
    localStorage.setItem('tornagator_lifetime_firebase', counters.Firebase.toString());
  } catch (e) {
    console.warn("Failed to save lifetime counters:", e);
  }
};

const subscribers = new Set();
const notifySubscribers = () => {
  subscribers.forEach(cb => cb());
};

export const subscribeToLogs = (callback) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};

export const getApiLogs = () => [...logs];

export const getApiCounters = () => {
  return {
    session: { ...sessionCounters },
    lifetime: getLifetimeCounters()
  };
};

export const clearLogs = () => {
  logs = [];
  notifySubscribers();
};

export const resetLifetimeCounters = () => {
  const zeroCounters = { TORN: 0, YATA: 0, Firebase: 0 };
  saveLifetimeCounters(zeroCounters);
  notifySubscribers();
};

export const logApiCall = (type, action, status, duration, errorMsg = null) => {
  // Increment session counter
  if (sessionCounters[type] !== undefined) {
    sessionCounters[type] += 1;
  }
  
  // Increment lifetime counter
  const lifetime = getLifetimeCounters();
  if (lifetime[type] !== undefined) {
    lifetime[type] += 1;
    saveLifetimeCounters(lifetime);
  }
  
  // Add detailed log entry
  const newLog = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date(),
    type,
    action,
    status, // 'SUCCESS' or 'ERROR'
    duration, // ms
    errorMsg
  };
  
  logs.unshift(newLog);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  
  notifySubscribers();
};

// Global interceptor for fetch
let isInterceptorInitialized = false;
export const initApiInterceptor = () => {
  if (isInterceptorInitialized) return;
  isInterceptorInitialized = true;
  
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input?.url || '';
    
    let apiType = null;
    let endpoint = url;
    
    if (url.includes('api.torn.com')) {
      apiType = 'TORN';
      // Mask API key for security
      endpoint = url.replace(/key=[a-zA-Z0-9]+/g, 'key=******');
    } else if (url.includes('yata.yt')) {
      apiType = 'YATA';
    }
    
    if (apiType) {
      try {
        const response = await originalFetch(input, init);
        const duration = Date.now() - startTime;
        
        // Log success/failure based on response status
        if (response.ok) {
          logApiCall(apiType, endpoint, 'SUCCESS', duration);
        } else {
          logApiCall(apiType, endpoint, 'ERROR', duration, `HTTP Status ${response.status}`);
        }
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        logApiCall(apiType, endpoint, 'ERROR', duration, error.message);
        throw error;
      }
    }
    
    return originalFetch(input, init);
  };
};
