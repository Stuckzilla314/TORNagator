import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoginForm from './LoginForm';
import UserDashboard from './UserDashboard';
import OverseasStock from './OverseasStock';
import FactionWar from './FactionWar';
import SettingsMenu from './SettingsMenu';
import { fetchUserData, fetchTornItems, fetchUserInventoryV2, fetchFactionData } from './tornApi';
import { useTravelTimer } from './useTravelTimer';

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;
      if (item === 'true' || item === '"true"') return true;
      if (item === 'false' || item === '"false"') return false;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof storedValue === 'boolean') {
        window.localStorage.setItem(key, storedValue ? 'true' : 'false');
      } else if (typeof storedValue === 'string') {
        window.localStorage.setItem(key, storedValue);
      } else {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      // Catch QuotaExceededError or other write errors
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// Synchronously purge stale/large localStorage entries before App mounts.
// Runs at module load time so state initializers always have free space to write.
(function purgeStaleStorage() {
  try {
    const ownedKeys = new Set([
      'torn_api_key', 'active_tab', 'show_tab_timer',
      'tornagator_stock_auto_sync', 'cargo_capacity', 'manual_override',
      'tornagator_items_cache'
    ]);
    // Remove known stale keys from previous feature iterations
    ['auto_sync_stock', 'setting_refresh_stock_auto', 'app_stock_sync_v2'].forEach(k => localStorage.removeItem(k));
    // Remove any unrecognized key whose value is large (> ~5 KB)
    const toPurge = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!ownedKeys.has(k) && (localStorage.getItem(k) || '').length > 2500) toPurge.push(k);
    }
    toPurge.forEach(k => { console.warn(`[TORNagator] Purging oversized localStorage key: "${k}"`); localStorage.removeItem(k); });
  } catch (e) { /* ignore */ }
})();

function App() {
  // On mount: purge stale/orphaned localStorage keys from old app versions
  useEffect(() => {
    // Keys we actually own in the current version
    const ownedKeys = new Set([
      'torn_api_key',
      'active_tab',
      'show_tab_timer',
      'tornagator_stock_auto_sync',
      'cargo_capacity',
      'manual_override',
      'tornagator_items_cache'
    ]);

    // Stale keys from previous iterations of this feature
    const staleKeys = [
      'auto_sync_stock',
      'setting_refresh_stock_auto',
      'app_stock_sync_v2',
    ];
    staleKeys.forEach(k => localStorage.removeItem(k));

    // Also nuke any unrecognized key with a large value (> 10 KB)
    // This catches any accidental large-object caching from prior code
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!ownedKeys.has(k)) {
        const v = localStorage.getItem(k) || '';
        if (v.length > 5000) { // > ~10 KB in UTF-16
          keysToDelete.push(k);
        }
      }
    }
    keysToDelete.forEach(k => {
      console.warn(`[TORNagator] Removing large/unrecognized localStorage key: "${k}"`);
      localStorage.removeItem(k);
    });
  }, []);

  const [apiKey, setApiKey] = useState(localStorage.getItem('torn_api_key') || '');
  const [userData, setUserData] = useState(null);
  const [factionData, setFactionData] = useState(null);
  const [itemsData, setItemsData] = useState(null);
  const itemsDataRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useLocalStorage('active_tab', 'dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showTabTimer, setShowTabTimer] = useLocalStorage('show_tab_timer', true);
  const [stockAutoSync, setStockAutoSync] = useLocalStorage('tornagator_stock_auto_sync', true);
  const [cargoCapacity, setCargoCapacity] = useLocalStorage('cargo_capacity', 5);
  const [manualOverride, setManualOverride] = useLocalStorage('manual_override', false);

  const loadedApiKeyRef = useRef(null); // Ref to track the API key for which data has been loaded
  // Track travel time for the browser tab title
  const travelTimeLeft = useTravelTimer(
    (userData?.status?.state === 'Traveling' || userData?.status?.state === 'Hospital' || userData?.status?.state === 'Jail')
      ? (userData?.travel?.arrival_at || userData?.travel?.timestamp || userData?.status?.until)
      : 0
  );

  useEffect(() => {
    if (showTabTimer && travelTimeLeft) {
      document.title = `TORNagator | ${travelTimeLeft}`;
    } else {
      document.title = 'TORNagator';
    }
  }, [travelTimeLeft, showTabTimer]);

  // Fetch Dashboard data (user only — faction is fetched separately on-demand)
  const loadDashboardData = useCallback(async (isInitial = false) => {
    if (!apiKey) return;
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const user = await fetchUserData(apiKey, 'basic,profile,bars,travel');
      setUserData(prev => prev ? { ...prev, ...user } : user);
      try {
        localStorage.setItem('torn_api_key', apiKey);
      } catch (e) {
        console.warn("Could not save API key to localStorage:", e);
      }
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes('key')) {
        setApiKey('');
        localStorage.removeItem('torn_api_key');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [apiKey]);

  // Fetch Faction data — only called on-demand when visiting the Faction War tab
  const loadFactionData = useCallback(async () => {
    if (!apiKey) return;
    try {
      const faction = await fetchFactionData(apiKey);
      if (faction && !faction.error) setFactionData(faction);
    } catch (err) {
      console.warn("Faction data fetch failed", err);
    }
  }, [apiKey]);

  // Load cached items/inventory on mount
  useEffect(() => {
    try {
      // 1. Items Data (LocalStorage - long lived)
      const cachedItemsRaw = localStorage.getItem('tornagator_items_cache');
      if (cachedItemsRaw) {
        const { data, timestamp } = JSON.parse(cachedItemsRaw);
        // Cache valid for 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setItemsData(data);
          itemsDataRef.current = data;
        }
      }

      // 2. Inventory (SessionStorage - survives refresh but tab-specific)
      const cachedInvRaw = sessionStorage.getItem('tornagator_inventory_cache');
      if (cachedInvRaw) {
        const inventory = JSON.parse(cachedInvRaw);
        setUserData(prev => prev ? { ...prev, inventory } : { inventory });
      }
    } catch (e) {
      console.warn("Cache restoration failed:", e);
    }
  }, []);

  // Fetch Overseas Stock data (Inventory & Items)
  const loadOverseasData = useCallback(async () => {
    if (!apiKey) return;
    try {
      const currentItems = itemsDataRef.current;
      const [items, inventory] = await Promise.all([
        currentItems ? Promise.resolve(currentItems) : fetchTornItems(apiKey),
        fetchUserInventoryV2(apiKey)
      ]);

      if (!currentItems) {
        itemsDataRef.current = items;
        setItemsData(items);
        try {
          localStorage.setItem('tornagator_items_cache', JSON.stringify({ data: items, timestamp: Date.now() }));
        } catch (e) { console.warn("Items cache failed:", e); }
      }
      
      setUserData(prev => prev ? { ...prev, inventory } : { inventory });
      try {
        sessionStorage.setItem('tornagator_inventory_cache', JSON.stringify(inventory));
      } catch (e) { console.warn("Inventory cache failed:", e); }
      
    } catch (err) {
      console.error("Overseas Data Fetch Error:", err);
    }
  }, [apiKey]);

  const hasInitialSyncRun = useRef(false);
  const hasFactionSyncRun = useRef(false);
  const hasOverseasSyncRun = useRef(false);

  // Always recurring dashboard fetch (user data only)
  useEffect(() => {
    let interval;
    if (apiKey) {
      if (!hasInitialSyncRun.current) {
        hasInitialSyncRun.current = true;
        loadDashboardData(true);
      }
      interval = setInterval(() => {
        loadDashboardData(false);
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [apiKey, loadDashboardData]);

  // Fetch faction data whenever the faction tab is activated
  useEffect(() => {
    if (apiKey && activeTab === 'faction') {
      if (!hasFactionSyncRun.current) {
        hasFactionSyncRun.current = true;
        loadFactionData();
      }
    } else {
      hasFactionSyncRun.current = false;
    }
  }, [apiKey, activeTab, loadFactionData]);

  // Overseas fetch based on stockAutoSync (Only if on Stock tab)
  useEffect(() => {
    let interval;
    if (apiKey && activeTab === 'stock' && stockAutoSync) {
      if (!hasOverseasSyncRun.current) {
        hasOverseasSyncRun.current = true;
        loadOverseasData();
      }
      interval = setInterval(loadOverseasData, 30000);
    } else if (activeTab !== 'stock') {
      hasOverseasSyncRun.current = false;
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [apiKey, activeTab, stockAutoSync, loadOverseasData]);

  const handleLogout = () => {
    setApiKey('');
    setUserData(null);
    localStorage.removeItem('torn_api_key');
    loadedApiKeyRef.current = null; // Reset the ref on logout
  };

  const calculateCapacity = (data) => {
    // 1. Base capacity check based on method or property setup
    const method = data.travel?.method || "";
    const base15Methods = ["Airstrip", "Private", "Business", "Pilot", "WLT Block"];
    let total = 5;

    // WLT Stock benefit check
    const hasWLT = (data.stock_perks || []).some(perk => perk.toLowerCase().includes("wlt block"));

    // Check travel method or check if user has an airstrip PI (Base 15)
    const hasAirstripPI = data.properties && Object.values(data.properties).some(p =>
      p.modifications?.airstrip === 1 || p.staff?.pilot === 1
    );

    if (base15Methods.includes(method) || hasAirstripPI || hasWLT) {
      total = 15;
    }

    // 2. Aggregate perks from categorized selections (faction_perks, job_perks, etc.)
    const perkCategories = [
      'faction_perks',
      'job_perks',
      'property_perks',
      'education_perks',
      'enhancer_perks',
      'book_perks',
      'stock_perks'
      // Note: WLT Block is handled in base capacity, but if it also appears as a numerical perk,
      // it will be caught by the generic "carrying capacity" check below.
    ];

    perkCategories.forEach(cat => {
      const perks = data[cat] || [];
      perks.forEach(perk => {
        const p = perk.toLowerCase();
        let capacityBonus = 0;

        // Parse generic "travel item capacity" or "carrying capacity"
        const genericMatch = p.match(/(\d+)\s+(?:travel item|carrying capacity)/);
        if (genericMatch) {
          capacityBonus = parseInt(genericMatch[1], 10);
        }
        // Parse specific "additional flowers" or "additional plushies" bonuses
        const flowerPlushieMatch = p.match(/(\d+)\s+additional\s+(?:flowers|plushies)/);
        if (flowerPlushieMatch) {
          capacityBonus = parseInt(flowerPlushieMatch[1], 10);
        }

        total += capacityBonus;
      });
    });

    return total;
  };

  const syncTravelData = async () => {
    if (!apiKey) return;
    try {
      // Fetch travel, categorized perks, and properties via a combined V2 selection
      const response = await fetch(`https://api.torn.com/user/?selections=travel,perks,properties&key=${apiKey}`);
      const data = await response.json();
      // Fetch inventory separately using the dedicated V2 inventory endpoint
      const inventoryData = await fetchUserInventoryV2(apiKey);

      if (!data.error && !manualOverride) {
        const calculated = calculateCapacity({ ...data, inventory: inventoryData });
        setCargoCapacity(calculated);

        // Merge calculations back into userData for the UI
        setUserData(prev => prev ? {
          ...prev,
          travel: { ...prev.travel, ...data.travel, calculatedCapacity: calculated },
          inventory: inventoryData
        } : null);
      }
    } catch (err) {
      console.error("Travel sync failed:", err);
    }
  };

  const navItemStyle = (tab) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    borderBottom: activeTab === tab ? '2px solid #3498db' : '2px solid transparent',
    color: activeTab === tab ? '#3498db' : '#888',
    fontWeight: 'bold',
    transition: 'all 0.3s ease'
  });

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh', padding: '20px', color: '#e0e0e0', lineHeight: '1.6' }}>
      {apiKey && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          <div
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            style={{
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: '#1e1e1e',
              border: `1px solid ${isSettingsOpen ? '#3498db' : '#444'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="Settings"
          >
            ⚙️
          </div>

          {isSettingsOpen && (
            <SettingsMenu
              userData={userData}
              showTabTimer={showTabTimer}
              setShowTabTimer={setShowTabTimer}
              stockAutoSync={stockAutoSync}
              setStockAutoSync={setStockAutoSync}
              cargoCapacity={cargoCapacity}
              setCargoCapacity={setCargoCapacity}
              manualOverride={manualOverride}
              setManualOverride={setManualOverride}
              onSyncTravel={syncTravelData}
            />
          )}
        </div>
      )}

      {!apiKey && <LoginForm onLogin={setApiKey} />}

      {apiKey && userData && (
        <>
          <nav style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '30px',
            borderBottom: '1px solid #333',
            maxWidth: '1200px',
            margin: '0 auto 30px auto'
          }}>
            <div style={navItemStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>Dashboard</div>
            <div style={navItemStyle('faction')} onClick={() => setActiveTab('faction')}>Faction War</div>
            <div style={navItemStyle('stock')} onClick={() => setActiveTab('stock')}>Overseas Stock</div>
          </nav>

          {activeTab === 'dashboard' ? (
            <UserDashboard userData={userData} onLogout={handleLogout} />
          ) : activeTab === 'faction' ? (
            <FactionWar apiKey={apiKey} factionData={factionData} userData={userData} />
          ) : (
            <OverseasStock itemsData={itemsData} userData={userData} cargoCapacity={cargoCapacity} autoSyncStock={stockAutoSync} onManualSync={loadOverseasData} />
          )}
        </>
      )}

      {loading && !userData && <p style={{ textAlign: 'center' }}>Loading TORN data...</p>}
      {error && <div style={{ color: '#ff4444', marginBottom: '10px' }}>Error: {error}</div>}
      {apiKey && !userData && !loading && !error && <p>Initializing connection...</p>}
    </div>
  );
}

export default App;