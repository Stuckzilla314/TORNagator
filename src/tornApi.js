const BASE_URL = 'https://api.torn.com';

/**
 * Fetches user data from Torn API
 * @param {string} apiKey - The user's private API key
 * @param {string} selections - Comma separated list of selections
 */
export const fetchUserData = async (apiKey, selections = 'basic,profile') => {
  try {
    const response = await fetch(`${BASE_URL}/user/?selections=${selections}&key=${apiKey}`);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.error || 'Unknown API Error');
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const fetchTornItems = async (apiKey) => {
  try {
    const response = await fetch(`${BASE_URL}/torn/?selections=items&key=${apiKey}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.error || 'Unknown API Error');
    return data.items || {};
  } catch (error) {
    throw error;
  }
};