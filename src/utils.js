export const isElectron = typeof window !== 'undefined' && 
  window.process && 
  window.process.type === 'renderer';

export const isCapacitor = typeof window !== 'undefined' && (
  !!window.Capacitor || 
  (/Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent) && !window.process)
);

/**
 * List of Torn foreign travel destinations.
 */
export const TORN_COUNTRIES = [
  'United Arab Emirates',
  'Cayman Islands',
  'United Kingdom',
  'South Africa',
  'Switzerland',
  'Argentina',
  'Canada',
  'Hawaii',
  'Japan',
  'Mexico',
  'China',
  'UAE',
  'UK'
];

/**
 * Analyzes a Torn member status object to detect if the user is abroad and/or in hospital abroad.
 * 
 * @param {Object} status - The Torn status object ({ state, description, details, until }).
 * @returns {{ isAbroad: boolean, country: string|null, isHospitalAbroad: boolean }}
 */
export const getHospitalAbroadInfo = (status) => {
  if (!status) return { isAbroad: false, country: null, isHospitalAbroad: false };

  const state = status.state || '';
  const desc = status.description || '';
  const details = status.details || '';
  const combined = `${desc} ${details}`;

  let matchedCountry = null;
  for (const country of TORN_COUNTRIES) {
    const regex = new RegExp(`\\b${country}\\b`, 'i');
    if (regex.test(combined)) {
      matchedCountry = country === 'UK' ? 'United Kingdom' : (country === 'UAE' ? 'UAE' : country);
      break;
    }
  }

  // Also check pattern like "in a hospital in <Country/Abroad>"
  if (!matchedCountry) {
    const hospPattern = /in (?:a )?hospital in ([A-Za-z\s]+?)(?: for|\.|$)/i;
    const match = desc.match(hospPattern) || details.match(hospPattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (!/^(torn|the city|hospital)$/i.test(extracted)) {
        matchedCountry = extracted.charAt(0).toUpperCase() + extracted.slice(1);
      }
    }
  }

  const isAbroad = !!matchedCountry || /\babroad\b/i.test(combined) || state === 'Abroad';
  const isHospital = state === 'Hospital' || /hospital/i.test(state);
  const isHospitalAbroad = isHospital && isAbroad;

  return {
    isAbroad,
    country: matchedCountry || (isAbroad ? 'Abroad' : null),
    isHospitalAbroad
  };
};

/**
 * Cleans status description text for clean timer / status display.
 * Strips HTML tags and removes "Hospitalized for " or "In a hospital in [Country] for " prefixes.
 *
 * @param {string} description - Raw status description.
 * @returns {string}
 */
export const cleanStatusDescription = (description) => {
  if (!description) return '';
  return description
    .replace(/<[^>]+>/g, '')
    .replace(/^(?:In (?:a )?hospital (?:in [A-Za-z\s]+? )?for |Hospitalized for )/i, '')
    .trim();
};

/**
 * Resolves the location/country of a user or target from their Torn status object.
 *
 * @param {Object} status - Torn status object ({ state, description, details }).
 * @returns {{ country: string, isAbroad: boolean, state: string, isTraveling: boolean }}
 */
export const getUserLocation = (status) => {
  if (!status) {
    return { country: 'Torn', isAbroad: false, state: 'Okay', isTraveling: false };
  }
  const state = status.state || 'Okay';
  const isTraveling = state === 'Traveling';
  const abroadInfo = getHospitalAbroadInfo(status);

  let country = 'Torn';
  if (abroadInfo.isAbroad) {
    country = abroadInfo.country || 'Abroad';
  } else if (isTraveling) {
    country = null;
  }

  return {
    country,
    isAbroad: abroadInfo.isAbroad,
    state,
    isTraveling
  };
};

/**
 * Computes the dynamic status priority tier (1-7) for an enemy target relative to the user.
 * Lower numbers represent higher priority:
 * 1: Okay - Same Country
 * 2: Okay - Different Country
 * 3: Hospital - Same Country
 * 4: Hospital - Different Country
 * 5: Abroad
 * 6: Traveling
 * 7: In Jail / Other
 *
 * @param {Object} memberStatus - Enemy member status object.
 * @param {Object} userStatus - Current player user status object.
 * @returns {number} The priority tier from 1 to 7.
 */
export const getDynamicStatusTier = (memberStatus, userStatus) => {
  const memberLoc = getUserLocation(memberStatus);
  const userLoc = getUserLocation(userStatus);

  const memberState = memberStatus?.state || 'Okay';
  const isSameCountry = !!(
    memberLoc.country &&
    userLoc.country &&
    memberLoc.country.toLowerCase() === userLoc.country.toLowerCase()
  );

  if (memberState === 'Okay') {
    return isSameCountry ? 1 : 2;
  }
  if (memberState === 'Hospital') {
    return isSameCountry ? 3 : 4;
  }
  if (memberState === 'Abroad') {
    return 5;
  }
  if (memberState === 'Traveling' || memberLoc.isTraveling) {
    return 6;
  }
  return 7;
};


/**
 * Retrieves cached target data for a given enemy faction from localStorage.
 *
 * @param {string|number} enemyFactionId - The enemy faction ID.
 * @returns {{ factionData: Object, profiles: Object, fetchedAt: number }|null}
 */
export const getTargetsCache = (enemyFactionId) => {
  if (!enemyFactionId) return null;
  try {
    const raw = localStorage.getItem(`tornagator_targets_${enemyFactionId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.factionData) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[TORNagator] Failed to read targets cache from localStorage:', e);
  }
  return null;
};

/**
 * Persists target data for a given enemy faction to localStorage.
 *
 * @param {string|number} enemyFactionId - The enemy faction ID.
 * @param {Object} data - The target payload ({ factionData, profiles, fetchedAt }).
 */
export const setTargetsCache = (enemyFactionId, data) => {
  if (!enemyFactionId || !data) return;
  try {
    localStorage.setItem(`tornagator_targets_${enemyFactionId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('[TORNagator] Failed to write targets cache to localStorage:', e);
  }
};

/**
 * Clears target cache for a given enemy faction from localStorage.
 *
 * @param {string|number} enemyFactionId - The enemy faction ID.
 */
export const clearTargetsCache = (enemyFactionId) => {
  if (!enemyFactionId) return;
  try {
    localStorage.removeItem(`tornagator_targets_${enemyFactionId}`);
  } catch (e) {
    console.warn('[TORNagator] Failed to clear targets cache:', e);
  }
};

/**
 * Cleans up old war target caches that do not match the current enemy faction ID.
 * If currentEnemyFactionId is null (war ended), all old war target caches are removed.
 *
 * @param {string|number|null} currentEnemyFactionId - The currently active enemy faction ID, or null if no war.
 */
export const cleanupOldWarCaches = (currentEnemyFactionId) => {
  try {
    const targetPrefix = 'tornagator_targets_';
    const keepKey = currentEnemyFactionId ? `${targetPrefix}${currentEnemyFactionId}` : null;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(targetPrefix) && key !== keepKey) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[TORNagator] Failed to clean up old war caches:', e);
  }
};


