let logs = [];
const MAX_LOGS = 200;

// Initialize session counters
let sessionCounters = {
  TORN: 0,
  YATA: 0,
  Firebase: 0
};

/**
 * Retrieves the lifetime API counters from local storage.
 *
 * @returns {{TORN: number, YATA: number, Firebase: number}} An object containing the lifetime counters for each service.
 */
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

/**
 * Saves the lifetime API counters to local storage.
 *
 * @param {{TORN: number, YATA: number, Firebase: number}} counters - The current lifetime counters to persist.
 */
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
/**
 * Notifies all active subscribers that the logs or counters have updated.
 */
const notifySubscribers = () => {
  subscribers.forEach(cb => cb());
};

/**
 * Subscribes a callback to be invoked whenever a new log entry is added or counters are updated.
 *
 * @param {Function} callback - The function to call on log updates.
 * @returns {Function} An unsubscribe function to remove the listener.
 */
export const subscribeToLogs = (callback) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};

/**
 * Retrieves a shallow copy of the current API logs array.
 *
 * @returns {Array<Object>} The array of log entries.
 */
export const getApiLogs = () => [...logs];

/**
 * Retrieves the current session and lifetime API call counters.
 *
 * @returns {{session: {TORN: number, YATA: number, Firebase: number}, lifetime: {TORN: number, YATA: number, Firebase: number}}} The nested counter stats object.
 */
export const getApiCounters = () => {
  return {
    session: { ...sessionCounters },
    lifetime: getLifetimeCounters()
  };
};

/**
 * Clears the current session logs array and notifies subscribers.
 */
export const clearLogs = () => {
  logs = [];
  notifySubscribers();
};

/**
 * Resets the lifetime API counters to zero in local storage and notifies subscribers.
 */
export const resetLifetimeCounters = () => {
  const zeroCounters = { TORN: 0, YATA: 0, Firebase: 0 };
  saveLifetimeCounters(zeroCounters);
  notifySubscribers();
};

/**
 * Logs an API call, increments the relevant counters, and updates subscribers.
 * Keeps the log array size within the defined maximum.
 *
 * @param {string} type - The service type (e.g., 'TORN', 'YATA', 'Firebase').
 * @param {string} action - The endpoint or action name.
 * @param {string} status - The result status ('SUCCESS' or 'ERROR').
 * @param {number} duration - The duration of the call in milliseconds.
 * @param {string|null} [errorMsg=null] - The error message, if applicable.
 */
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

/**
 * Initializes the global `window.fetch` interceptor to capture and log all outbound API requests.
 * Only initializes once. Safely ignores non-API calls and masks sensitive API keys.
 */
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
