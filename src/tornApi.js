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

/**
 * Fetches basic faction data from Torn API
 * @param {string} apiKey - The user's private API key
 */
export const fetchFactionData = async (apiKey) => {
  try {
    const response = await fetch(`${BASE_URL}/faction/?selections=basic&key=${apiKey}`);
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

/**
 * Fetches user inventory using TORN v2 API.
 * Since v2 requires category-specific calls, we fetch the common categories 
 * used in overseas trading and merge them into a single object.
 */
export const fetchUserInventoryV2 = async (apiKey) => {
  const categories = [
    'Medical', 'Drug', 'Temporary', 'Melee', 'Primary', 
    'Secondary', 'Armor', 'Plushie', 'Flower', 'Booster', 'Miscellaneous'
  ];

  const allItems = {};
  try {
    const results = await Promise.all(
      categories.map(cat => 
        fetch(`${BASE_URL}/v2/user/inventory?cat=${cat}&key=${apiKey}&limit=100`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      )
    );

    results.forEach(data => {
      if (data?.inventory?.items) {
        data.inventory.items.forEach(item => {
          const id = Number(item.id);
          // Aggregate quantities in case an item appears in multiple categories
          allItems[id] = (allItems[id] || 0) + (item.amount || 0);
        });
      }
    });
    return Object.entries(allItems).map(([id, amount]) => ({
      id: Number(id),
      amount: amount
    }));
  } catch (error) {
    console.error("V2 Inventory Fetch Error:", error);
    return [];
  }
};