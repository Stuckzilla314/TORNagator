import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBarTimer } from './useBarTimer';
import { useTravelTimer } from './useTravelTimer';
import {
  IconBolt, IconDot, IconSmile, IconHeart,
  IconPlane, IconHospital, IconScales,
  IconCoin, IconWarning, IconChevronRight,
  IconChevronLeft, IconRefresh,
  IconTarget, IconPeace, IconSwords,
  IconBarChart, IconClock, IconPill, IconMuscle, IconLink,
  getQuickActionIcon
} from './Icons';
import { fetchFactionById } from './tornApi';

/**
 * Custom hook to safely sync state with localStorage.
 *
 * @param {string} key - The localStorage key.
 * @param {*} initialValue - The initial value if no data exists in localStorage.
 * @returns {Array} An array containing the stored value and a setter function.
 */
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

/**
 * Component for monitoring and displaying the active faction chain and countdown timer.
 */
const ChainWatcher = ({ factionData }) => {
  const chain = factionData?.chain || {};
  const current = chain.current || 0;
  const timeout = chain.timeout || 0;
  const modifier = chain.modifier || 1;
  const cooldown = chain.cooldown || 0;

  const [localTimeout, setLocalTimeout] = useState(timeout);
  const [localCooldown, setLocalCooldown] = useState(cooldown);

  // Sync with API updates
  useEffect(() => {
    setLocalTimeout(timeout);
  }, [timeout]);

  useEffect(() => {
    setLocalCooldown(cooldown);
  }, [cooldown]);

  // Tick down timeout
  useEffect(() => {
    if (localTimeout <= 0) return;
    const timer = setInterval(() => {
      setLocalTimeout(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [localTimeout]);

  // Tick down cooldown
  useEffect(() => {
    if (localCooldown <= 0) return;
    const timer = setInterval(() => {
      setLocalCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [localCooldown]);

  // Formatter helper
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasActiveChain = current > 0 || localTimeout > 0;
  const hasCooldown = localCooldown > 0;

  // Milestone calculation
  const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  const nextMilestone = milestones.find(m => m > current) || 10;
  const prevMilestone = milestones[milestones.indexOf(nextMilestone) - 1] || 0;
  const progressPct = Math.min(100, Math.max(0, ((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100));

  if (!factionData) {
    return (
      <div style={{ padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.75rem', color: '#888', textAlign: 'center' }}>
        Loading Faction Chain...
      </div>
    );
  }

  // Timer color alert styling
  let timerColor = '#2ecc71'; // Green
  if (localTimeout < 60) {
    timerColor = '#e74c3c'; // Red
  } else if (localTimeout < 120) {
    timerColor = '#f39c12'; // Orange
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      backgroundColor: 'rgba(0,0,0,0.25)',
      padding: '8px',
      borderRadius: '6px',
      border: '1px solid rgba(255,255,255,0.03)'
    }}>
      {/* Title & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconLink size={11} color="#3498db" /> CHAIN WATCHER
        </span>
        {hasActiveChain && modifier > 1 && (
          <span style={{ fontSize: '0.65rem', color: '#3498db', fontWeight: 'bold', backgroundColor: 'rgba(52,152,219,0.15)', padding: '1px 5px', borderRadius: '4px' }}>
            {modifier}x
          </span>
        )}
      </div>

      {hasCooldown ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#f39c12', fontWeight: 'bold' }}>Cooldown</span>
          <span style={{ fontSize: '1rem', color: '#f39c12', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {formatTime(localCooldown)}
          </span>
        </div>
      ) : hasActiveChain ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{current.toLocaleString()}</span>
              <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '4px' }}>/ {nextMilestone.toLocaleString()}</span>
            </div>
            <div 
              className={localTimeout < 30 ? 'pulse-alert-animation' : ''}
              style={{
                fontSize: '1.05rem',
                fontWeight: 'bold',
                color: timerColor,
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <IconClock size={12} color={timerColor} />
              {formatTime(localTimeout)}
            </div>
          </div>
          {/* Progress Bar to next Milestone */}
          <div style={{ height: '4px', backgroundColor: '#111', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, backgroundColor: '#3498db', height: '100%', transition: 'width 0.4s ease' }} />
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>No Active Chain</span>
          <span style={{ fontSize: '0.75rem', color: '#888' }}>Ready</span>
        </div>
      )}
    </div>
  );
};

/**
 * Infers a broader categorization or key from a specific Torn URL for deduplication.
 * Useful when comparing different deep-linked paths that logically belong to the same page.
 *
 * @param {string} url - The URL to categorize.
 * @returns {string|null} The inferred category key, or null if it cannot be classified.
 */
const getTornPageCategory = (url) => {
  if (!url) return null;
  const lower = url.toLowerCase();

  // Exclude profile pages and faction profiles to ensure they match exactly by URL/ID
  if (lower.includes('profiles.php') || lower.includes('xid=')) {
    return null;
  }
  if (lower.includes('step=profile')) {
    return null;
  }

  try {
    // 1. Try to extract sid parameter
    const sidMatch = lower.match(/[?&]sid=([a-z0-9_-]+)/);
    let key = null;
    if (sidMatch) {
      key = sidMatch[1];
    } else {
      // 2. Try to extract php filename
      const phpMatch = lower.match(/\/([a-z0-9_-]+)\.php/);
      if (phpMatch) {
        const file = phpMatch[1];
        // Skip generic page/loader templates
        if (file !== 'page' && file !== 'loader') {
          key = file;
        }
      }
    }

    if (!key) return null;

    // 3. Define known categories and their synonyms
    const SYNONYMS = {
      'imarket': 'market',
      'itemmarket': 'market',
      'market': 'market',

      'hospitalview': 'hospital',
      'hospital': 'hospital',

      'travelagency': 'travel',
      'travel': 'travel',

      'factions': 'faction',
      'faction': 'faction',

      'jailview': 'jail',
      'jail': 'jail',

      'index': 'home',
      'home': 'home',

      'companies': 'company',
      'company': 'company',

      'gym': 'gym',
      'crimes': 'crimes',
      'bazaar': 'bazaar',
      'events': 'events',
      'properties': 'properties',
      'job': 'job',
      'attack': 'attack',
      'city': 'city',
      'bank': 'bank',
    };

    const category = SYNONYMS[key];
    return category || null;
  } catch (e) {
    return null;
  }
};

/**
 * Determines whether a URL is a generic Torn page (like index or main index)
 * that does not map to a specific game view.
 *
 * @param {string} url - The URL to check.
 * @returns {boolean} True if the URL is generic.
 */
const isGenericMainPage = (url) => {
  if (!url) return false;
  try {
    const category = getTornPageCategory(url);
    if (!category) return false;

    // Check if hash has a deep path
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hash = url.substring(hashIndex).trim();
      const lowerHash = hash.toLowerCase();
      // If hash contains more than just '/' or empty, it's a specific route
      if (
        hash !== '#' &&
        hash !== '#/' &&
        lowerHash !== '#/home' &&
        lowerHash !== '#/crimes' &&
        hash.length > 2
      ) {
        return false;
      }
    }

    // Check query parameters
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    const searchParams = urlObj.searchParams;
    for (const key of searchParams.keys()) {
      if (key.toLowerCase() !== 'sid') {
        return false;
      }
    }

    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Compares two URLs logically to see if they refer to the same Torn page.
 * Strips basic parameters like layout overrides and compares generic paths.
 *
 * @param {string} url1 - The first URL.
 * @param {string} url2 - The second URL.
 * @returns {boolean} True if the URLs logically match.
 */
const areUrlsEqual = (url1, url2) => {
  if (!url1 || !url2) return false;

  // If the target URL (url2) is a generic main page, we can match by category
  if (isGenericMainPage(url2)) {
    const cat1 = getTornPageCategory(url1);
    const cat2 = getTornPageCategory(url2);
    if (cat1 && cat2 && cat1 === cat2) {
      return true;
    }
  }

  const normalize = (u) => {
    try {
      let normalized = u.trim().toLowerCase();
      if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
      if (normalized.endsWith('#')) normalized = normalized.slice(0, -1);
      return normalized;
    } catch (e) {
      return u;
    }
  };
  return normalize(url1) === normalize(url2);
};

// ─── Constants ────────────────────────────────────────────────────────────────


// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Renders a compact progress bar for user stats, designed to fit inside the sidebar.
 *
 * @param {Object} props - The component props.
 * @param {string|React.ReactNode} props.label - The title/icon of the stat.
 * @param {number} props.current - The current stat value.
 * @param {number} props.max - The maximum stat value.
 * @param {string} props.color - The CSS color for the progress bar.
 * @param {string} [props.timeRemaining] - Formatted time remaining to max out.
 * @param {string} [props.href] - Link to navigate to on click.
 * @param {Function} [props.onNavigate] - Callback for navigation.
 * @returns {React.JSX.Element} The rendered SidebarStatBar component.
 */
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

/**
 * Renders a status card (e.g., Hospital, Jail, Traveling) showing the state and remaining time.
 *
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.icon - The status icon.
 * @param {string} props.title - The title of the status.
 * @param {string} props.description - Extra context or description of the status.
 * @param {string} [props.detail] - Action/detail label (e.g., 'Release', 'Arrival').
 * @param {string} [props.timeLeft] - Time remaining string.
 * @param {string} [props.releaseTime] - Human-readable time when the status expires.
 * @param {string} props.accentColor - The CSS color mapping to the status type.
 * @returns {React.JSX.Element} The rendered StatusCard component.
 */
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
/**
 * Renders a hidden or active Electron webview element representing a browser tab.
 * Handles deep linking, quick actions injection, and specific market overlay scripts.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.tab - The tab state object containing id, url, title, etc.
 * @param {boolean} props.isActive - Whether this tab is currently the active view.
 * @param {Function} props.onUpdate - Callback to update the parent with tab state changes (title, url, etc.).
 * @param {string} props.targetCountry - Currently selected target country for travel tools.
 * @param {Function} props.setTargetCountry - Callback to update the target country.
 * @param {Object} props.itemsData - Static items mapping for market overlays.
 * @param {number} props.cargoCapacity - Estimated max cargo items user can hold.
 * @param {string} props.apiKey - The user API key (used for auto-injecting some scripts or data if needed).
 * @param {boolean} props.showNavControls - Whether to show the navigation toolbar.
 * @returns {React.JSX.Element} The rendered WebviewTab component.
 */
const WebviewTab = ({ tab, isActive, onUpdate, targetCountry, setTargetCountry, itemsData, cargoCapacity, apiKey, showNavControls }) => {
  const webviewRef = useRef(null);
  const initialUrlRef = useRef(tab.url);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const updateNavigationState = useCallback(() => {
    const wv = webviewRef.current;
    if (wv) {
      try {
        setCanGoBack(wv.canGoBack());
        setCanGoForward(wv.canGoForward());
      } catch (err) {
        // Can fail if webview isn't fully ready
      }
    }
  }, []);

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
      updateNavigationState();
    };
    const handleTitle = (e) => onUpdate(tab.id, { title: e.title });
    const handleConsole = (e) => {
      if (window.process && window.process.stdout) {
        window.process.stdout.write(`[Webview-${tab.id}] ${e.message}\n`);
      }
      console.log(`[Webview-${tab.id}]`, e.message);
    };

    wv.addEventListener('did-navigate', handleNavigate);
    wv.addEventListener('did-navigate-in-page', handleNavigate);
    wv.addEventListener('did-stop-loading', updateNavigationState);
    wv.addEventListener('page-title-updated', handleTitle);
    wv.addEventListener('console-message', handleConsole);

    return () => {
      wv.removeEventListener('did-navigate', handleNavigate);
      wv.removeEventListener('did-navigate-in-page', handleNavigate);
      wv.removeEventListener('did-stop-loading', updateNavigationState);
      wv.removeEventListener('page-title-updated', handleTitle);
      wv.removeEventListener('console-message', handleConsole);
    };
  }, [tab.id, onUpdate, updateNavigationState]);

  useEffect(() => {
    if (isActive && targetCountry) {
      const timer = setTimeout(() => {
        trySelectCountry();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, targetCountry, trySelectCountry]);

  useEffect(() => {
    if (!isActive) return;

    const handleDump = () => {
      const wv = webviewRef.current;
      if (!wv) return;

      console.log("[TornView] Dumping active webview DOM...");
      const dumpScript = `
        (() => {
          const result = {};
          result.url = window.location.href;

          // Find SUCCESS/FAIL text elements
          const allEls = Array.from(document.querySelectorAll('*'));
          const successEl = allEls.find(el => el.textContent && (el.textContent.trim() === 'SUCCESS' || el.textContent.trim() === 'FAIL'));
          if (successEl) {
            result.successOuterHTML = successEl.outerHTML;
            if (successEl.parentElement) {
              result.successParentOuterHTML = successEl.parentElement.outerHTML;
              if (successEl.parentElement.parentElement) {
                result.successGrandparentOuterHTML = successEl.parentElement.parentElement.outerHTML;
              }
            }
          }

          // Gather interesting elements
          const elements = [];
          document.querySelectorAll('[class*="itemCell" i], [class*="outcome" i], [class*="image" i], [class*="reward" i]').forEach(el => {
            elements.push({
              tagName: el.tagName,
              className: el.className,
              outerHTML: el.outerHTML
            });
          });
          result.interestingElements = elements;

          // Gather img tags
          const images = [];
          document.querySelectorAll('img').forEach(img => {
            images.push({
              src: img.src,
              className: img.className,
              outerHTML: img.outerHTML
            });
          });
          result.images = images;

          return JSON.stringify(result, null, 2);
        })()
      `;

      wv.executeJavaScript(dumpScript)
        .then(jsonStr => {
          try {
            const fs = window.require('fs');
            const path = window.require('path');
            const dumpPath = path.join(process.cwd(), 'crimes_dom_dump.json');
            fs.writeFileSync(dumpPath, jsonStr, 'utf8');
            alert('DOM dumped successfully to ' + dumpPath + '!');
          } catch (e) {
            console.error('Failed to write DOM dump file:', e);
            navigator.clipboard.writeText(jsonStr);
            alert('Failed to write file, but copied DOM dump to clipboard!');
          }
        })
        .catch(err => {
          alert('Failed to execute dump script in webview: ' + err.message);
        });
    };

    window.addEventListener('dump-torn-dom', handleDump);
    return () => {
      window.removeEventListener('dump-torn-dom', handleDump);
    };
  }, [isActive]);



  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;


    const handleDomReady = () => {
      updateNavigationState();
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
  }, [isActive, targetCountry, trySelectCountry, updateNavigationState]);

  // Handle catalog updates from IPC
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !window.require) return;
    const { ipcRenderer } = window.require('electron');

    const handleCatalogUpdate = (event, { items }) => {
      wv.executeJavaScript(`
        if (window._tornagator_market_values_by_id) {
          Object.assign(window._tornagator_market_values_by_id, ${JSON.stringify(items)});
          window._tornagator_fetching_catalog = false;
        }
      `).catch(console.error);
    };

    ipcRenderer.on('catalog-updated', handleCatalogUpdate);
    return () => ipcRenderer.removeListener('catalog-updated', handleCatalogUpdate);
  }, []);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !isActive) return;

    // Map item names and IDs to their market values from the database if they exist
    const itemsMarketValues = {};
    const itemsMarketValuesById = {};
    if (itemsData) {
      Object.entries(itemsData).forEach(([id, item]) => {
        if (item.name && item.market_value) {
          itemsMarketValues[item.name.toLowerCase()] = item.market_value;
        }
        if (id && item.market_value) {
          itemsMarketValuesById[id] = item.market_value;
        }
      });
    }

    const script = `
      (() => {
        try {
          // Initialize local cache from React props if not already set, or fall back to empty
          if (!window._tornagator_market_values_by_id) {
            window._tornagator_market_values_by_id = {};
          }
          Object.assign(window._tornagator_market_values_by_id, ${JSON.stringify(itemsMarketValuesById)});
          const marketValuesById = window._tornagator_market_values_by_id;

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

            const input = row.querySelector('input');
            const button = row.querySelector('button, a, [role="button"], input[type="button"], input[type="submit"]');

            const updateRowProfit = () => {
              let profitSpan = button.querySelector('.injected-profit-span');
              if (!profitSpan) {
                profitSpan = document.createElement('span');
                profitSpan.className = 'injected-profit-span';
                profitSpan.style.fontWeight = 'bold';
                button.appendChild(profitSpan);
              }

              const qty = parseInt(input?.value || '0', 10) || 0;
              let stock = 0;
              if (stockHeaderIdx !== -1 && originalRowCells[stockHeaderIdx]) {
                const stockText = originalRowCells[stockHeaderIdx].textContent.replace(/[^0-9]/g, '');
                stock = parseInt(stockText, 10) || 0;
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

          // 3. Inject market values for found items on Crimes page (ONLY under outcome reward container)
          if (window.location.href.includes('crimes.php') || window.location.href.includes('sid=crimes')) {
            const rewardCells = document.querySelectorAll('div[class*=outcomeReward___] div[class*=itemCell___]');
            
            for (const cell of rewardCells) {
              if (cell.querySelector('.injected-crime-value') || cell.querySelector('.injected-crime-value-loading')) continue;

              const img = cell.querySelector('img[class*=image___]');
              if (!img) continue;

              const src = img.getAttribute('src') || img.src || '';
              if (!src) continue;

              // Extract item ID from src url (e.g. /images/items/904/medium.png)
              const parts = src.split('/');
              const itemId = parts.find(p => p && !isNaN(p) && /^[0-9]+$/.test(p));
              if (!itemId) continue;

              // Setup badge drawing function
              const renderBadge = (val) => {
                const temp = cell.querySelector('.injected-crime-value-loading');
                if (temp) temp.remove();

                if (cell.querySelector('.injected-crime-value')) return;

                // Check quantity
                const countSpan = cell.querySelector('span[class*=count___]');
                const qty = countSpan ? (parseInt(countSpan.textContent.replace(/[^0-9]/g, ''), 10) || 1) : 1;

                cell.style.position = 'relative';

                const valDiv = document.createElement('div');
                valDiv.className = 'injected-crime-value';
                valDiv.style.position = 'absolute';
                valDiv.style.bottom = '2px';
                valDiv.style.left = '50%';
                valDiv.style.transform = 'translateX(-50%)';
                valDiv.style.whiteSpace = 'nowrap';
                valDiv.style.pointerEvents = 'none';
                valDiv.style.textAlign = 'center';
                valDiv.style.fontSize = '0.62rem';
                valDiv.style.fontWeight = 'bold';
                valDiv.style.padding = '1px 4px';
                valDiv.style.borderRadius = '3px';
                valDiv.style.backgroundColor = 'rgba(0,0,0,0.75)';
                valDiv.style.border = '1px solid rgba(255,255,255,0.15)';
                valDiv.style.display = 'block';
                valDiv.style.zIndex = '5';
                
                if (val > 0) {
                  const totalVal = val * qty;
                  valDiv.style.color = '#10b981';
                  if (qty > 1) {
                    valDiv.textContent = '$' + totalVal.toLocaleString() + ' ($' + val.toLocaleString() + ')';
                  } else {
                    valDiv.textContent = '$' + val.toLocaleString();
                  }
                } else {
                  valDiv.style.color = '#888';
                  valDiv.textContent = 'N/A';
                }
                cell.appendChild(valDiv);
              };

              const marketValue = marketValuesById[itemId];
              if (marketValue !== undefined) {
                renderBadge(marketValue);
              } else {
                // If not cached, fetch all items on-demand from Torn API to populate the cache
                if (window._tornagator_fetching_catalog) continue;

                // Add temp loading element
                cell.style.position = 'relative';
                const tempDiv = document.createElement('div');
                tempDiv.className = 'injected-crime-value-loading';
                tempDiv.textContent = '...';
                tempDiv.style.position = 'absolute';
                tempDiv.style.bottom = '2px';
                tempDiv.style.left = '50%';
                tempDiv.style.transform = 'translateX(-50%)';
                tempDiv.style.pointerEvents = 'none';
                tempDiv.style.textAlign = 'center';
                tempDiv.style.fontSize = '0.62rem';
                tempDiv.style.fontWeight = 'bold';
                tempDiv.style.backgroundColor = 'rgba(0,0,0,0.75)';
                tempDiv.style.padding = '1px 6px';
                tempDiv.style.borderRadius = '3px';
                tempDiv.style.color = '#aaa';
                tempDiv.style.zIndex = '5';
                cell.appendChild(tempDiv);

                window._tornagator_fetching_catalog = true;
                console.log("[TORNagator Webview] Requesting Torn items catalog on-demand for itemId:", itemId);

                // Instead of calling ipcRenderer directly (which is unavailable in guest webview),
                // we set a global variable that the host will read during the interval execution
                window._tornagator_pending_item_id = itemId;
              }
            }
          }

          const pendingItemId = window._tornagator_pending_item_id || null;
          if (pendingItemId) {
            window._tornagator_pending_item_id = null;
          }
          return { requestFetchItemId: pendingItemId };
        } catch (e) {
          console.error("Profit/Crimes injection error:", e);
          return null;
        }
      })()
    `;

    const profitInterval = setInterval(() => {
      wv.executeJavaScript(script)
        .then(result => {
          if (result && result.requestFetchItemId && window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('request-catalog-update', result.requestFetchItemId);
          }
        })
        .catch(() => { });
    }, 1000);

    return () => clearInterval(profitInterval);
  }, [isActive, itemsData, cargoCapacity, apiKey]);

  const handleGoBack = () => {
    const wv = webviewRef.current;
    if (wv && wv.canGoBack()) {
      wv.goBack();
      updateNavigationState();
    }
  };

  const handleGoForward = () => {
    const wv = webviewRef.current;
    if (wv && wv.canGoForward()) {
      wv.goForward();
      updateNavigationState();
    }
  };

  const handleReload = () => {
    const wv = webviewRef.current;
    if (wv) {
      wv.reload();
      updateNavigationState();
    }
  };

  return (
    <div style={{ display: isActive ? 'flex' : 'none', flexDirection: 'column', position: 'absolute', inset: 0 }}>
      {/* Navigation Toolbar */}
      {showNavControls && (
        <div className="torn-browser-toolbar">
          <button
            className="torn-browser-nav-btn"
            onClick={handleGoBack}
            disabled={!canGoBack}
            title="Back"
            aria-label="Back"
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            className="torn-browser-nav-btn"
            onClick={handleGoForward}
            disabled={!canGoForward}
            title="Forward"
            aria-label="Forward"
          >
            <IconChevronRight size={16} />
          </button>
          <button
            className="torn-browser-nav-btn"
            onClick={handleReload}
            title="Reload"
            aria-label="Reload"
          >
            <IconRefresh size={16} />
          </button>
          <input
            type="text"
            className="torn-browser-url-bar"
            value={tab.url}
            readOnly
            onClick={(e) => e.target.select()}
            title="Click to select/copy URL"
          />
        </div>
      )}

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <webview
          ref={webviewRef}
          src={initialUrlRef.current}
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
          title={tab.title}
          className="torn-iframe"
          allowpopups="true"
        />
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const parseStatValue = (valStr) => {
  const clean = valStr.replace(/,/g, '').toLowerCase().trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  if (clean.includes('b')) return num * 1000000000;
  if (clean.includes('m')) return num * 1000000;
  if (clean.includes('k')) return num * 1000;
  return num;
};

const parseSuspectedStats = (text) => {
  if (!text) return { factionName: '', stats: {} };
  const lines = text.split('\n');
  let factionName = '';
  const firstLine = lines[0].trim();
  if (firstLine && !firstLine.includes('\t') && !firstLine.toLowerCase().includes('name') && !firstLine.toLowerCase().includes('xp')) {
    factionName = firstLine;
  }
  const stats = {};
  const regex = /^\d+\s+([a-zA-Z0-9_\-\s]+?)\s+([\d.]+[kmg]b?|[\d,]+)$/i;
  lines.forEach(line => {
    const parts = line.trim().split('\t');
    if (parts.length >= 3) {
      const name = parts[1].trim();
      const rawVal = parts[2].trim();
      const numVal = parseStatValue(rawVal);
      if (name && numVal !== null) {
        stats[name.toLowerCase()] = { raw: rawVal, value: numVal, index: Object.keys(stats).length };
      }
    } else {
      const match = line.trim().match(regex);
      if (match) {
        const name = match[1].trim();
        const rawVal = match[2].trim();
        const numVal = parseStatValue(rawVal);
        if (name && numVal !== null) {
          stats[name.toLowerCase()] = { raw: rawVal, value: numVal, index: Object.keys(stats).length };
        }
      }
    }
  });
  return { factionName, stats };
};

/**
 * Parses remaining seconds from Torn description text.
 * E.g. "Hospitalized for 3h 12m" -> 11520 seconds
 */
const parseTornDescriptionTime = (description) => {
  if (!description) return 0;
  const clean = description.replace(/<[^>]+>/g, '').replace(/Hospitalized for /i, '').trim();
  let totalSeconds = 0;
  
  const dayMatch = clean.match(/(\d+)\s*d/i);
  const hourMatch = clean.match(/(\d+)\s*h/i);
  const minuteMatch = clean.match(/(\d+)\s*m/i);
  const secondMatch = clean.match(/(\d+)\s*s/i);
  
  if (dayMatch) totalSeconds += parseInt(dayMatch[1], 10) * 86400;
  if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  if (minuteMatch) totalSeconds += parseInt(minuteMatch[1], 10) * 60;
  if (secondMatch) totalSeconds += parseInt(secondMatch[1], 10);
  
  return totalSeconds;
};

/**
 * Component for rendering a single member sidebar row with real-time ticking timer.
 */
const MemberSidebarRow = ({ member, userData, compareMode, navigateTo }) => {
  const [currentStatusState, setCurrentStatusState] = useState(member.status?.state);
  const [currentDescription, setCurrentDescription] = useState(member.status?.description);

  useEffect(() => {
    setCurrentStatusState(member.status?.state);
    setCurrentDescription(member.status?.description);
  }, [member.status?.state, member.status?.description]);

  const [statusUntil, setStatusUntil] = useState(0);

  useEffect(() => {
    if (member.status?.until && member.status.until > 0) {
      setStatusUntil(member.status.until);
    } else {
      const seconds = parseTornDescriptionTime(member.status?.description);
      if (seconds > 0) {
        setStatusUntil(Math.floor(Date.now() / 1000) + seconds);
      } else {
        setStatusUntil(0);
      }
    }
  }, [member.status?.until, member.status?.description]);

  useEffect(() => {
    if (currentStatusState !== 'Hospital' || !statusUntil) return;

    const calculate = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = statusUntil - now;
      if (remaining <= 0) {
        setCurrentStatusState('Okay');
        setCurrentDescription('');
      } else {
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        const s = remaining % 60;
        const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        setCurrentDescription(formatted);
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [currentStatusState, statusUntil]);

  const isOkay = currentStatusState === 'Okay';
  const statusColor = isOkay ? '#2ecc71' : currentStatusState === 'Hospital' ? '#e74c3c' : currentStatusState === 'Jail' ? '#f39c12' : '#3498db';
  const profile = member.profile || {};
  const hasProfile = Object.keys(profile).length > 0;

  return (
    <div
      style={{
        padding: '8px',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: '6px',
        borderLeft: `3px solid ${statusColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        transition: 'all 0.15s ease'
      }}
      className="torn-stat-bar"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
        <div style={{ minWidth: 0 }}>
          <span
            onClick={() => navigateTo(`https://www.torn.com/profiles.php?XID=${member.id}`)}
            style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'none' }}
            className="text-link"
          >
            {member.name}
          </span>
          <span style={{ color: '#555', fontSize: '0.7rem', marginLeft: '4px' }}>[{member.id}]</span>

          <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3px' }}>
            Lvl {member.level} • <IconClock size={10} color="#888" /> {member.last_action?.relative || 'Unknown'}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '0.72rem', display: 'block' }}>
            {currentStatusState || 'Unknown'}
          </span>
          <span style={{ color: '#666', fontSize: '0.65rem', display: 'block' }}>
            {currentDescription?.replace(/<[^>]+>/g, '').replace(/Hospitalized for /i, '') || ''}
          </span>
        </div>
      </div>

      {/* Suspected XP info & Profile indicators */}
      {(member.suspectedRaw || hasProfile) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px', marginTop: '2px', fontSize: '0.7rem' }}>
          <div>
            {member.suspectedRaw && (
              <span style={{ color: '#e74c3c', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <IconBarChart size={10} color="#e74c3c" /> {member.suspectedRaw}
              </span>
            )}
          </div>
          <div>
            {hasProfile && (
              <span style={{ color: '#888' }}>
                {profile.age ? `${profile.age.toLocaleString()}d` : ''}
                {member.winRate ? ` • ${Math.round(member.winRate)}% WR` : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Activity strip */}
      {hasProfile && (
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          flexWrap: 'wrap', 
          marginTop: '4px', 
          paddingTop: '4px', 
          borderTop: '1px dashed rgba(255,255,255,0.05)' 
        }}>
          {[
            { 
              label: <><IconSwords size={10} color="#e67e22" /> Cri</>, 
              value: member.criminalOffenses, 
              color: '#e67e22',
              own: userData?.personalstats?.criminaloffenses || 0
            },
            { 
              label: <><IconPill size={10} color="#9b59b6" /> Drg</>, 
              value: member.drugsUsed, 
              color: '#9b59b6',
              own: userData?.personalstats?.drugsused || 0
            },
            { 
              label: <><IconBolt size={10} color="#3498db" /> Ref</>, 
              value: member.totalRefills, 
              color: '#3498db',
              own: (userData?.personalstats?.refills || 0) + (userData?.personalstats?.nerverefills || 0) + (userData?.personalstats?.tokenrefills || 0)
            },
            { 
              label: <><IconMuscle size={10} color="#2ecc71" /> Bst</>, 
              value: member.boostersUsed, 
              color: '#2ecc71',
              own: userData?.personalstats?.boostersused || 0
            },
          ].map(({ label, value, color, own }) => {
            const valNum = Number(value) || 0;
            const ownNum = Number(own) || 0;
            const diff = valNum - ownNum;
            const diffStr = diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
            const diffColor = diff > 0 ? '#e74c3c' : diff < 0 ? '#2ecc71' : '#888';

            return (
              <span key={color} style={{
                backgroundColor: 'rgba(0,0,0,0.15)',
                border: `1px solid ${color}22`,
                color: '#aaa',
                padding: '2px 5px',
                borderRadius: '10px',
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                flexGrow: 1,
                justifyContent: 'center'
              }}>
                {label}: <strong style={{ color }}>
                  {compareMode ? diffStr : valNum.toLocaleString()}
                </strong>
                {compareMode && (
                  <span style={{ fontSize: '0.6rem', color: diffColor, fontStyle: 'italic' }}>
                    ({diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'even'})
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Compact Action Buttons */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <button
          onClick={() => navigateTo(`https://www.torn.com/profiles.php?XID=${member.id}`)}
          style={{
            flex: 1,
            backgroundColor: '#2c2c2c',
            border: 'none',
            borderRadius: '4px',
            color: '#ccc',
            padding: '3px 0',
            fontSize: '0.68rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            textAlign: 'center',
            transition: 'all 0.15s'
          }}
        >
          Profile
        </button>
        <button
          onClick={() => navigateTo(`https://www.torn.com/page.php?sid=attack&user2ID=${member.id}`)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(231, 76, 60, 0.15)',
            border: '1px solid rgba(231, 76, 60, 0.4)',
            borderRadius: '4px',
            color: '#e74c3c',
            padding: '2px 0',
            fontSize: '0.68rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            textAlign: 'center',
            transition: 'all 0.15s'
          }}
        >
          Attack
        </button>
      </div>
    </div>
  );
};

/**
 * The core wrapper component for the Tornagator experience.
 * Manages the multi-tab browser state, custom quick actions sidebar, and user status summary.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.userData - The current user's profile and state.
 * @param {Object} props.factionData - The current user's faction data.
 * @param {string} props.apiKey - The user's API key.
 * @param {string} [props.requestedUrl] - An incoming URL requested by the app (e.g., from Dashboard link).
 * @param {Function} props.setRequestedUrl - Callback to clear the requested URL.
 * @param {string} props.targetCountry - Currently selected travel target country.
 * @param {Function} props.setTargetCountry - Setter for target country.
 * @param {Object} props.itemsData - Full items map for reference.
 * @param {number} props.cargoCapacity - Max items user can bring back.
 * @param {boolean} props.showNavControls - Whether to show the navigation toolbar.
 * @returns {React.JSX.Element} The rendered TornView component.
 */
const TornView = ({ userData, factionData, loadFactionData, apiKey, requestedUrl, setRequestedUrl, targetCountry, setTargetCountry, itemsData, cargoCapacity, showNavControls }) => {
  const defaultTab = { id: 'home', url: 'https://www.torn.com/index.php', title: 'Torn' };
  const [tabs, setTabs] = useLocalStorage('torn_browser_tabs', [defaultTab]);
  const [activeTabId, setActiveTabId] = useLocalStorage('torn_browser_active_tab', 'home');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const defaultQuickActions = [
    { label: 'Crimes', href: 'https://www.torn.com/crimes.php' },
    { label: 'Market', href: 'https://www.torn.com/imarket.php' },
    { label: 'Travel', href: 'https://www.torn.com/travelagency.php' },
    { label: 'Events', href: 'https://www.torn.com/events.php' },
    { label: 'Bazaar', href: 'https://www.torn.com/bazaar.php' },
  ];
  const [quickActions, setQuickActions] = useLocalStorage('torn_quick_actions', defaultQuickActions);
  const [isEditingQuick, setIsEditingQuick] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [dismissedWarnings, setDismissedWarnings] = useState({});

  const [sidebarTab, setSidebarTab] = useLocalStorage('torn_sidebar_tab', 'player');

  // Faction War Targets state
  const rankedWars = factionData?.ranked_wars || factionData?.rankedwars || {};
  const activeWars = Object.values(rankedWars);
  const currentWar = activeWars.find(w => w.factions);

  let enemyFactionId = null;
  let enemyFactionInfo = null;
  if (currentWar && factionData) {
    const factionsEntries = Object.entries(currentWar.factions || {}).map(([id, f]) => ({ id, ...f }));
    const enemyInfo = factionsEntries.find(f => f.name !== factionData.name) || {};
    enemyFactionId = enemyInfo.id || null;
    enemyFactionInfo = enemyFactionId ? currentWar.factions[enemyFactionId] : null;
  }

  const cacheKey = enemyFactionId ? `tornagator_targets_${enemyFactionId}` : null;

  const [enemyFactionData, setEnemyFactionData] = useState(() => {
    if (!cacheKey) return null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) return JSON.parse(raw).factionData;
    } catch (e) { }
    return null;
  });

  const [memberProfiles, setMemberProfiles] = useState(() => {
    if (!cacheKey) return {};
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) return JSON.parse(raw).profiles || {};
    } catch (e) { }
    return {};
  });

  const [cachedAt, setCachedAt] = useState(() => {
    if (!cacheKey) return null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) return JSON.parse(raw).fetchedAt;
    } catch (e) { }
    return null;
  });

  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isSyncingTargets, setIsSyncingTargets] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ done: 0, total: 0 });
  const [errorTargets, setErrorTargets] = useState(null);

  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('tornagator_faction_sort_by') || 'default';
  });
  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('tornagator_faction_sort_order') || 'desc';
  });

  const [syncInterval, setSyncInterval] = useState(() => {
    try {
      const cached = localStorage.getItem('tornagator_faction_sync_interval');
      return cached !== null ? Number(cached) : 0;
    } catch (e) {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tornagator_faction_sync_interval', syncInterval);
    } catch (e) {}
  }, [syncInterval]);

  const [compareMode, setCompareMode] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const cached = localStorage.getItem('tornagator_sidebar_width');
    return cached ? parseInt(cached, 10) : 300;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 220 && newWidth <= 600) {
        setSidebarWidth(newWidth);
        localStorage.setItem('tornagator_sidebar_width', newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const [importedStats, setImportedStats] = useState({});
  const [suspectedStatsFaction, setSuspectedStatsFaction] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Sync cache state when cacheKey changes
  useEffect(() => {
    if (!cacheKey) {
      setEnemyFactionData(null);
      setMemberProfiles({});
      setCachedAt(null);
      return;
    }
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        setEnemyFactionData(cached.factionData);
        setMemberProfiles(cached.profiles);
        setCachedAt(cached.fetchedAt);
      } else {
        setEnemyFactionData(null);
        setMemberProfiles({});
        setCachedAt(null);
      }
    } catch (e) {
      sessionStorage.removeItem(cacheKey);
    }
  }, [cacheKey]);

  // Sync sort settings to localStorage immediately
  useEffect(() => {
    localStorage.setItem('tornagator_faction_sort_by', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('tornagator_faction_sort_order', sortOrder);
  }, [sortOrder]);

  // Load suspected stats on enemyFactionId change
  useEffect(() => {
    if (!enemyFactionId) {
      setImportedStats({});
      setSuspectedStatsFaction('');
      return;
    }
    try {
      const stored = localStorage.getItem(`tornagator_suspected_stats_${enemyFactionId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setImportedStats(parsed.stats || {});
        setSuspectedStatsFaction(parsed.factionName || '');
      } else {
        setImportedStats({});
        setSuspectedStatsFaction('');
      }
    } catch (e) {
      console.error('[TORNagator] Error loading suspected stats in sidebar:', e);
    }
  }, [enemyFactionId]);

  const handleImportStats = (text) => {
    const { factionName, stats } = parseSuspectedStats(text);
    setImportedStats(stats);
    setSuspectedStatsFaction(factionName);
    if (enemyFactionId) {
      try {
        localStorage.setItem(`tornagator_suspected_stats_${enemyFactionId}`, JSON.stringify({ factionName, stats }));
      } catch (e) {
        console.error('[TORNagator] Error saving suspected stats:', e);
      }
    }
  };

  const handleClearStats = () => {
    setImportedStats({});
    setSuspectedStatsFaction('');
    if (enemyFactionId) {
      localStorage.removeItem(`tornagator_suspected_stats_${enemyFactionId}`);
    }
  };

  const handleForceRefresh = () => {
    if (loadFactionData) loadFactionData();
    if (cacheKey) sessionStorage.removeItem(cacheKey);
    doFetchTargets(false);
  };

  const doFetchTargets = useCallback(async (silent = false) => {
    if (!enemyFactionId || !apiKey) return;
    if (silent) {
      setIsSyncingTargets(true);
    } else {
      setIsLoadingTargets(true);
      setErrorTargets(null);
      setMemberProfiles({});
    }
    try {
      const data = await fetchFactionById(apiKey, enemyFactionId);
      const memberIds = Object.keys(data.members || {});
      if (!silent) {
        setLoadingProgress({ done: 0, total: memberIds.length });
      }
      const BATCH_SIZE = 5;
      const profiles = {};
      for (let i = 0; i < memberIds.length; i += BATCH_SIZE) {
        const batch = memberIds.slice(i, i + BATCH_SIZE);
        const settled = await Promise.allSettled(
          batch.map(id =>
            fetch(`https://api.torn.com/user/${id}?selections=profile,personalstats&key=${apiKey}`)
              .then(r => r.json())
              .then(pData => ({ id, pData }))
          )
        );
        settled.forEach(result => {
          if (result.status === 'fulfilled' && !result.value.pData.error) {
            profiles[result.value.id] = result.value.pData;
          }
        });
        if (!silent) {
          setLoadingProgress({ done: Math.min(i + BATCH_SIZE, memberIds.length), total: memberIds.length });
        }
        if (i + BATCH_SIZE < memberIds.length) {
          await new Promise(res => setTimeout(res, 350));
        }
      }
      setEnemyFactionData(data);
      setMemberProfiles(profiles);
      const fetchedAt = Date.now();
      setCachedAt(fetchedAt);
      if (cacheKey) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ factionData: data, profiles, fetchedAt }));
        } catch (e) {
          console.warn('[TORNagator] sessionStorage full, targets not cached:', e);
        }
      }
    } catch (err) {
      if (!silent) {
        setErrorTargets('Failed to fetch targets.');
      }
    } finally {
      if (silent) {
        setIsSyncingTargets(false);
      } else {
        setIsLoadingTargets(false);
      }
    }
  }, [enemyFactionId, apiKey, cacheKey]);

  // Auto-fetch targets on tab switch to war sidebar if not cached
  useEffect(() => {
    if (sidebarTab === 'war' && !enemyFactionData && !isLoadingTargets && !isSyncingTargets && enemyFactionId && apiKey) {
      doFetchTargets(false);
    }
  }, [sidebarTab, enemyFactionData, isLoadingTargets, isSyncingTargets, enemyFactionId, apiKey, doFetchTargets]);

  // Auto-sync timer effect
  useEffect(() => {
    if (syncInterval <= 0 || !enemyFactionId || !apiKey || sidebarTab !== 'war') return;

    const intervalId = setInterval(() => {
      if (!isLoadingTargets && !isSyncingTargets) {
        if (loadFactionData) loadFactionData();
        doFetchTargets(true);
      }
    }, syncInterval * 1000);

    return () => clearInterval(intervalId);
  }, [syncInterval, enemyFactionId, apiKey, sidebarTab, isLoadingTargets, isSyncingTargets, doFetchTargets, loadFactionData]);

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
    { label: 'Home', href: 'https://www.torn.com/index.php' },
    { label: 'Crimes', href: 'https://www.torn.com/crimes.php' },
    { label: 'Gym', href: 'https://www.torn.com/gym.php' },
    { label: 'Hospital', href: 'https://www.torn.com/hospitalview.php' },
    { label: 'City', href: 'https://www.torn.com/city.php' },
    { label: 'Bazaar', href: 'https://www.torn.com/bazaar.php' },
    { label: 'Market', href: 'https://www.torn.com/imarket.php' },
    { label: 'Bank', href: 'https://www.torn.com/bank.php' },
    { label: 'Travel', href: 'https://www.torn.com/travelagency.php' },
    { label: 'Faction', href: 'https://www.torn.com/factions.php' },
    { label: 'Events', href: 'https://www.torn.com/events.php' },
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
      const existingTab = tabs.find(t => areUrlsEqual(t.url, requestedUrl));
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTabId = `tab-${Date.now()}`;
        setTabs(prev => [...prev, { id: newTabId, url: requestedUrl, title: 'Torn' }]);
        setActiveTabId(newTabId);
      }
      setRequestedUrl(null);
    }
  }, [requestedUrl, tabs, setTabs, setActiveTabId, setRequestedUrl]);

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
  const lifeTimer = useBarTimer(userData?.life);
  const energyTimer = useBarTimer(userData?.energy);
  const nerveTimer = useBarTimer(userData?.nerve);
  const happyTimer = useBarTimer(userData?.happy);

  const isTraveling = userData?.status?.state === 'Traveling';
  const isHospitalized = userData?.status?.state === 'Hospital';
  const isJailed = userData?.status?.state === 'Jail';
  const hasSpecialStatus = isTraveling || isHospitalized || isJailed;

  const landingUntil = userData?.travel?.timestamp || userData?.status?.until;
  const statusUntil = userData?.status?.until;
  const travelTimeLeft = useTravelTimer(isTraveling ? landingUntil : 0);
  const statusTimeLeft = useTravelTimer((isHospitalized || isJailed) ? statusUntil : 0);

  const formatTime = (ts) =>
    ts > 0 ? new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  const landingTime = formatTime(landingUntil);
  const releaseTime = formatTime(statusUntil);

  const statusColor =
    userData?.status?.color === 'blue' ? '#3498db' :
      userData?.status?.color === 'red' ? '#e74c3c' : '#2ecc71';

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

    const existingTab = tabs.find(t => areUrlsEqual(t.url, safeHref));
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const id = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id, url: safeHref, title: 'Loading...' }]);
    setActiveTabId(id);
  }, [tabs, setTabs, setActiveTabId]);

  // Iframe block detection removed: assuming user uses extension to bypass X-Frame-Options

  const moneyFormatted = userData?.money_onhand != null
    ? `$${Number(userData.money_onhand).toLocaleString()}`
    : userData?.personalstats?.moneymugged != null
      ? null
      : null;

  return (
    <div className="torn-view-root" style={{ height: '100%', flex: 1, minHeight: 0 }}>
      {isResizing && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            cursor: 'ew-resize',
            backgroundColor: 'transparent'
          }}
        />
      )}

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
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginLeft: '8px', fontSize: '1rem', lineHeight: '1' }}
                  aria-label={`Close ${tab.title || 'tab'}`}
                >×</button>
              </div>
            ))}
            <button
              onClick={handleNewTab}
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
                apiKey={apiKey}
                showNavControls={showNavControls}
              />
            ))}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside 
          className={`torn-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}
          style={{
            width: sidebarCollapsed ? '0px' : `${sidebarWidth}px`,
            transition: isResizing ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Resize handle */}
          {!sidebarCollapsed && (
            <div
              onMouseDown={startResizing}
              style={{
                position: 'absolute',
                top: 0,
                left: '-3px',
                width: '6px',
                bottom: 0,
                cursor: 'ew-resize',
                zIndex: 100,
                backgroundColor: isResizing ? 'rgba(52, 152, 219, 0.5)' : 'transparent',
                transition: 'background-color 0.2s'
              }}
            />
          )}

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
            <div className={`torn-sidebar-inner ${sidebarTab === 'war' ? 'war-tab-active' : ''}`}>
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

              {/* Sidebar Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '6px', marginBottom: '4px' }}>
                <button
                  onClick={() => setSidebarTab('player')}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    backgroundColor: sidebarTab === 'player' ? '#2c2c2c' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: sidebarTab === 'player' ? '#fff' : '#888',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <IconDot size={8} color={sidebarTab === 'player' ? statusColor : '#888'} /> Player Info
                </button>
                <button
                  onClick={() => setSidebarTab('war')}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    backgroundColor: sidebarTab === 'war' ? '#2c2c2c' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: sidebarTab === 'war' ? '#fff' : '#888',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <IconSwords size={12} color={sidebarTab === 'war' ? '#e74c3c' : '#888'} /> Faction War
                </button>
              </div>

              {sidebarTab === 'player' ? (
                <>
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

                  {/* Live Stats */}
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
                      href="https://www.torn.com/hospitalview.php"
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

                            {(() => { const Icon = getQuickActionIcon(action.href, action.label); return <Icon size={16} color="#888" />; })()}

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
                            {(() => { const Icon = getQuickActionIcon(action.href, action.label); return <Icon size={15} color="currentColor" style={{ marginBottom: '3px' }} />; })()}
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

                              {/* Live Icon & Button Preview */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '6px 8px',
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                borderRadius: '4px',
                                border: '1px dashed #333',
                                marginTop: '2px'
                              }}>
                                <span style={{ fontSize: '0.65rem', color: '#666' }}>Preview:</span>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                  <div className="torn-sidebar-quicklink-btn" style={{ width: '100%', minHeight: '48px', cursor: 'default', pointerEvents: 'none' }}>
                                    {(() => {
                                      const Icon = getQuickActionIcon(newUrl, newLabel);
                                      return <Icon size={15} color="#3498db" style={{ marginBottom: '3px' }} />;
                                    })()}
                                    <span style={{ fontSize: '0.62rem', display: 'block', lineHeight: 1.1, color: '#fff' }}>
                                      {newLabel.trim() || 'Preview'}
                                    </span>
                                  </div>
                                </div>
                              </div>

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

                  <div className="torn-sidebar-footer">
                    <span>Live • refreshes every 30s</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
                  {!enemyFactionId ? (
                    <div style={{ padding: '12px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed #444' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                        <IconPeace size={20} color="#888" />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>PEACE TIME</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#666' }}>Your faction is not currently in a ranked war.</p>
                      <button
                        onClick={() => loadFactionData && loadFactionData()}
                        style={{
                          marginTop: '10px',
                          backgroundColor: 'transparent',
                          border: '1px solid #444',
                          borderRadius: '4px',
                          color: '#3498db',
                          padding: '4px 10px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                        className="btn-check-war"
                      >
                        Check for War
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* War Status Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            vs {suspectedStatsFaction || enemyFactionInfo?.name || 'Enemy Faction'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <IconTarget size={10} color="#888" /> Target: {currentWar?.war?.target || 'N/A'} pts
                          </div>
                        </div>

                        <button
                          onClick={handleForceRefresh}
                          disabled={isLoadingTargets || isSyncingTargets}
                          style={{
                            background: 'transparent',
                            border: '1px solid #444',
                            borderRadius: '20px',
                            padding: '3px 8px',
                            cursor: (isLoadingTargets || isSyncingTargets) ? 'not-allowed' : 'pointer',
                            color: (isLoadingTargets || isSyncingTargets) ? '#666' : '#3498db',
                            fontWeight: 'bold',
                            fontSize: '0.68rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <IconRefresh
                            size={10}
                            color={(isLoadingTargets || isSyncingTargets) ? '#666' : '#3498db'}
                            className={isSyncingTargets ? 'spin-animation' : ''}
                          />
                        </button>
                      </div>

                      {/* Scores Progress Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                        {(() => {
                          const factionsEntries = Object.entries(currentWar?.factions || {}).map(([id, f]) => ({ id, ...f }));
                          const ourFactionInfoObj = factionsEntries.find(f => f.name === factionData?.name) || {};
                          const ourFactionScore = ourFactionInfoObj.score || 0;
                          const enemyFactionInfoObj = factionsEntries.find(f => f.name !== factionData?.name) || {};
                          const enemyFactionScore = enemyFactionInfoObj.score || 0;

                          const totalScore = ourFactionScore + enemyFactionScore;
                          const ourPct = totalScore > 0 ? (ourFactionScore / totalScore) * 100 : 50;

                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                <span style={{ color: '#3498db' }}>{ourFactionScore.toLocaleString()}</span>
                                <span style={{ color: '#e74c3c' }}>{enemyFactionScore.toLocaleString()}</span>
                              </div>
                              <div style={{ height: '6px', backgroundColor: '#222', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                <div style={{ width: `${ourPct}%`, backgroundColor: '#3498db', height: '100%' }} />
                                <div style={{ flex: 1, backgroundColor: '#e74c3c', height: '100%' }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Chain Watcher */}
                      <ChainWatcher factionData={factionData} />

                      {/* Sorting & Import Panel */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid #222' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>SORT BY:</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value)}
                              style={{
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                color: '#fff',
                                padding: '2px 4px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="default">Status & Lvl</option>
                              <option value="level">Level</option>
                              {Object.keys(importedStats).length > 0 && <option value="xp">Suspected XP</option>}
                              <option value="age">Days Playing</option>
                              <option value="winrate">Win Rate</option>
                            </select>

                            <button
                              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                              style={{
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                color: '#aaa',
                                padding: '2px 6px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              {sortOrder === 'asc' ? '▲' : '▼'}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>COMPARE STATS:</span>
                          <div
                            onClick={() => setCompareMode(!compareMode)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              backgroundColor: '#111',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: `1px solid ${compareMode ? '#e74c3c' : '#333'}`,
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: compareMode ? '#e74c3c' : '#555',
                              transition: 'all 0.2s'
                            }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: compareMode ? '#fff' : '#888' }}>
                              {compareMode ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>AUTO SYNC:</span>
                          <select
                            value={syncInterval}
                            onChange={(e) => setSyncInterval(Number(e.target.value))}
                            style={{
                              backgroundColor: '#111',
                              border: '1px solid #333',
                              borderRadius: '4px',
                              color: '#fff',
                              padding: '2px 4px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value={0}>Off</option>
                            <option value={30}>30s</option>
                            <option value={60}>1m</option>
                            <option value={120}>2m</option>
                            <option value={300}>5m</option>
                          </select>
                        </div>

                        {/* Import Suspected Stats Trigger */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                          {Object.keys(importedStats).length > 0 ? (
                            <>
                              <span style={{ fontSize: '0.68rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                📊 Suspected XP loaded
                              </span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => setIsImportOpen(!isImportOpen)}
                                  style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid #3498db',
                                    borderRadius: '4px',
                                    color: '#3498db',
                                    padding: '2px 6px',
                                    fontSize: '0.68rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={handleClearStats}
                                  style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid #e74c3c',
                                    borderRadius: '4px',
                                    color: '#e74c3c',
                                    padding: '2px 6px',
                                    fontSize: '0.68rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  Clear
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => setIsImportOpen(!isImportOpen)}
                              style={{
                                width: '100%',
                                backgroundColor: '#e74c3c',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                textAlign: 'center'
                              }}
                            >
                              📥 Import Suspected Stats
                            </button>
                          )}
                        </div>

                        {/* Compact Import Text Area */}
                        {isImportOpen && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', borderTop: '1px solid #222', paddingTop: '6px' }}>
                            <textarea
                              value={importText}
                              onChange={(e) => setImportText(e.target.value)}
                              placeholder="Lion Force&#10;No.&#9;Name&#9;XP&#10;1&#9;Johan1&#9;559m"
                              style={{
                                width: '100%',
                                height: '80px',
                                backgroundColor: '#050505',
                                border: '1px solid #222',
                                borderRadius: '4px',
                                color: '#fff',
                                padding: '4px',
                                fontSize: '0.72rem',
                                fontFamily: 'monospace',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                                outline: 'none'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setIsImportOpen(false);
                                  setImportText('');
                                }}
                                style={{
                                  backgroundColor: 'transparent',
                                  border: '1px solid #444',
                                  color: '#aaa',
                                  padding: '2px 8px',
                                  borderRadius: '3px',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  handleImportStats(importText);
                                  setIsImportOpen(false);
                                  setImportText('');
                                  setSortBy('xp');
                                  setSortOrder('desc');
                                }}
                                style={{
                                  backgroundColor: '#e74c3c',
                                  border: 'none',
                                  color: '#fff',
                                  padding: '2px 8px',
                                  borderRadius: '3px',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                Import
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Members List */}
                      {isLoadingTargets ? (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '6px' }}>
                            Syncing targets... ({loadingProgress.done}/{loadingProgress.total})
                          </div>
                          <div style={{ backgroundColor: '#222', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', backgroundColor: '#e74c3c', width: loadingProgress.total > 0 ? `${(loadingProgress.done / loadingProgress.total) * 100}%` : '0%', transition: 'width 0.3s ease' }} />
                          </div>
                        </div>
                      ) : errorTargets ? (
                        <div style={{ color: '#e74c3c', textAlign: 'center', fontSize: '0.75rem', padding: '10px 0' }}>{errorTargets}</div>
                      ) : enemyFactionData && enemyFactionData.members ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '4px', minHeight: 0 }}>
                          {(() => {
                            const sortedMembers = Object.entries(enemyFactionData.members)
                              .map(([id, member]) => {
                                const profile = memberProfiles[id] || {};
                                const ps = profile.personalstats || {};
                                const nameKey = member.name.trim().toLowerCase();
                                const suspect = importedStats[nameKey] || null;

                                const attacksWon = ps.attackswon || 0;
                                const attacksLost = ps.attackslost || 0;
                                const defendsWon = ps.defendswon || 0;
                                const defendsLost = ps.defendslost || 0;
                                const totalFights = attacksWon + attacksLost + defendsWon + defendsLost;
                                const winRate = totalFights > 0 ? ((attacksWon + defendsWon) / totalFights) * 100 : 0;

                                const criminalOffenses = ps.criminaloffenses || 0;
                                const drugsUsed = ps.drugsused || 0;
                                const totalRefills = (ps.refills || 0) + (ps.nerverefills || 0) + (ps.tokenrefills || 0);
                                const boostersUsed = ps.boostersused || 0;

                                return {
                                  id,
                                  ...member,
                                  profile,
                                  age: profile.age || 0,
                                  winRate,
                                  suspectedVal: suspect ? suspect.value : -1,
                                  suspectedRaw: suspect ? suspect.raw : null,
                                  suspectedIndex: suspect ? suspect.index : null,
                                  criminalOffenses,
                                  drugsUsed,
                                  totalRefills,
                                  boostersUsed
                                };
                              })
                              .sort((a, b) => {
                                if (sortBy === 'default') {
                                  const aOkay = a.status?.state === 'Okay' ? 0 : 1;
                                  const bOkay = b.status?.state === 'Okay' ? 0 : 1;
                                  if (aOkay !== bOkay) return aOkay - bOkay;
                                  return a.level - b.level;
                                }

                                let comparison = 0;
                                if (sortBy === 'level') {
                                  comparison = a.level - b.level;
                                } else if (sortBy === 'xp') {
                                  if (a.suspectedVal === -1 && b.suspectedVal === -1) comparison = 0;
                                  else if (a.suspectedVal === -1) return 1;
                                  else if (b.suspectedVal === -1) return -1;
                                  else comparison = a.suspectedVal - b.suspectedVal;
                                } else if (sortBy === 'age') {
                                  comparison = a.age - b.age;
                                } else if (sortBy === 'winrate') {
                                  comparison = a.winRate - b.winRate;
                                }

                                return sortOrder === 'asc' ? comparison : -comparison;
                              });

                            return sortedMembers.map((member) => (
                              <MemberSidebarRow
                                key={member.id}
                                member={member}
                                userData={userData}
                                compareMode={compareMode}
                                navigateTo={navigateTo}
                              />
                            ));
                          })()}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>No target data loaded.</span>
                          <button
                            onClick={doFetchTargets}
                            style={{
                              display: 'block',
                              margin: '8px auto 0 auto',
                              backgroundColor: '#3498db',
                              border: 'none',
                              color: '#fff',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            Load Targets
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <div className="torn-sidebar-footer">
                    <span>{cachedAt ? `Synced: ${new Date(cachedAt).toLocaleTimeString()}` : 'Targets not synced'}</span>
                  </div>
                </div>
              )}
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
