import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoginForm from './LoginForm';
import UserDashboard from './UserDashboard';
import './App.css';
import OverseasStock from './OverseasStock';
import FactionWar from './FactionWar';
import TornView from './TornView';
import SettingsMenu from './SettingsMenu';
import ApiLogsView from './ApiLogsView';
import { fetchUserData, fetchTornItems, fetchUserInventoryV2, fetchFactionData } from './tornApi';
import { useTravelTimer } from './useTravelTimer';
import { IconGamepad, IconPlane, IconHospital, IconScales, IconClock } from './Icons';

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
      'tornagator_items_cache', 'tornagator_country_filter', 'torn_view_url',
      'tornagator_lifetime_torn', 'tornagator_lifetime_yata', 'tornagator_lifetime_firebase'
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
      'tornagator_items_cache',
      'tornagator_country_filter',
      'torn_view_url',
      'tornagator_lifetime_torn',
      'tornagator_lifetime_yata',
      'tornagator_lifetime_firebase'
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
  const [requestedUrl, setRequestedUrl] = useState(null);
  const [targetCountry, setTargetCountry] = useState(null);

  const handleOpenInTorn = useCallback((url, country = null) => {
    setRequestedUrl(url);
    setTargetCountry(country);
    setActiveTab('torn');
  }, [setActiveTab]);
  const [showTabTimer, setShowTabTimer] = useLocalStorage('show_tab_timer', true);
  const [stockAutoSync, setStockAutoSync] = useLocalStorage('tornagator_stock_auto_sync', true);
  const [cargoCapacity, setCargoCapacity] = useLocalStorage('cargo_capacity', 5);
  const [manualOverride, setManualOverride] = useLocalStorage('manual_override', false);
  const [countryFilter, setCountryFilter] = useLocalStorage('tornagator_country_filter', 'All');

  const loadedApiKeyRef = useRef(null); // Ref to track the API key for which data has been loaded
  // Track travel time for the browser tab title
  const travelTimeLeft = useTravelTimer(
    (userData?.status?.state === 'Traveling' || userData?.status?.state === 'Hospital' || userData?.status?.state === 'Jail')
      ? (userData?.travel?.arrival_at || userData?.travel?.timestamp || userData?.status?.until)
      : 0
  );

  const isElectron = typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron;

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
      const user = await fetchUserData(apiKey, 'basic,profile,bars,travel,personalstats,money');
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
    let lastFetchTime = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastFetchTime >= 29000) {
          loadDashboardData(false);
          lastFetchTime = Date.now();
        }
      }
    };

    if (apiKey) {
      if (!hasInitialSyncRun.current) {
        hasInitialSyncRun.current = true;
        loadDashboardData(true);
        lastFetchTime = Date.now();
      }

      document.addEventListener('visibilitychange', handleVisibilityChange);

      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          if (Date.now() - lastFetchTime >= 29000) {
            loadDashboardData(false);
            lastFetchTime = Date.now();
          }
        }
      }, 30000);
    }
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

    const checkOverseasSync = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // Sync on :00, :05, :10...
      if (minutes % 5 === 0 && seconds < 30) {
        const lastSync = parseInt(sessionStorage.getItem('last_overseas_sync_minute') || '-1');
        if (lastSync !== minutes) {
          loadOverseasData();
          sessionStorage.setItem('last_overseas_sync_minute', minutes.toString());
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkOverseasSync();
      }
    };

    if (apiKey && activeTab === 'stock' && stockAutoSync) {
      // Initial fetch
      if (!hasOverseasSyncRun.current) {
        hasOverseasSyncRun.current = true;
        loadOverseasData();
      }

      document.addEventListener('visibilitychange', handleVisibilityChange);

      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          checkOverseasSync();
        }
      }, 10000);
    } else if (activeTab !== 'stock') {
      hasOverseasSyncRun.current = false;
    }
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    <div style={{
      backgroundColor: '#0f0f0f',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      color: '#e0e0e0',
      lineHeight: '1.6',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {isElectron && (
        <div style={{
          height: '40px',
          backgroundColor: '#161616',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid #222',
          userSelect: 'none',
          WebkitAppRegion: 'drag',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={`${process.env.PUBLIC_URL}/alligator.png`}
              alt="TORNagator"
              style={{ width: '28px', height: '28px', objectFit: 'contain', imageRendering: 'auto' }}
            />
            <span style={{ fontWeight: 'bold', letterSpacing: '0.5px', color: '#ffffff', fontSize: '0.95rem' }}>TORNagator</span>
            {showTabTimer && travelTimeLeft && (
              <span style={{
                marginLeft: '12px',
                padding: '2px 8px',
                backgroundColor: userData?.status?.state === 'Traveling' ? 'rgba(52, 152, 219, 0.2)' :
                                 userData?.status?.state === 'Hospital' ? 'rgba(231, 76, 60, 0.2)' :
                                 userData?.status?.state === 'Jail' ? 'rgba(243, 156, 18, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${
                                 userData?.status?.state === 'Traveling' ? '#3498db' :
                                 userData?.status?.state === 'Hospital' ? '#e74c3c' :
                                 userData?.status?.state === 'Jail' ? '#f39c12' : '#888'
                }`,
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: userData?.status?.state === 'Traveling' ? '#3498db' :
                       userData?.status?.state === 'Hospital' ? '#e74c3c' :
                       userData?.status?.state === 'Jail' ? '#f39c12' : '#e0e0e0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {userData?.status?.state === 'Traveling' ? <IconPlane size={13} color={"#3498db"} /> :
                   userData?.status?.state === 'Hospital' ? <IconHospital size={13} color={"#e74c3c"} /> :
                   userData?.status?.state === 'Jail' ? <IconScales size={13} color={"#f39c12"} /> : <IconClock size={13} color={"#aaa"} />}
                </span>
                <span>{travelTimeLeft}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {apiKey && (
        <div style={{
          position: 'fixed',
          top: isElectron
            ? (activeTab === 'torn' ? '51px' : '44px')
            : (activeTab === 'torn' ? '11px' : '5px'),
          right: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`settings-gear-btn${isSettingsOpen ? ' active' : ''}`}
            title="Settings"
            aria-label="Settings"
            aria-expanded={isSettingsOpen}
            style={{ padding: 0 }}
          >
            <svg
              stroke="currentColor"
              fill="none"
              strokeWidth="2"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '15px', height: '15px' }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

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

      <div style={{
        flex: 1,
        overflowY: activeTab === 'torn' ? 'hidden' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        padding: activeTab === 'torn' ? '0' : '20px',
        boxSizing: 'border-box'
      }}>
        {!apiKey && <LoginForm onLogin={setApiKey} />}

        {apiKey && userData && (
          <>
            <nav style={{
              display: 'flex',
              gap: '10px',
              marginBottom: activeTab === 'torn' ? '0' : '30px',
              borderBottom: '1px solid #333',
              width: '100%',
              maxWidth: '100%',
              margin: activeTab === 'torn' ? '0' : '0 auto 30px auto',
              padding: activeTab === 'torn' ? '8px 20px 0 20px' : '0',
              position: activeTab === 'torn' ? 'relative' : undefined,
              zIndex: activeTab === 'torn' ? 10 : undefined
            }}>
              <div style={navItemStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>Dashboard</div>
              <div style={navItemStyle('faction')} onClick={() => setActiveTab('faction')}>Faction War</div>
              <div style={navItemStyle('stock')} onClick={() => setActiveTab('stock')}>Overseas Stock</div>
              <div style={{ ...navItemStyle('torn'), display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setActiveTab('torn')}><IconGamepad size={14} color={activeTab === 'torn' ? '#3498db' : '#888'} /> TORN</div>
              <div style={{ ...navItemStyle('apilogs'), display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setActiveTab('apilogs')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'apilogs' ? '#3498db' : '#888'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '1px' }}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                API Monitor
              </div>
            </nav>

            {activeTab === 'dashboard' ? (
              <UserDashboard userData={userData} onLogout={handleLogout} onOpenInTorn={handleOpenInTorn} />
            ) : activeTab === 'faction' ? (
              <FactionWar apiKey={apiKey} factionData={factionData} userData={userData} onOpenInTorn={handleOpenInTorn} />
            ) : activeTab === 'torn' ? (
              <TornView 
                userData={userData} 
                apiKey={apiKey} 
                requestedUrl={requestedUrl} 
                setRequestedUrl={setRequestedUrl}
                targetCountry={targetCountry}
                setTargetCountry={setTargetCountry}
                itemsData={itemsData}
                cargoCapacity={cargoCapacity}
              />
            ) : activeTab === 'apilogs' ? (
              <ApiLogsView />
            ) : (
              <OverseasStock
                itemsData={itemsData}
                userData={userData}
                cargoCapacity={cargoCapacity}
                autoSyncStock={stockAutoSync}
                onManualSync={loadOverseasData}
                filter={countryFilter}
                setFilter={setCountryFilter}
                onOpenInTorn={handleOpenInTorn}
              />
            )}
          </>
        )}

        {loading && !userData && <p style={{ textAlign: 'center' }}>Loading TORN data...</p>}
        {error && <div style={{ color: '#ff4444', marginBottom: '10px' }}>Error: {error}</div>}
        {apiKey && !userData && !loading && !error && <p>Initializing connection...</p>}
      </div>
    </div>
  );
}

export default App;