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
const WebviewTab = ({ tab, isActive, onUpdate, targetCountry, setTargetCountry, itemsData }) => {
  const webviewRef = useRef(null);
  const initialUrlRef = useRef(tab.url);

  const trySelectCountry = useCallback((attempt = 1) => {
    const wv = webviewRef.current;
    if (!wv || !targetCountry) return;

    let currentUrl = '';
    try {
      currentUrl = wv.getURL() || '';
    } catch (e) {
      return;
    }

    if (!currentUrl.includes('travelagency.php') && !currentUrl.includes('sid=travel')) return;

    console.log(`TORNagator: Triggering selectCountry (attempt ${attempt}) for:`, targetCountry);
    const script = `
      (() => {
        const countryName = ${JSON.stringify(targetCountry)};
        const targetNormalized = countryName.toLowerCase();
        
        const codes = {
          "mexico": ["mex", "mexico"],
          "cayman islands": ["cay", "cayman", "cayman islands"],
          "canada": ["can", "canada"],
          "hawaii": ["haw", "hawaii"],
          "united kingdom": ["uni", "united kingdom", "uk", "great britain", "london"],
          "argentina": ["arg", "argentina"],
          "switzerland": ["swi", "switzerland"],
          "japan": ["jap", "japan", "tokyo"],
          "china": ["chi", "china", "beijing"],
          "uae": ["uae", "united arab emirates", "dubai", "abu dhabi"],
          "south africa": ["sou", "south africa", "johannesburg", "capetown", "cape town"]
        };

        let matchedKey = targetNormalized;
        for (const [canonical, aliases] of Object.entries(codes)) {
          if (canonical === targetNormalized || aliases.includes(targetNormalized)) {
            matchedKey = canonical;
            break;
          }
        }

        const radios = document.querySelectorAll('input[type="radio"][name="destination"]');
        for (const r of radios) {
          const label = (r.getAttribute('aria-label') || '').toLowerCase();
          if (label.includes(matchedKey) || matchedKey.includes(label)) {
            r.click();
            r.dispatchEvent(new Event('change', { bubbles: true }));
            r.dispatchEvent(new Event('input', { bubbles: true }));
            
            if (r.nextElementSibling && r.nextElementSibling.classList.contains('pin___kahDJ')) {
              r.nextElementSibling.click();
              r.nextElementSibling.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }

            setTimeout(() => {
              window.scrollTo(0, document.body.scrollHeight);
              if (document.documentElement) {
                document.documentElement.scrollTop = document.documentElement.scrollHeight;
              }
            }, 150);

            return true;
          }
        }

        const clickables = document.querySelectorAll('.pin___kahDJ, [class*="pin___" i], [class*="destination" i], button, a');
        for (const el of clickables) {
          const text = (el.textContent || '').toLowerCase().trim();
          const bg = (el.style.backgroundImage || '').toLowerCase();
          const className = (el.className || '').toLowerCase();
          
          if (text.includes(matchedKey) || bg.includes(matchedKey) || className.includes(matchedKey)) {
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            setTimeout(() => {
              window.scrollTo(0, document.body.scrollHeight);
              if (document.documentElement) {
                document.documentElement.scrollTop = document.documentElement.scrollHeight;
              }
            }, 150);

            return true;
          }
        }

        return false;
      })()
    `;

    wv.executeJavaScript(script)
      .then(result => {
        console.log("TORNagator: executeJavaScript selectCountry result:", result);
        if (result) {
          setTargetCountry(null);
        } else if (attempt < 15) {
          setTimeout(() => {
            trySelectCountry(attempt + 1);
          }, 400);
        }
      })
      .catch(err => {
        console.error("TORNagator: executeJavaScript failed:", err);
        if (attempt < 15) {
          setTimeout(() => {
            trySelectCountry(attempt + 1);
          }, 400);
        }
      });
  }, [targetCountry, setTargetCountry]);

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

  useEffect(() => {
    if (isActive && targetCountry) {
      const timer = setTimeout(() => {
        trySelectCountry();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, targetCountry, trySelectCountry]);



  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;


    const handleDomReady = () => {
      wv.insertCSS(`
        [class*="swiper-slide"][class*="slide___"] {
          width: 60px !important;
        }
        [class*="mobileLink___"] span {
          font-size: 9px !important;
          color: #d1d5db !important;
          text-transform: uppercase !important;
          font-weight: bold !important;
          overflow: visible !important;
          white-space: nowrap !important;
        }
        [class*="mobileLink___"]:hover span {
          color: #ffffff !important;
        }
        [class*="active___"] [class*="mobileLink___"] span {
          color: #ffffff !important;
          text-shadow: 0 0 3px rgba(255, 255, 255, 0.4) !important;
        }
      `).catch(err => {
        console.error("TORNagator: Failed to insert CSS:", err);
      });

      if (isActive && targetCountry) {
        setTimeout(() => {
          trySelectCountry();
        }, 500);
      }
    };

    wv.addEventListener('dom-ready', handleDomReady);
    return () => {
      wv.removeEventListener('dom-ready', handleDomReady);
    };
  }, [isActive, targetCountry, trySelectCountry]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !isActive || !itemsData) return;

    // Map item names to their market values from the database
    const itemsMarketValues = {};
    Object.values(itemsData).forEach(item => {
      if (item.name && item.market_value) {
        itemsMarketValues[item.name.toLowerCase()] = item.market_value;
      }
    });

    const script = `
      (() => {
        try {
          const marketValues = ${JSON.stringify(itemsMarketValues)};
          const sortedNames = Object.keys(marketValues).sort((a, b) => b.length - a.length);

          // 1. Find and update header cells
          const headers = Array.from(document.querySelectorAll('[class*="itemsHeader___"]')).filter(el => {
            const text = el.textContent || '';
            return text.includes('Cost') && text.includes('Stock');
          });

          for (const headerRow of headers) {
            const cells = Array.from(headerRow.children);
            const costHeaderCell = cells.find(cell => cell.textContent.trim().toLowerCase().includes('cost'));
            if (!costHeaderCell) continue;

            const costBtn = costHeaderCell.querySelector('button');
            if (costBtn && !costBtn.querySelector('.injected-profit-header-span')) {
              const profitHeaderSpan = document.createElement('span');
              profitHeaderSpan.className = 'injected-profit-header-span';
              profitHeaderSpan.textContent = ' (Profit)';
              profitHeaderSpan.style.color = '#888888';
              profitHeaderSpan.style.fontWeight = 'normal';
              profitHeaderSpan.style.fontSize = '0.85em';
              profitHeaderSpan.style.marginLeft = '4px';
              costBtn.appendChild(profitHeaderSpan);
            }
          }

          // Cleanup any previously injected profit columns/headers if they exist in DOM
          document.querySelectorAll('.injected-profit-header, .injected-profit-cell').forEach(el => el.remove());

          // 2. Find and update item rows
          const rows = Array.from(document.querySelectorAll('[class*="row___"]')).filter(row => {
            const hasInput = Array.from(row.querySelectorAll('input')).some(inp => {
              const type = (inp.getAttribute('type') || 'text').toLowerCase();
              return type !== 'button' && type !== 'submit' && type !== 'image' && type !== 'hidden';
            });
            const hasButton = row.querySelector('button, a, [role="button"], input[type="button"], input[type="submit"]');
            return hasInput && hasButton && row.children.length >= 5;
          });

          for (const row of rows) {
            // Find header row for this item row
            const tableWrapper = row.closest('[class*="stockTableWrapper___"]') || row.parentElement?.parentElement;
            const headerRow = tableWrapper ? tableWrapper.querySelector('[class*="itemsHeader___"]') : null;
            if (!headerRow) continue;

            const originalHeaderCells = Array.from(headerRow.children);
            const costHeaderIdx = originalHeaderCells.findIndex(cell => cell.textContent.toLowerCase().includes('cost'));
            const nameHeaderIdx = originalHeaderCells.findIndex(cell => cell.textContent.toLowerCase().includes('name'));
            if (costHeaderIdx === -1 || nameHeaderIdx === -1) continue;

            const originalRowCells = Array.from(row.children);
            const costCell = originalRowCells[costHeaderIdx];
            const nameCell = originalRowCells[nameHeaderIdx];
            if (!costCell || !nameCell) continue;

            const nameSpan = nameCell.querySelector('.injected-market-price');
            let itemName = nameCell.textContent;
            if (nameSpan) {
              itemName = itemName.replace(nameSpan.textContent, '');
            }
            itemName = itemName.trim().toLowerCase();

            let marketValue = 0;
            let matchedName = '';
            for (const name of sortedNames) {
              if (itemName.includes(name)) {
                marketValue = marketValues[name];
                matchedName = name;
                break;
              }
            }

            if (matchedName) {
              let priceSpan = nameCell.querySelector('.injected-market-price');
              if (!priceSpan) {
                priceSpan = document.createElement('span');
                priceSpan.className = 'injected-market-price';
                priceSpan.style.color = '#888888';
                priceSpan.style.fontSize = '0.8em';
                priceSpan.style.marginLeft = '8px';
                nameCell.appendChild(priceSpan);
              }
              priceSpan.textContent = marketValue > 0 ? '($' + marketValue.toLocaleString() + ')' : '(N/A)';
            }

            const neededSpaceSpan = costCell.querySelector('[class*="neededSpace___"]');
            const costText = (neededSpaceSpan || costCell).textContent.replace(/[^0-9]/g, '');
            const cost = parseInt(costText, 10) || 0;
            const profitPerItem = marketValue - cost;

            // Exclude submit, button, and image inputs to target the text/number Qty input specifically
            const input = Array.from(row.querySelectorAll('input')).find(inp => {
              const type = (inp.getAttribute('type') || 'text').toLowerCase();
              return type !== 'button' && type !== 'submit' && type !== 'image' && type !== 'hidden';
            });
            
            const updateRowProfit = () => {
              if (!input) return;
              
              let priceSpan = costCell.querySelector('[class*="displayPrice___"]') || costCell;
              let profitSpan = priceSpan.querySelector('.injected-profit-span');
              if (!profitSpan) {
                profitSpan = document.createElement('span');
                profitSpan.className = 'injected-profit-span';
                profitSpan.style.marginLeft = '6px';
                profitSpan.style.fontWeight = 'bold';
                profitSpan.style.fontSize = '0.9em';
                priceSpan.appendChild(profitSpan);
              }

              const qtyVal = input.value.trim();
              const qty = qtyVal ? (parseInt(qtyVal, 10) || 0) : 0;
              const totalProfit = profitPerItem * qty;
              
              if (marketValue === 0) {
                profitSpan.textContent = ' (N/A)';
                profitSpan.style.color = '#888888';
              } else if (qty === 0) {
                profitSpan.textContent = ' (+$0)';
                profitSpan.style.color = '#888888';
              } else {
                profitSpan.textContent = ' (' + (totalProfit < 0 ? '-' : '+') + '$' + Math.abs(totalProfit).toLocaleString() + ')';
                profitSpan.style.color = totalProfit > 0 ? '#10b981' : '#ef4444';
              }
            };

            updateRowProfit();

            if (input && !input.dataset.hasProfitListener) {
              input.dataset.hasProfitListener = 'true';
              input.addEventListener('input', updateRowProfit);
              input.addEventListener('change', updateRowProfit);
            }
          }
        } catch (e) {
          console.error("Profit injection error:", e);
        }
      })()
    `;

    const profitInterval = setInterval(() => {
      wv.executeJavaScript(script).catch(() => {});
    }, 1000);

    return () => clearInterval(profitInterval);
  }, [isActive, itemsData]);

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

const TornView = ({ userData, requestedUrl, setRequestedUrl, targetCountry, setTargetCountry, itemsData }) => {
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
              <WebviewTab 
                key={tab.id} 
                tab={tab} 
                isActive={activeTabId === tab.id} 
                onUpdate={handleTabUpdate} 
                targetCountry={targetCountry}
                setTargetCountry={setTargetCountry}
                itemsData={itemsData}
              />
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
