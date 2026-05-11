import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import UserDashboard from './UserDashboard';
import OverseasStock from './OverseasStock';
import { fetchUserData, fetchTornItems } from './tornApi';

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('torn_api_key') || '');
  const [userData, setUserData] = useState(null);
  const [itemsData, setItemsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    let interval;
    if (apiKey) {
      loadData(true);
      // Polling every 30 seconds to stay well within TORN's 100/min rate limit
      interval = setInterval(() => {
        loadData(false);
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [apiKey]);

  // Fetch static item data once
  const loadData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const [user, items] = await Promise.all([
        fetchUserData(apiKey, 'basic,profile,bars,travel'),
        itemsData ? Promise.resolve(itemsData) : fetchTornItems(apiKey)
      ]);
      setUserData(user);
      setItemsData(items);
      localStorage.setItem('torn_api_key', apiKey);
    } catch (err) {
      setError(err.message);
      // Only clear the key if it's explicitly an "Incorrect Key" error from TORN
      if (err.message.toLowerCase().includes('key')) {
        setApiKey('');
        localStorage.removeItem('torn_api_key');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setApiKey('');
    setUserData(null);
    localStorage.removeItem('torn_api_key');
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
            <OverseasStock itemsData={itemsData} />
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