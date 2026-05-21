import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBarTimer } from './useBarTimer';
import { useTravelTimer } from './useTravelTimer';

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_NAV = [
  { label: '🏠 Home',     href: 'https://www.torn.com/index.php' },
  { label: '⚔️ Attack',   href: 'https://www.torn.com/loader.php?sid=attack' },
  { label: '⚡ Crimes',   href: 'https://www.torn.com/crimes.php' },
  { label: '🏋️ Gym',      href: 'https://www.torn.com/gym.php' },
  { label: '🏥 Hospital', href: 'https://www.torn.com/hospital.php' },
  { label: '🏛️ City',     href: 'https://www.torn.com/city.php' },
  { label: '🏪 Bazaar',   href: 'https://www.torn.com/bazaar.php' },
  { label: '📈 Market',   href: 'https://www.torn.com/imarket.php' },
  { label: '🏦 Bank',     href: 'https://www.torn.com/bank.php' },
  { label: '✈️ Travel',   href: 'https://www.torn.com/travelagency.php' },
  { label: '🗂️ Faction',  href: 'https://www.torn.com/factions.php' },
  { label: '🎯 Events',   href: 'https://www.torn.com/events.php' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const SidebarStatBar = ({ label, current, max, color, timeRemaining, href, onNavigate }) => {
  const pct = Math.min(100, ((current || 0) / (max || 1)) * 100);

  const handleClick = () => {
    if (onNavigate && href) onNavigate(href);
  };

  return (
    <div
      className="torn-stat-bar"
      onClick={handleClick}
      title={href ? `Open ${label} page` : undefined}
      style={{ cursor: href ? 'pointer' : 'default' }}
    >
      <div className="torn-stat-bar-header">
        <span className="torn-stat-bar-label" style={{ color }}>
          {label}
          {href && <span className="torn-stat-bar-arrow">↗</span>}
        </span>
        <span className="torn-stat-bar-value">
          {current ?? '—'} / {max ?? '—'}
          {timeRemaining && (
            <span className="torn-stat-bar-timer">{timeRemaining}</span>
          )}
        </span>
      </div>
      <div className="torn-stat-track">
        <div
          className="torn-stat-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
};

const StatusCard = ({ icon, title, description, detail, timeLeft, releaseTime, accentColor }) => (
  <div className="torn-status-card" style={{ borderColor: accentColor, '--accent': accentColor }}>
    <div className="torn-status-card-title" style={{ color: accentColor }}>
      {icon} {title}
    </div>
    <div className="torn-status-card-desc">{description}</div>
    {detail && <div className="torn-status-card-detail">{detail}</div>}
    <div className="torn-status-card-time" style={{ color: accentColor }}>
      {timeLeft || 'Resolving…'}
    </div>
    {releaseTime && (
      <div className="torn-status-card-eta">ETA {releaseTime}</div>
    )}
  </div>
);

// ─── WebviewTab Component ────────────────────────────────────────────────────────
const WebviewTab = ({ tab, isActive, onUpdate }) => {
  const webviewRef = useRef(null);
  const initialUrlRef = useRef(tab.url);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const handleNavigate = (e) => {
      if (e.url.includes('__cf_chl_') || e.url.includes('/cdn-cgi/')) {
        return;
      }
      onUpdate(tab.id, { url: e.url });
    };
    const handleTitle = (e) => onUpdate(tab.id, { title: e.title });

    wv.addEventListener('did-navigate', handleNavigate);
    wv.addEventListener('did-navigate-in-page', handleNavigate);
    wv.addEventListener('page-title-updated', handleTitle);

    return () => {
      wv.removeEventListener('did-navigate', handleNavigate);
      wv.removeEventListener('did-navigate-in-page', handleNavigate);
      wv.removeEventListener('page-title-updated', handleTitle);
    };
  }, [tab.id, onUpdate]);

  return (
    <webview
      ref={webviewRef}
      src={initialUrlRef.current}
      useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      title={tab.title}
      className="torn-iframe"
      allowpopups="true"
      style={{ display: isActive ? 'flex' : 'none', flex: 1, height: '100%', width: '100%' }}
    />
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const TornView = ({ userData, requestedUrl, setRequestedUrl }) => {
  const defaultTab = { id: 'home', url: 'https://www.torn.com/index.php', title: 'Torn' };
  const [tabs, setTabs] = useLocalStorage('torn_browser_tabs', [defaultTab]);
  const [activeTabId, setActiveTabId] = useLocalStorage('torn_browser_active_tab', 'home');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeTabUrl = tabs.find(t => t.id === activeTabId)?.url || 'https://www.torn.com/index.php';

  useEffect(() => {
    if (requestedUrl) {
      const newTabId = `tab-${Date.now()}`;
      setTabs(prev => [...prev, { id: newTabId, url: requestedUrl, title: 'Torn' }]);
      setActiveTabId(newTabId);
      setRequestedUrl(null);
    }
  }, [requestedUrl, setTabs, setActiveTabId, setRequestedUrl]);

  const handleTabUpdate = useCallback((id, updates) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, [setTabs]);

  const handleCloseTab = (e, id) => {
    e.stopPropagation();
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const newTabs = prev.filter(t => t.id !== id);
      if (newTabs.length === 0) return [defaultTab];
      if (activeTabId === id) {
        // Switch to the adjacent tab
        const nextTab = newTabs[idx] || newTabs[idx - 1] || newTabs[0];
        setActiveTabId(nextTab.id);
      }
      return newTabs;
    });
  };

  const handleNewTab = (initialUrl = 'https://www.torn.com/index.php') => {
    const id = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id, url: initialUrl, title: 'New Tab' }]);
    setActiveTabId(id);
  };

  // ── Stat timers
  const lifeTimer    = useBarTimer(userData?.life);
  const energyTimer  = useBarTimer(userData?.energy);
  const nerveTimer   = useBarTimer(userData?.nerve);
  const happyTimer   = useBarTimer(userData?.happy);

  const isTraveling    = userData?.status?.state === 'Traveling';
  const isHospitalized = userData?.status?.state === 'Hospital';
  const isJailed       = userData?.status?.state === 'Jail';
  const hasSpecialStatus = isTraveling || isHospitalized || isJailed;

  const landingUntil  = userData?.travel?.timestamp || userData?.status?.until;
  const statusUntil   = userData?.status?.until;
  const travelTimeLeft = useTravelTimer(isTraveling ? landingUntil : 0);
  const statusTimeLeft = useTravelTimer((isHospitalized || isJailed) ? statusUntil : 0);

  const formatTime = (ts) =>
    ts > 0 ? new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  const landingTime = formatTime(landingUntil);
  const releaseTime = formatTime(statusUntil);

  const statusColor =
    userData?.status?.color === 'blue' ? '#3498db' :
    userData?.status?.color === 'red'  ? '#e74c3c' : '#2ecc71';

  // ── Iframe navigation
  const navigateTo = useCallback((href) => {
    const id = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id, url: href, title: 'Loading...' }]);
    setActiveTabId(id);
  }, [setTabs, setActiveTabId]);

  // Iframe block detection removed: assuming user uses extension to bypass X-Frame-Options

  const moneyFormatted = userData?.money_onhand != null
    ? `$${Number(userData.money_onhand).toLocaleString()}`
    : userData?.personalstats?.moneymugged != null
    ? null
    : null;

  return (
    <div className="torn-view-root" style={{ height: '100%', flex: 1, minHeight: 0 }}>
      {/* ── Quick Nav Bar ─────────────────────────────────────────────── */}
      <div className="torn-quicknav">
        <div className="torn-quicknav-brand">
          <span className="torn-quicknav-dot" />
          TORN Overlay
        </div>
        <div className="torn-quicknav-links">
          {QUICK_NAV.map(({ label, href }) => (
            <button
              key={href}
              className={`torn-quicknav-btn${activeTabUrl.includes(href) ? ' active' : ''}`}
              onClick={() => navigateTo(href)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="torn-quicknav-open">
          <a
            href={activeTabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="torn-open-btn"
          >
            Open in Tab ↗
          </a>
        </div>
      </div>

      {/* ── Main Layout ──────────────────────────────────────────────── */}
      <div className="torn-main-layout">

        {/* ── iframe Panel ─────────────────────────────────────────── */}
        <div className={`torn-iframe-panel${sidebarCollapsed ? ' sidebar-hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Tab Bar UI */}
          <div className="torn-tab-bar" style={{ display: 'flex', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333', padding: '0 8px', overflowX: 'auto' }}>
            {tabs.map(tab => (
              <div 
                key={tab.id} 
                onClick={() => setActiveTabId(tab.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '4px 12px', 
                  backgroundColor: activeTabId === tab.id ? '#2c2c2c' : 'transparent',
                  borderTopLeftRadius: '6px',
                  borderTopRightRadius: '6px',
                  cursor: 'pointer',
                  minWidth: '120px',
                  maxWidth: '200px',
                  borderRight: '1px solid #333',
                  borderTop: activeTabId === tab.id ? '2px solid #e74c3c' : '2px solid transparent'
                }}
              >
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem', color: activeTabId === tab.id ? '#fff' : '#aaa' }}>
                  {tab.title || 'Torn'}
                </span>
                <button 
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginLeft: '8px', fontSize: '1rem', lineHeight: '1' }}
                >×</button>
              </div>
            ))}
            <button 
              onClick={handleNewTab}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 12px', fontSize: '1rem' }}
            >+</button>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {tabs.map(tab => (
              <WebviewTab key={tab.id} tab={tab} isActive={activeTabId === tab.id} onUpdate={handleTabUpdate} />
            ))}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className={`torn-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
          {/* Collapse toggle */}
          <button
            className="torn-sidebar-toggle"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '◀' : '▶'}
          </button>

          {!sidebarCollapsed && (
            <div className="torn-sidebar-inner">
              {/* Player header */}
              <div className="torn-sidebar-header">
                <div className="torn-sidebar-avatar">
                  {userData?.name?.[0] ?? '?'}
                </div>
                <div className="torn-sidebar-player">
                  <div className="torn-sidebar-name">{userData?.name ?? 'Unknown'}</div>
                  <div className="torn-sidebar-meta">
                    <span className="torn-sidebar-level">Lv {userData?.level}</span>
                    <span
                      className="torn-sidebar-status-dot"
                      style={{ backgroundColor: statusColor }}
                      title={userData?.status?.description}
                    />
                    <span className="torn-sidebar-status-text" style={{ color: statusColor }}>
                      {userData?.status?.state}
                    </span>
                  </div>
                </div>
              </div>

              {/* Special status card */}
              {hasSpecialStatus && (
                <div className="torn-sidebar-section">
                  {isTraveling && (
                    <StatusCard
                      icon="✈️"
                      title="Traveling"
                      description={userData.status?.description}
                      timeLeft={travelTimeLeft}
                      releaseTime={landingTime}
                      accentColor="#3498db"
                    />
                  )}
                  {isHospitalized && (
                    <StatusCard
                      icon="🏥"
                      title="Hospitalized"
                      description={userData.status?.description}
                      detail={userData.status?.details}
                      timeLeft={statusTimeLeft}
                      releaseTime={releaseTime}
                      accentColor="#e74c3c"
                    />
                  )}
                  {isJailed && (
                    <StatusCard
                      icon="⚖️"
                      title="Jailed"
                      description={userData.status?.description}
                      timeLeft={statusTimeLeft}
                      releaseTime={releaseTime}
                      accentColor="#f39c12"
                    />
                  )}
                </div>
              )}

              {/* Stat bars */}
              <div className="torn-sidebar-section">
                <div className="torn-sidebar-section-title">Live Stats</div>
                <SidebarStatBar
                  label="⚡ Energy"
                  current={userData?.energy?.current}
                  max={userData?.energy?.maximum}
                  color="#f1c40f"
                  timeRemaining={energyTimer}
                  href="https://www.torn.com/gym.php"
                  onNavigate={navigateTo}
                />
                <SidebarStatBar
                  label="🔴 Nerve"
                  current={userData?.nerve?.current}
                  max={userData?.nerve?.maximum}
                  color="#e74c3c"
                  timeRemaining={nerveTimer}
                  href="https://www.torn.com/crimes.php"
                  onNavigate={navigateTo}
                />
                <SidebarStatBar
                  label="😊 Happy"
                  current={userData?.happy?.current}
                  max={userData?.happy?.maximum}
                  color="#3498db"
                  timeRemaining={happyTimer}
                  href="https://www.torn.com/properties.php"
                  onNavigate={navigateTo}
                />
                <SidebarStatBar
                  label="💚 Life"
                  current={userData?.life?.current}
                  max={userData?.life?.maximum}
                  color="#2ecc71"
                  timeRemaining={lifeTimer}
                  href="https://www.torn.com/hospital.php"
                  onNavigate={navigateTo}
                />
              </div>

              {/* Money */}
              {moneyFormatted && (
                <div className="torn-sidebar-section">
                  <div className="torn-sidebar-section-title">Finances</div>
                  <div
                    className="torn-money-card"
                    onClick={() => navigateTo('https://www.torn.com/bank.php')}
                    title="Open Bank"
                  >
                    <span className="torn-money-label">💰 Cash on Hand</span>
                    <span className="torn-money-value">{moneyFormatted}</span>
                  </div>
                </div>
              )}

              {/* Quick links */}
              <div className="torn-sidebar-section">
                <div className="torn-sidebar-section-title">Quick Actions</div>
                <div className="torn-sidebar-quicklinks">
                  {[
                    { label: '⚔️ Attack',  href: 'https://www.torn.com/loader.php?sid=attack' },
                    { label: '⚡ Crimes',  href: 'https://www.torn.com/crimes.php' },
                    { label: '📈 Market',  href: 'https://www.torn.com/imarket.php' },
                    { label: '✈️ Travel',  href: 'https://www.torn.com/travelagency.php' },
                    { label: '🎯 Events',  href: 'https://www.torn.com/events.php' },
                    { label: '🏪 Bazaar',  href: 'https://www.torn.com/bazaar.php' },
                  ].map(({ label, href }) => (
                    <button
                      key={href}
                      className="torn-sidebar-quicklink-btn"
                      onClick={() => navigateTo(href)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="torn-sidebar-footer">
                <span>Live • refreshes every 30s</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default TornView;
