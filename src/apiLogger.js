let logs = [];
const MAX_LOGS = 200;

// Initialize session counters
let sessionCounters = {
  TORN: 0,
  YATA: 0,
  Firebase: 0
};

// Track timestamps of TORN API calls for calculating the 5-hour rolling average
let tornCallTimestamps = [];
const sessionStartTime = Date.now();

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
  const now = Date.now();
  const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
  // Filter out timestamps older than 5 hours to keep history accurate and memory footprint small
  tornCallTimestamps = tornCallTimestamps.filter(t => t >= fiveHoursAgo);

  const sessionDurationMs = now - sessionStartTime;
  // Calculate rolling average calls per hour over the last 5 hours.
  // We use effective hours (capped at 5, and at least 1/60th of an hour to avoid division by zero or huge spikes in first minute)
  const effectiveHours = Math.min(5, Math.max(1 / 60, sessionDurationMs / 3600000));
  const avgTornCallsPerHour = tornCallTimestamps.length / effectiveHours;

  return {
    session: { ...sessionCounters },
    lifetime: getLifetimeCounters(),
    avgTornCallsPerHour
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
export const logApiCall = (type, action, status, duration, errorMsg = null, responseData = null) => {
  // Increment session counter
  if (sessionCounters[type] !== undefined) {
    sessionCounters[type] += 1;
  }
  
  // Track TORN API call timestamp
  if (type === 'TORN') {
    const now = Date.now();
    tornCallTimestamps.push(now);
    // Keep timestamps updated
    const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
    tornCallTimestamps = tornCallTimestamps.filter(t => t >= fiveHoursAgo);
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
    errorMsg,
    responseData
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
      if (url.includes('key=mock_key_1234567890123456') || url.includes('key=mock_key')) {
        const duration = Math.floor(Math.random() * 80) + 20;
        let mockBody = {};
        
        if (url.includes('/user/') && url.includes('selections=')) {
          const userIdMatch = url.match(/\/user\/(\d+)/);
          const userId = userIdMatch ? userIdMatch[1] : '12345';
          mockBody = {
            player_id: parseInt(userId, 10),
            name: userId === '12345' ? 'AntigravityMock' : `EnemyMember_${userId}`,
            level: userId === '12345' ? 42 : Math.floor(Math.random() * 80) + 10,
            age: 500,
            money_onhand: 1000000,
            status: { state: 'Okay', color: 'green', description: 'Okay' },
            energy: { current: 90, maximum: 100, ticktime: 60, interval: 600, increment: 5 },
            nerve: { current: 15, maximum: 20, ticktime: 30, interval: 300, increment: 1 },
            life: { current: 5000, maximum: 5000 },
            happy: { current: 2500, maximum: 2500 },
            travel: { destination: 'Mexico', method: 'Airstrip', timestamp: 0 },
            personalstats: {
              attackswon: Math.floor(Math.random() * 200) + 50,
              attackslost: Math.floor(Math.random() * 50) + 5,
              defendswon: Math.floor(Math.random() * 30) + 2,
              defendslost: Math.floor(Math.random() * 100) + 20,
              criminaloffenses: 1500,
              drugsused: 50,
              refills: 10,
              boostersused: 5
            }
          };
        } else if (url.includes('/faction/') && url.includes('selections=')) {
          mockBody = {
            ID: 999,
            name: 'Mock Faction',
            leader: 12345,
            'co-leader': 0,
            members: {
              '12345': { name: 'AntigravityMock', level: 42 }
            },
            ranked_wars: {
              'war_1': {
                id: 'war_1',
                war: { target: 1000, start: Math.floor(Date.now() / 1000) - 3600 },
                factions: {
                  '999': { name: 'Mock Faction', score: 450 },
                  '888': { name: 'Enemy Faction', score: 320 }
                }
              }
            }
          };
        } else if (url.includes('/faction/')) {
          mockBody = {
            ID: 888,
            name: 'Enemy Faction',
            members: {
              '22222': { name: 'EnemyMember1', level: 50, last_action: { status: 'Online' }, status: { state: 'Okay' } },
              '33333': { name: 'EnemyMember2', level: 30, last_action: { status: 'Offline' }, status: { state: 'Hospital', until: Math.floor(Date.now() / 1000) + 1200 } }
            }
          };
        } else if (url.includes('/torn/') && url.includes('items')) {
          mockBody = {
            items: {
              '1': { name: 'Plushie', market_value: 500 },
              '2': { name: 'Flower', market_value: 600 }
            }
          };
        } else if (url.includes('/inventory')) {
          mockBody = {
            inventory: {
              items: [
                { id: 1, amount: 10 },
                { id: 2, amount: 5 }
              ]
            }
          };
        } else {
          mockBody = { name: 'Mock User', player_id: 12345 };
        }

        logApiCall(apiType, endpoint, 'SUCCESS', duration, null, mockBody);
        return new Response(JSON.stringify(mockBody), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        const response = await originalFetch(input, init);
        const duration = Date.now() - startTime;
        
        // Log success/failure based on response status
        if (response.ok) {
          if (apiType === 'TORN') {
            try {
              const clone = response.clone();
              const data = await clone.json();
              if (data && data.error) {
                logApiCall(apiType, endpoint, 'ERROR', duration, data.error.error || `Torn Error Code ${data.error.code}`, data);
              } else {
                logApiCall(apiType, endpoint, 'SUCCESS', duration, null, data);
              }
            } catch (e) {
              logApiCall(apiType, endpoint, 'SUCCESS', duration);
            }
          } else {
            try {
              const clone = response.clone();
              const data = await clone.json();
              logApiCall(apiType, endpoint, 'SUCCESS', duration, null, data);
            } catch (e) {
              logApiCall(apiType, endpoint, 'SUCCESS', duration);
            }
          }
        } else {
          let errorData = null;
          try {
            const clone = response.clone();
            errorData = await clone.json();
          } catch (e) {
            try {
              const clone = response.clone();
              errorData = await clone.text();
            } catch (inner) {}
          }
          logApiCall(apiType, endpoint, 'ERROR', duration, `HTTP Status ${response.status}`, errorData);
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
