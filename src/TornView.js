import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBarTimer } from './useBarTimer';
import { useTravelTimer } from './useTravelTimer';
import {
  IconBolt, IconDot, IconSmile, IconHeart,
  IconPlane, IconHospital, IconScales,
  IconCoin, IconWarning, IconChevronRight,
  getQuickActionIcon
} from './Icons';

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
        <span className="torn-stat-bar-label" style={{ color, display: 'flex', alignItems: 'center', gap: '5px' }}>
          {label}
          {href && <IconChevronRight size={11} color={color} style={{ opacity: 0.7 }} />}
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
const WebviewTab = ({ tab, isActive, onUpdate, targetCountry, setTargetCountry, itemsData, cargoCapacity }) => {
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

      const redirScript = `
        (() => {
          const handleStatsClicks = () => {
            const energySelectors = [
              '[class*="energyContainer___"]',
              '[class*="energy___"]',
              '[id*="energy"]',
              '[aria-label*="Energy" i]',
              'div[class*="sidebar"] [class*="energy" i]',
            ];
            
            const nerveSelectors = [
              '[class*="nerveContainer___"]',
              '[class*="nerve___"]',
              '[id*="nerve"]',
              '[aria-label*="Nerve" i]',
              'div[class*="sidebar"] [class*="nerve" i]',
            ];

            let energyEl = null;
            for (const selector of energySelectors) {
              const found = document.querySelector(selector);
              if (found) {
                energyEl = found;
                break;
              }
            }

            let nerveEl = null;
            for (const selector of nerveSelectors) {
              const found = document.querySelector(selector);
              if (found) {
                nerveEl = found;
                break;
              }
            }

            if (!energyEl) {
              const allElements = Array.from(document.querySelectorAll('div, li, p, span, a'));
              energyEl = allElements.find(el => {
                const text = (el.textContent || '').trim();
                return text.startsWith('Energy:') && el.children.length < 8;
              });
            }

            if (!nerveEl) {
              const allElements = Array.from(document.querySelectorAll('div, li, p, span, a'));
              nerveEl = allElements.find(el => {
                const text = (el.textContent || '').trim();
                return text.startsWith('Nerve:') && el.children.length < 8;
              });
            }

            if (energyEl && !energyEl.dataset.redirBound) {
              energyEl.dataset.redirBound = 'true';
              energyEl.style.cursor = 'pointer';
              energyEl.title = 'Go to Gym';
              energyEl.addEventListener('mouseenter', () => {
                energyEl.style.filter = 'brightness(1.2)';
              });
              energyEl.addEventListener('mouseleave', () => {
                energyEl.style.filter = 'none';
              });
              energyEl.style.transition = 'filter 0.2s';
              energyEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = 'https://www.torn.com/gym.php';
              });
            }

            if (nerveEl && !nerveEl.dataset.redirBound) {
              nerveEl.dataset.redirBound = 'true';
              nerveEl.style.cursor = 'pointer';
              nerveEl.title = 'Go to Crimes';
              nerveEl.addEventListener('mouseenter', () => {
                nerveEl.style.filter = 'brightness(1.2)';
              });
              nerveEl.addEventListener('mouseleave', () => {
                nerveEl.style.filter = 'none';
              });
              nerveEl.style.transition = 'filter 0.2s';
              nerveEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = 'https://www.torn.com/crimes.php';
              });
            }
          };

          handleStatsClicks();
          const obs = new MutationObserver(handleStatsClicks);
          obs.observe(document.body, { childList: true, subtree: true });
        })()
      `;
      wv.executeJavaScript(redirScript).catch(err => {
        console.error("TORNagator: Failed to inject stats redir script:", err);
      });
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
          const cargoCapacity = ${cargoCapacity || 5};

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
            const stockHeaderIdx = originalHeaderCells.findIndex(cell => cell.textContent.toLowerCase().includes('stock'));
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

            let stock = Infinity;
            if (stockHeaderIdx !== -1) {
              const stockCell = originalRowCells[stockHeaderIdx];
              if (stockCell) {
                const stockText = stockCell.textContent.replace(/[^0-9]/g, '');
                if (stockText) {
                  stock = parseInt(stockText, 10);
                }
              }
            }

            if (input && !input.dataset.hasDefaultedCargo) {
              input.dataset.hasDefaultedCargo = 'true';
              input.value = Math.min(cargoCapacity, stock);
              // Trigger input events for Torn's page logic to register the value
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
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
              
              // Update display cost based on quantity (default to 1 if quantity is 0)
              const displayQty = qty === 0 ? 1 : qty;
              const totalCost = cost * displayQty;
              let textNode = Array.from(priceSpan.childNodes).find(n => n.nodeType === 3);
              const costDisplayString = '$' + totalCost.toLocaleString();
              if (textNode) {
                textNode.nodeValue = costDisplayString;
              } else {
                priceSpan.insertBefore(document.createTextNode(costDisplayString), priceSpan.firstChild);
              }

              // Calculate profit based on qty, but if stock is 0, base it on cargoCapacity
              const calcQty = (stock === 0) ? cargoCapacity : qty;
              const totalProfit = profitPerItem * calcQty;
              
              if (marketValue === 0) {
                profitSpan.textContent = ' (N/A)';
                profitSpan.style.color = '#888888';
              } else if (calcQty === 0) {
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
  }, [isActive, itemsData, cargoCapacity]);

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

const TornView = ({ userData, requestedUrl, setRequestedUrl, targetCountry, setTargetCountry, itemsData, cargoCapacity }) => {
  const defaultTab = { id: 'home', url: 'https://www.torn.com/index.php', title: 'Torn' };
  const [tabs, setTabs] = useLocalStorage('torn_browser_tabs', [defaultTab]);
  const [activeTabId, setActiveTabId] = useLocalStorage('torn_browser_active_tab', 'home');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const defaultQuickActions = [
    { label: 'Attack',  href: 'https://www.torn.com/loader.php?sid=attack' },
    { label: 'Crimes',  href: 'https://www.torn.com/crimes.php' },
    { label: 'Market',  href: 'https://www.torn.com/imarket.php' },
    { label: 'Travel',  href: 'https://www.torn.com/travelagency.php' },
    { label: 'Events',  href: 'https://www.torn.com/events.php' },
    { label: 'Bazaar',  href: 'https://www.torn.com/bazaar.php' },
  ];
  const [quickActions, setQuickActions] = useLocalStorage('torn_quick_actions', defaultQuickActions);
  const [isEditingQuick, setIsEditingQuick] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [dismissedWarnings, setDismissedWarnings] = useState({});

  const activeTab = tabs.find(t => t.id === activeTabId);
  const isGymPage = activeTab?.url?.includes('gym.php');
  const energyValue = userData?.energy?.current || 0;
  const isStacking = energyValue > 100;
  const showStackingWarning = isGymPage && isStacking && !dismissedWarnings[activeTabId];

  useEffect(() => {
    if (!isGymPage && activeTabId) {
      setDismissedWarnings(prev => {
        if (prev[activeTabId]) {
          const next = { ...prev };
          delete next[activeTabId];
          return next;
        }
        return prev;
      });
    }
  }, [isGymPage, activeTabId]);

  const PRESET_QUICK_ACTIONS = [
    { label: 'Home',     href: 'https://www.torn.com/index.php' },
    { label: 'Attack',   href: 'https://www.torn.com/loader.php?sid=attack' },
    { label: 'Crimes',   href: 'https://www.torn.com/crimes.php' },
    { label: 'Gym',      href: 'https://www.torn.com/gym.php' },
    { label: 'Hospital', href: 'https://www.torn.com/hospital.php' },
    { label: 'City',     href: 'https://www.torn.com/city.php' },
    { label: 'Bazaar',   href: 'https://www.torn.com/bazaar.php' },
    { label: 'Market',   href: 'https://www.torn.com/imarket.php' },
    { label: 'Bank',     href: 'https://www.torn.com/bank.php' },
    { label: 'Travel',   href: 'https://www.torn.com/travelagency.php' },
    { label: 'Faction',  href: 'https://www.torn.com/factions.php' },
    { label: 'Events',   href: 'https://www.torn.com/events.php' },
  ];

  const handleMoveAction = (index, direction) => {
    setQuickActions(prev => {
      const newActions = [...prev];
      const targetIndex = index + direction;
      if (targetIndex >= 0 && targetIndex < newActions.length) {
        const temp = newActions[index];
        newActions[index] = newActions[targetIndex];
        newActions[targetIndex] = temp;
      }
      return newActions;
    });
  };

  const handleRemoveAction = (index) => {
    setQuickActions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveNewAction = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;

    // 🛡️ Sentinel: Prevent DOM-based XSS by restricting URL schemes
    let safeUrl = newUrl.trim();
    const scheme = safeUrl.split(':')[0].toLowerCase();
    if (scheme === 'javascript' || scheme === 'data' || scheme === 'vbscript') {
      alert('Invalid URL scheme for security reasons.');
      return;
    }
    if (!/^https?:\/\//i.test(safeUrl)) {
      safeUrl = 'https://' + safeUrl;
    }

    setQuickActions(prev => [...prev, { label: newLabel.trim(), href: safeUrl }]);
    setNewLabel('');
    setNewUrl('');
    setIsAddingNew(false);
  };

  const [contextMenu, setContextMenu] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleTabContextMenu = (e, tab) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tab
    });
  };

  const handleCopyUrl = (url, tabId) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(tabId);
      setTimeout(() => {
        setCopiedId(null);
        setContextMenu(null);
      }, 1000);
    });
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('contextmenu', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('contextmenu', closeMenu);
    };
  }, []);

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
    // 🛡️ Sentinel: Defense-in-depth against DOM XSS in webview src
    let safeHref = href || '';
    const scheme = safeHref.split(':')[0].toLowerCase();
    if (scheme === 'javascript' || scheme === 'data' || scheme === 'vbscript') {
      console.warn('Blocked navigation to unsafe URL scheme');
      return;
    }
    if (!/^https?:\/\//i.test(safeHref) && safeHref.trim() !== '') {
      safeHref = 'https://' + safeHref;
    }

    const id = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id, url: safeHref, title: 'Loading...' }]);
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
                onContextMenu={(e) => handleTabContextMenu(e, tab)}
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
                  aria-label="Close tab"
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginLeft: '8px', fontSize: '1rem', lineHeight: '1' }}
                  aria-label={`Close ${tab.title || 'tab'}`}
                >×</button>
              </div>
            ))}
            <button 
              onClick={handleNewTab}
              aria-label="New tab"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 12px', fontSize: '1rem' }}
              aria-label="New tab"
            >+</button>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {showStackingWarning && (
              <div className="stacking-warning-banner">
                <IconWarning size={20} color="#fff" />
                <div>
                  <span className="stacking-warning-title">Stacking Warning</span>
                  <span className="stacking-warning-desc">
                    Your energy is {energyValue}/100. You might be stacking and may not want to train in the gym.
                  </span>
                </div>
                <button 
                  className="stacking-warning-close" 
                  onClick={() => setDismissedWarnings(prev => ({ ...prev, [activeTabId]: true }))}
                >
                  ×
                </button>
              </div>
            )}

            {tabs.map(tab => (
              <WebviewTab 
                key={tab.id} 
                tab={tab} 
                isActive={activeTabId === tab.id} 
                onUpdate={handleTabUpdate} 
                targetCountry={targetCountry}
                setTargetCountry={setTargetCountry}
                itemsData={itemsData}
                cargoCapacity={cargoCapacity}
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
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
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
                      icon={<IconPlane size={15} color="#3498db" />}
                      title="Traveling"
                      description={userData.status?.description}
                      timeLeft={travelTimeLeft}
                      releaseTime={landingTime}
                      accentColor="#3498db"
                    />
                  )}
                  {isHospitalized && (
                    <StatusCard
                      icon={<IconHospital size={15} color="#e74c3c" />}
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
                      icon={<IconScales size={15} color="#f39c12" />}
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
                  label={<><IconBolt size={12} color="#f1c40f" /> Energy</>}
                  current={userData?.energy?.current}
                  max={userData?.energy?.maximum}
                  color="#f1c40f"
                  timeRemaining={energyTimer}
                  href="https://www.torn.com/gym.php"
                  onNavigate={navigateTo}
                />
                <SidebarStatBar
                  label={<><IconDot size={10} color="#e74c3c" /> Nerve</>}
                  current={userData?.nerve?.current}
                  max={userData?.nerve?.maximum}
                  color="#e74c3c"
                  timeRemaining={nerveTimer}
                  href="https://www.torn.com/crimes.php"
                  onNavigate={navigateTo}
                />
                <SidebarStatBar
                  label={<><IconSmile size={12} color="#3498db" /> Happy</>}
                  current={userData?.happy?.current}
                  max={userData?.happy?.maximum}
                  color="#3498db"
                  timeRemaining={happyTimer}
                  href="https://www.torn.com/properties.php"
                  onNavigate={navigateTo}
                />
                <SidebarStatBar
                  label={<><IconHeart size={12} color="#2ecc71" /> Life</>}
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
                    <span className="torn-money-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><IconCoin size={13} color="#f1c40f" /> Cash on Hand</span>
                    <span className="torn-money-value">{moneyFormatted}</span>
                  </div>
                </div>
              )}

              {/* Quick links */}
              <div className="torn-sidebar-section">
                <div className="torn-sidebar-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span>Quick Actions</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => {
                        const activeTab = tabs.find(t => t.id === activeTabId);
                        if (activeTab) {
                          setQuickActions(prev => [...prev, { label: activeTab.title || 'Torn Tab', href: activeTab.url }]);
                        }
                      }}
                      title="Add current tab to quick actions"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2ecc71',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        transition: 'all 0.2s'
                      }}
                    >
                      + Add Current
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditingQuick(!isEditingQuick);
                        setIsAddingNew(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3498db',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: isEditingQuick ? 'rgba(52, 152, 219, 0.15)' : 'transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isEditingQuick ? 'Done' : 'Edit'}
                    </button>
                  </div>
                </div>
                
                <div className="torn-sidebar-quicklinks">
                  {quickActions.map((action, index) => (
                    isEditingQuick ? (
                      <div 
                        key={index}
                        style={{
                          position: 'relative',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid #333',
                          borderRadius: '7px',
                          padding: '16px 4px 6px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {/* Delete button */}
                        <button
                          onClick={() => handleRemoveAction(index)}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '4px',
                            background: 'none',
                            border: 'none',
                            color: '#e74c3c',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: '1'
                          }}
                          title="Remove"
                        >
                          ×
                        </button>

                        {(() => { const Icon = getQuickActionIcon(action.href); return <Icon size={16} color="#888" />; })()}

                        <input
                          type="text"
                          value={action.label}
                          onChange={(e) => {
                            const newLabel = e.target.value;
                            setQuickActions(prev => prev.map((qa, i) => i === index ? { ...qa, label: newLabel } : qa));
                          }}
                          style={{
                            width: '90%',
                            fontSize: '0.68rem',
                            backgroundColor: '#111',
                            border: '1px solid #444',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            textAlign: 'center',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                          }}
                          placeholder="Label"
                        />

                        {/* Rearrange arrows */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <button
                            onClick={() => handleMoveAction(index, -1)}
                            disabled={index === 0}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: index === 0 ? '#444' : '#3498db',
                              fontSize: '0.7rem',
                              cursor: index === 0 ? 'default' : 'pointer',
                              padding: '0 4px'
                            }}
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => handleMoveAction(index, 1)}
                            disabled={index === quickActions.length - 1}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: index === quickActions.length - 1 ? '#444' : '#3498db',
                              fontSize: '0.7rem',
                              cursor: index === quickActions.length - 1 ? 'default' : 'pointer',
                              padding: '0 4px'
                            }}
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        key={action.href}
                        className="torn-sidebar-quicklink-btn"
                        onClick={() => navigateTo(action.href)}
                      >
                        {(() => { const Icon = getQuickActionIcon(action.href); return <Icon size={15} color="currentColor" style={{ marginBottom: '3px' }} />; })()}
                        <span style={{ fontSize: '0.62rem', display: 'block', lineHeight: 1.1 }}>{action.label}</span>
                      </button>
                    )
                  ))}

                  {isEditingQuick && (
                    <>
                      {isAddingNew ? (
                        <div style={{
                          gridColumn: 'span 2',
                          padding: '8px',
                          backgroundColor: '#161616',
                          border: '1px solid #333',
                          borderRadius: '6px',
                          marginTop: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <input 
                            type="text" 
                            placeholder="Label (e.g. 🏋️ Gym)" 
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            style={{ flex: 1, backgroundColor: '#0f0f0f', border: '1px solid #333', color: '#fff', fontSize: '0.75rem', padding: '4px 6px', borderRadius: '4px' }}
                          />
                          <input 
                            type="text" 
                            placeholder="URL (e.g. https://www.torn.com/...)" 
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                            style={{ flex: 1, backgroundColor: '#0f0f0f', border: '1px solid #333', color: '#fff', fontSize: '0.75rem', padding: '4px 6px', borderRadius: '4px' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                            <button 
                              onClick={() => setIsAddingNew(false)}
                              style={{ backgroundColor: 'transparent', border: 'none', color: '#aaa', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleSaveNewAction}
                              style={{ backgroundColor: '#3498db', border: 'none', color: '#fff', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <button
                            onClick={() => {
                              const activeTab = tabs.find(t => t.id === activeTabId);
                              if (activeTab) {
                                setQuickActions(prev => [...prev, { label: activeTab.title || 'Torn Tab', href: activeTab.url }]);
                              }
                            }}
                            style={{
                              flex: 1,
                              background: 'none',
                              border: '1px dashed #2ecc71',
                              borderRadius: '7px',
                              color: '#2ecc71',
                              fontSize: '0.7rem',
                              padding: '6px',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            + Add Current
                          </button>
                          <button
                            onClick={() => setIsAddingNew(true)}
                            style={{
                              flex: 1,
                              background: 'none',
                              border: '1px dashed #444',
                              borderRadius: '7px',
                              color: '#888',
                              fontSize: '0.7rem',
                              padding: '6px',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            + Custom Action
                          </button>
                        </div>
                      )}

                      {/* Presets suggestions */}
                      {PRESET_QUICK_ACTIONS.filter(preset => !quickActions.some(qa => qa.href === preset.href)).length > 0 && (
                        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#666' }}>Suggestions:</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {PRESET_QUICK_ACTIONS.filter(preset => !quickActions.some(qa => qa.href === preset.href)).slice(0, 6).map(preset => (
                              <button
                                key={preset.href}
                                onClick={() => {
                                  setQuickActions(prev => [...prev, preset]);
                                }}
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.03)',
                                  border: '1px solid #222',
                                  borderRadius: '4px',
                                  color: '#aaa',
                                  fontSize: '0.65rem',
                                  padding: '2px 5px',
                                  cursor: 'pointer'
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
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

      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '#161616',
            border: '1px solid #333',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 10000,
            padding: '4px 0',
            minWidth: '130px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            onClick={() => handleCopyUrl(contextMenu.tab.url, contextMenu.tab.id)}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              color: '#eee',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.2s',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#3498db'}
            onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
          >
            {copiedId === contextMenu.tab.id ? '✅ Copied!' : '📋 Copy URL'}
          </div>
        </div>
      )}
    </div>
  );
};

// ⚡ Bolt: Wrapped with React.memo() to prevent iframe remounts and state resets when unrelated parent state changes
export default React.memo(TornView);
