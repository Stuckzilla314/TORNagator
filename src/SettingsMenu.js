import React from 'react';

const SettingsMenu = ({ 
  userData, 
  showTabTimer, 
  setShowTabTimer, 
  stockAutoSync,
  setStockAutoSync,
  cargoCapacity, 
  setCargoCapacity, 
  manualOverride, 
  setManualOverride, 
  onSyncTravel 
}) => {  

  return (
    <div style={{
      position: 'absolute',
      top: '45px',
      right: '0',
      backgroundColor: '#1e1e1e',
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '200px',
      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      color: '#e0e0e0'
    }}>
      <label 
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '4px',
          backgroundColor: showTabTimer ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
          transition: 'background-color 0.2s'
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>Show Tab Timer</span>
        <input 
          type="checkbox" 
          checked={showTabTimer} 
          onChange={(e) => setShowTabTimer(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
      </label>

      <label 
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '4px',
          backgroundColor: stockAutoSync ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
          transition: 'background-color 0.2s'
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>Auto-Sync Stock</span>
        <input 
          type="checkbox" 
          checked={stockAutoSync} 
          onChange={(e) => setStockAutoSync(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
      </label>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #333', marginTop: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.8rem', color: '#888' }}>Cargo Capacity</span>
          <span style={{ fontSize: '0.9rem', color: manualOverride ? '#3498db' : '#666', fontWeight: 'bold' }}>{cargoCapacity}</span>
        </div>

        {/* Manual Override: Indented and smaller font as requested */}
        <label 
          style={{
            padding: '2px 0 8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: '#aaa' }}>Manual Override</span>
          <input 
            type="checkbox" 
            checked={manualOverride} 
            onChange={(e) => setManualOverride(e.target.checked)}
            style={{ cursor: 'pointer', transform: 'scale(0.8)' }}
          />
        </label>

        <input 
          type="range" 
          min="5" 
          max="100" 
          value={cargoCapacity} 
          disabled={!manualOverride}
          onChange={(e) => setCargoCapacity(parseInt(e.target.value))}
          style={{ width: '100%', cursor: manualOverride ? 'pointer' : 'not-allowed', accentColor: manualOverride ? '#3498db' : '#555', opacity: manualOverride ? 1 : 0.6 }}
        />
        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px', textAlign: 'center' }}>
          {manualOverride ? "⚠ Manual override active" : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ color: userData?.travel?.calculatedCapacity ? '#2ecc71' : '#aaa' }}>
                {userData?.travel?.calculatedCapacity ? "✓ Calculated from API" : "(Awaiting capacity sync)"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSyncTravel) onSyncTravel();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Force Refresh"
              >
                🔄
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;