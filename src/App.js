import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoginForm from './LoginForm';
import UserDashboard from './UserDashboard';
import OverseasStock from './OverseasStock';
import SettingsMenu from './SettingsMenu';
import { fetchUserData, fetchTornItems, fetchUserInventoryV2 } from './tornApi';
import { useTravelTimer } from './useTravelTimer';

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('torn_api_key') || '');
  const [userData, setUserData] = useState(null);
  const [itemsData, setItemsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showTabTimer, setShowTabTimer] = useState(() => {
    const saved = localStorage.getItem('show_tab_timer');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [cargoCapacity, setCargoCapacity] = useState(() => {
    const saved = localStorage.getItem('cargo_capacity');
    return saved !== null ? JSON.parse(saved) : 5;
  });
  const [manualOverride, setManualOverride] = useState(() => {
    const saved = localStorage.getItem('manual_override');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const loadedApiKeyRef = useRef(null); // Ref to track the API key for which data has been loaded
  // Track travel time for the browser tab title
  const travelTimeLeft = useTravelTimer(
    userData?.profile?.status?.state === 'Traveling' 
      ? (userData?.travel?.arrival_at || userData?.travel?.timestamp || userData?.profile?.status?.until) 
      : 0
  );

  useEffect(() => {
    if (showTabTimer && travelTimeLeft) {
      document.title = `TORNagator | ${travelTimeLeft}`;
    } else {
      document.title = 'TORNagator';
    }
  }, [travelTimeLeft, showTabTimer]);

  // Fetch static item data once
  const loadData = useCallback(async (isInitial = false) => {
    if (!apiKey) return; // Ensure apiKey is available

    if (isInitial) setLoading(true);
    setError(null);
    try {
      const [user, items, inventory] = await Promise.all([
        fetchUserData(apiKey, 'basic,profile,bars,travel'),
        itemsData ? Promise.resolve(itemsData) : fetchTornItems(apiKey),
        fetchUserInventoryV2(apiKey)
      ]);

      setUserData({ ...user, inventory: inventory });
      setItemsData(items);
      localStorage.setItem('torn_api_key', apiKey);
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes('key')) {
        setApiKey('');
        localStorage.removeItem('torn_api_key');
      }
    } finally {
      setLoading(false);
    }
  }, [apiKey, itemsData]); // Dependencies for useCallback

  useEffect(() => {
    if (apiKey && apiKey !== loadedApiKeyRef.current) {
      loadData(true);
      loadedApiKeyRef.current = apiKey; // Update the ref to the current API key
    }
  }, [apiKey, loadData]);

  useEffect(() => {
    localStorage.setItem('show_tab_timer', JSON.stringify(showTabTimer));
  }, [showTabTimer]);

  useEffect(() => {
    localStorage.setItem('cargo_capacity', JSON.stringify(cargoCapacity));
  }, [cargoCapacity]);

  useEffect(() => {
    localStorage.setItem('manual_override', JSON.stringify(manualOverride));
  }, [manualOverride]);

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
            <div style={navItemStyle('stock')} onClick={() => setActiveTab('stock')}>Overseas Stock</div>
          </nav>

          {activeTab === 'dashboard' ? (
            <UserDashboard userData={userData} onLogout={handleLogout} />
          ) : (
            <OverseasStock itemsData={itemsData} userData={userData} cargoCapacity={cargoCapacity} />
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