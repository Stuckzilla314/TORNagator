import React from 'react';

/**
 * Renders the settings menu dropdown, allowing the user to configure app preferences
 * such as the tab timer display, stock auto-sync interval, and manual override of cargo capacity.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.userData - The current user's profile and travel data.
 * @param {boolean} props.showTabTimer - Whether the tab timer should be visible.
 * @param {Function} props.setShowTabTimer - Setter for the tab timer visibility.
 * @param {boolean} props.stockAutoSync - Whether stock auto-sync is enabled.
 * @param {Function} props.setStockAutoSync - Setter for the stock auto-sync toggle.
 * @param {number} props.cargoCapacity - The current estimated cargo capacity.
 * @param {Function} props.setCargoCapacity - Setter for the manual cargo capacity override.
 * @param {boolean} props.manualOverride - Whether the user has manually overridden cargo capacity.
 * @param {Function} props.setManualOverride - Setter for the manual override toggle.
 * @param {Function} props.onSyncTravel - Callback to manually force a sync of the travel/cargo data from the API.
 * @param {number} props.pollInterval - The auto-sync polling interval in seconds (0 for manual).
 * @param {Function} props.setPollInterval - Setter for the polling interval.
 * @returns {React.JSX.Element} The rendered settings menu component.
 */
const SettingsMenu = ({ 
  userData, 
  showTabTimer, 
  setShowTabTimer, 
  showNavControls,
  setShowNavControls,
  stockAutoSync,
  setStockAutoSync,
  cargoCapacity, 
  setCargoCapacity, 
  manualOverride, 
  setManualOverride, 
  onSyncTravel,
  pollInterval,
  setPollInterval
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
      width: '230px',
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
          backgroundColor: showNavControls ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
          transition: 'background-color 0.2s'
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>Show Nav Controls</span>
        <input
          type="checkbox"
          checked={showNavControls}
          onChange={(e) => setShowNavControls(e.target.checked)}
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
      
      <label 
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '4px',
          backgroundColor: pollInterval > 0 ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
          transition: 'background-color 0.2s'
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>Sync Rate</span>
        <select
          value={pollInterval}
          onChange={(e) => setPollInterval(parseInt(e.target.value, 10))}
          style={{
            backgroundColor: '#2b2b2b',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '4px 26px 4px 10px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            backgroundSize: '12px',
            transition: 'border-color 0.2s, background-color 0.2s'
          }}
          onMouseEnter={e => {
            e.target.style.borderColor = '#3498db';
            e.target.style.backgroundColor = '#333';
          }}
          onMouseLeave={e => {
            e.target.style.borderColor = '#444';
            e.target.style.backgroundColor = '#2b2b2b';
          }}
        >
          <option value={30}>30s</option>
          <option value={60}>1m</option>
          <option value={120}>2m</option>
          <option value={300}>5m</option>
          <option value={0}>Manual</option>
        </select>
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
          aria-label="Cargo Capacity"
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
                aria-label="Force Refresh Capacity Sync"
              >
                🔄
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #333', marginTop: '5px', display: 'flex', flexDirection: 'column' }}>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('dump-torn-dom'));
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            transition: 'background-color 0.2s',
            textAlign: 'center'
          }}
          onMouseEnter={e => { e.target.style.backgroundColor = '#c0392b'; }}
          onMouseLeave={e => { e.target.style.backgroundColor = '#e74c3c'; }}
        >
          Dump Crimes DOM
        </button>
      </div>
    </div>
  );
};

export default SettingsMenu;