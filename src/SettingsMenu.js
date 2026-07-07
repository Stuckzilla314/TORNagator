import React, { useState, useEffect } from 'react';
import { isNotificationsSupported, checkNotificationPermission, requestNotificationPermission } from './notifications';
import { isCapacitor } from './utils';

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
 * @param {boolean} props.travelNotificationsEnabled - Whether travel landing notifications are enabled.
 * @param {Function} props.setTravelNotificationsEnabled - Setter for the travel landing notifications.
 * @param {boolean} props.chainWatcherEnabled - Whether the persistent chain watcher banner is enabled (Android only).
 * @param {Function} props.setChainWatcherEnabled - Setter for the chain watcher banner toggle.
 * @param {number} props.chainWatcherInterval - The polling interval for the chain watcher banner.
 * @param {Function} props.setChainWatcherInterval - Setter for the chain watcher polling interval.
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
  setPollInterval,
  travelNotificationsEnabled,
  setTravelNotificationsEnabled,
  chainWatcherEnabled,
  setChainWatcherEnabled,
  chainWatcherInterval,
  setChainWatcherInterval,
  baldrHighestStat,
  setBaldrHighestStat
}) => {  

  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const notificationsSupported = isNotificationsSupported();

  useEffect(() => {
    if (notificationsSupported) {
      checkNotificationPermission().then(status => {
        setPermissionStatus(status);
      });
    }
  }, [notificationsSupported]);

  const handleRequestPermission = async () => {
    const status = await requestNotificationPermission();
    setPermissionStatus(status);
  };

  const handleOpenDevTools = () => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('open-devtools');
      } catch (e) {
        console.error('Failed to open DevTools:', e);
      }
    } else {
      alert('Developer Tools can only be opened when running inside the desktop app.');
    }
  };

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

      {/* Chain Watcher toggle — Android/Capacitor only */}
      {isCapacitor && (
        <label
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '4px',
            backgroundColor: chainWatcherEnabled ? 'rgba(46, 204, 113, 0.1)' : 'transparent',
            transition: 'background-color 0.2s'
          }}
        >
          <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔗 Chain Watcher
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
            <select
              value={chainWatcherInterval}
              onChange={(e) => setChainWatcherInterval(parseInt(e.target.value, 10))}
              disabled={!chainWatcherEnabled}
              style={{
                backgroundColor: '#2b2b2b',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                padding: '2px 20px 2px 6px',
                fontSize: '0.75rem',
                cursor: chainWatcherEnabled ? 'pointer' : 'not-allowed',
                outline: 'none',
                opacity: chainWatcherEnabled ? 1 : 0.5,
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 6px center',
                backgroundSize: '10px',
                transition: 'border-color 0.2s, background-color 0.2s'
              }}
              onMouseEnter={e => {
                if (chainWatcherEnabled) {
                  e.target.style.borderColor = '#3498db';
                  e.target.style.backgroundColor = '#333';
                }
              }}
              onMouseLeave={e => {
                if (chainWatcherEnabled) {
                  e.target.style.borderColor = '#444';
                  e.target.style.backgroundColor = '#2b2b2b';
                }
              }}
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={20}>20s</option>
              <option value={30}>30s</option>
              <option value={45}>45s</option>
              <option value={60}>1m</option>
            </select>
            <input
              type="checkbox"
              checked={chainWatcherEnabled}
              onChange={(e) => setChainWatcherEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </label>
      )}

      <label 
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          transition: 'background-color 0.2s'
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>Highest Stat</span>
        <select
          value={baldrHighestStat}
          onChange={(e) => setBaldrHighestStat(e.target.value)}
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
          <option value="strength">Strength</option>
          <option value="defense">Defense</option>
          <option value="speed">Speed</option>
          <option value="dexterity">Dexterity</option>
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

      {notificationsSupported && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #333', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#3498db', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
            Notifications
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem' }}>Permission</span>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 'bold',
              color: permissionStatus === 'granted' ? '#2ecc71' : 
                     permissionStatus === 'denied' ? '#e74c3c' : '#f39c12'
            }}>
              {permissionStatus.charAt(0).toUpperCase() + permissionStatus.slice(1)}
            </span>
          </div>

          {permissionStatus !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              style={{
                padding: '6px 10px',
                backgroundColor: '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                transition: 'background-color 0.2s',
                textAlign: 'center',
                marginTop: '2px'
              }}
              onMouseEnter={e => { e.target.style.backgroundColor = '#2980b9'; }}
              onMouseLeave={e => { e.target.style.backgroundColor = '#3498db'; }}
            >
              Grant Permission
            </button>
          )}

          <label 
            style={{
              padding: '6px 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>Travel Alerts</span>
            <input 
              type="checkbox" 
              checked={travelNotificationsEnabled} 
              onChange={(e) => setTravelNotificationsEnabled(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
          </label>
        </div>
      )}

      {!isCapacitor && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #333', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleOpenDevTools}
            style={{
              padding: '8px 12px',
              backgroundColor: '#34495e',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              transition: 'background-color 0.2s',
              textAlign: 'center'
            }}
            onMouseEnter={e => { e.target.style.backgroundColor = '#2c3e50'; }}
            onMouseLeave={e => { e.target.style.backgroundColor = '#34495e'; }}
          >
            Open DevTools
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;