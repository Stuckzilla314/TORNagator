import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBarTimer } from './useBarTimer';
import { useTravelTimer } from './useTravelTimer';

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

// ─── Main Component ──────────────────────────────────────────────────────────

const TornView = ({ userData }) => {
  const [iframeUrl, setIframeUrl] = useState('https://www.torn.com/index.php');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNavHref, setActiveNavHref] = useState('https://www.torn.com/index.php');
  const iframeRef = useRef(null);

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
    setActiveNavHref(href);
    setIframeUrl(href);
  }, []);

  // Iframe block detection removed: assuming user uses extension to bypass X-Frame-Options

  const moneyFormatted = userData?.money_onhand != null
    ? `$${Number(userData.money_onhand).toLocaleString()}`
    : userData?.personalstats?.moneymugged != null
    ? null
    : null;

  return (
    <div className="torn-view-root">
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
              className={`torn-quicknav-btn${activeNavHref === href ? ' active' : ''}`}
              onClick={() => navigateTo(href)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="torn-quicknav-open">
          <a
            href={activeNavHref}
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
        <div className={`torn-iframe-panel${sidebarCollapsed ? ' sidebar-hidden' : ''}`}>
          <webview
            ref={iframeRef}
            src={iframeUrl}
            title="TORN.com"
            className="torn-iframe"
            allowpopups="true"
          />
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
