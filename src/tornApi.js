const BASE_URL = 'https://api.torn.com';

/**
 * Fetches user data from Torn API.
 *
 * @param {string} apiKey - The user's private API key.
 * @param {string} [selections='basic,profile'] - Comma separated list of data selections to retrieve.
 * @returns {Promise<Object>} A promise resolving to the user data object.
 * @throws {Error} If the API returns an error or the request fails.
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
 * Fetches basic faction data from the Torn API.
 * Additionally attempts to resolve and populate the names of the leader and co-leader.
 *
 * @param {string} apiKey - The user's private API key.
 * @returns {Promise<Object>} A promise resolving to the faction data object.
 * @throws {Error} If the API returns an error or the request fails.
 */
export const fetchFactionData = async (apiKey) => {
  try {
    const url = `${BASE_URL}/faction/?selections=basic,rankedwars,chain,upgrades&key=${apiKey}`;
    console.log('[TORNagator API] Fetching faction data from URL:', url.replace(apiKey, 'HIDDEN_KEY'));
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.error || 'Unknown API Error');
    }

    const leaderId = data.leader;
    if (leaderId && leaderId !== 0) {
      data.leader_name = data.members?.[leaderId]?.name;
      if (!data.leader_name) {
        try {
          const leaderRes = await fetch(`${BASE_URL}/user/${leaderId}?selections=basic&key=${apiKey}`);
          const leaderData = await leaderRes.json();
          data.leader_name = leaderData.name || 'Unknown';
        } catch (e) {
          data.leader_name = 'Unknown';
        }
      }
    }

    const coLeaderId = data['co-leader'];
    if (coLeaderId && coLeaderId !== 0) {
      data.co_leader_name = data.members?.[coLeaderId]?.name;
      if (!data.co_leader_name) {
        try {
          const coLeaderRes = await fetch(`${BASE_URL}/user/${coLeaderId}?selections=basic&key=${apiKey}`);
          const coLeaderData = await coLeaderRes.json();
          data.co_leader_name = coLeaderData.name || 'Unknown';
        } catch (e) {
          data.co_leader_name = 'Unknown';
        }
      }
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches basic faction data for a specific faction ID
 * Fetches basic profile data for a specific faction by its ID.
 *
 * @param {string} apiKey - The user's private API key.
 * @param {string|number} factionId - The ID of the faction to fetch.
 * @returns {Promise<Object>} A promise resolving to the faction data object.
 * @throws {Error} If the API returns an error or the request fails.
 */
export const fetchFactionById = async (apiKey, factionId) => {
  try {
    const response = await fetch(`${BASE_URL}/faction/${factionId}?selections=basic&key=${apiKey}`);
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
 * Fetches the complete list of items from the Torn API.
 *
 * @param {string} apiKey - The user's private API key.
 * @returns {Promise<Object>} A promise resolving to an object mapping item IDs to item data.
 * @throws {Error} If the API returns an error or the request fails.
 */
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
 * Note: The API does not allow fetching multiple categories at once; we fetch only 'Flower'.
 *
 * @param {string} apiKey - The user's private API key.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of inventory items.
 * @throws {Error} If the API returns an error or the request fails.
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