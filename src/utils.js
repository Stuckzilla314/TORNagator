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

