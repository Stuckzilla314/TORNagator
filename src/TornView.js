import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useBarTimer } from './useBarTimer';
import { useTravelTimer } from './useTravelTimer';
import {
  IconBolt, IconDot, IconSmile, IconHeart,
  IconPlane, IconHospital, IconScales,
  IconCoin, IconWarning, IconChevronRight,
  IconChevronLeft, IconRefresh,
  IconTarget, IconPeace, IconSwords,
  IconBarChart, IconClock, IconPill, IconMuscle, IconLink, IconPin,
  getQuickActionIcon
} from './Icons';
import { fetchFactionById } from './tornApi';
import { isElectron, isCapacitor } from './utils';

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
 * Helper to synthesize warning sounds for chain statuses using Web Audio API.
 * 
 * @param {string} status - The warning status ('yellow' or 'red').
 */
const playChainWarningSound = (status) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (status === 'yellow') {
      // Play a single medium-high pitch warning beep (D5)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (status === 'red') {
      // Play three rapid, piercing high-pitch warning beeps (B5) using a triangle wave
      const playBeep = (delay, freq, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
      };

      playBeep(0, 987.77, 0.12);    // B5
      playBeep(0.16, 987.77, 0.12); // B5
      playBeep(0.32, 987.77, 0.12); // B5
    }
  } catch (err) {
    console.warn('Failed to play chain alert audio:', err);
  }
};

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
  const lastWarnedStatusRef = useRef('none');

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

  // Warning status for audio/visual alerts
  const currentStatus = useMemo(() => {
    if (!hasActiveChain || localTimeout <= 0) return 'none';
    if (localTimeout < 60) return 'red';
    if (localTimeout < 120) return 'yellow';
    return 'green';
  }, [hasActiveChain, localTimeout]);

  useEffect(() => {
    if (currentStatus === 'yellow' || currentStatus === 'red') {
      if (lastWarnedStatusRef.current !== currentStatus) {
        playChainWarningSound(currentStatus);
      }
    }
    lastWarnedStatusRef.current = currentStatus;
  }, [currentStatus]);

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

  const containerClass = currentStatus === 'red' ? 'chain-alert-red' : currentStatus === 'yellow' ? 'chain-alert-yellow' : '';

  return (
    <div className={containerClass} style={{
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
 * Component for displaying a highly condensed ticking chain status when the overview is collapsed.
 */
const CompactChainInfo = ({ chain }) => {
  const current = chain?.current || 0;
  const timeout = chain?.timeout || 0;
  const cooldown = chain?.cooldown || 0;

  const [localTimeout, setLocalTimeout] = useState(timeout);
  const [localCooldown, setLocalCooldown] = useState(cooldown);
  const lastWarnedStatusRef = useRef('none');

  useEffect(() => {
    setLocalTimeout(timeout);
  }, [timeout]);

  useEffect(() => {
    setLocalCooldown(cooldown);
  }, [cooldown]);

  useEffect(() => {
    if (localTimeout <= 0) return;
    const timer = setInterval(() => {
      setLocalTimeout(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [localTimeout]);

  useEffect(() => {
    if (localCooldown <= 0) return;
    const timer = setInterval(() => {
      setLocalCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [localCooldown]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasActiveChain = current > 0 || localTimeout > 0;
  const hasCooldown = localCooldown > 0;

  // Warning status for audio/visual alerts
  const currentStatus = useMemo(() => {
    if (!hasActiveChain || localTimeout <= 0) return 'none';
    if (localTimeout < 60) return 'red';
    if (localTimeout < 120) return 'yellow';
    return 'green';
  }, [hasActiveChain, localTimeout]);

  useEffect(() => {
    if (currentStatus === 'yellow' || currentStatus === 'red') {
      if (lastWarnedStatusRef.current !== currentStatus) {
        playChainWarningSound(currentStatus);
      }
    }
    lastWarnedStatusRef.current = currentStatus;
  }, [currentStatus]);

  if (hasCooldown) {
    return (
      <span style={{ fontSize: '0.72rem', color: '#f39c12', fontWeight: 'bold' }}>
        🔗 Cooldown: {formatTime(localCooldown)}
      </span>
    );
  }

  if (hasActiveChain) {
    let timerColor = '#2ecc71'; // Green
    if (localTimeout < 60) {
      timerColor = '#e74c3c'; // Red
    } else if (localTimeout < 120) {
      timerColor = '#f39c12'; // Orange
    }

    const wrapperClass = currentStatus === 'red' ? 'compact-chain-alert-red' : currentStatus === 'yellow' ? 'compact-chain-alert-yellow' : '';

    return (
      <span className={wrapperClass} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
        <span style={{ color: '#fff' }}>🔗 {current.toLocaleString()}</span>
        <span style={{ color: timerColor, fontFamily: 'monospace' }}>
          ({formatTime(localTimeout)})
        </span>
      </span>
    );
  }

  return (
    <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 'bold' }}>
      🔗 Ready
    </span>
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


// 🛡️ Sentinel: Global URL sanitization to prevent DOM-based XSS in webview/iframe
const sanitizeUrl = (url) => {
  let safeUrl = (url || '').trim();
  if (!safeUrl || safeUrl === 'newtab') return safeUrl;

  const schemeMatch = safeUrl.match(/^([a-zA-Z0-9+.-]+):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (!['http', 'https'].includes(scheme)) {
      console.warn('Blocked unsafe URL scheme:', scheme);
      return 'https://www.torn.com/index.php'; // Fallback safe URL
    }
  } else if (!/^https?:\/\//i.test(safeUrl)) {
    safeUrl = 'https://' + safeUrl;
  }
  return safeUrl;
};

// ─── New Tab Page ──────────────────────────────────────────────────────────────
const DEFAULT_FAVORITES = [
  { label: 'Home', url: 'https://www.torn.com/index.php' },
  { label: 'Gym', url: 'https://www.torn.com/gym.php' },
  { label: 'Crimes', url: 'https://www.torn.com/crimes.php' },
  { label: 'Hospital', url: 'https://www.torn.com/hospitalview.php' },
  { label: 'Faction', url: 'https://www.torn.com/factions.php' },
  { label: 'Travel', url: 'https://www.torn.com/travelagency.php' },
  { label: 'Forums', url: 'https://www.torn.com/forums.php' },
  { label: 'Bazaar', url: 'https://www.torn.com/bazaar.php' },
  { label: 'City', url: 'https://www.torn.com/city.php' },
];

const NewTabPage = ({ tabId, onNavigate }) => {
  const [favorites, setFavorites] = useLocalStorage('tornagator_favorites', DEFAULT_FAVORITES);
  const [urlInput, setUrlInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleGo = (urlToGo) => {
    const url = sanitizeUrl(urlToGo || urlInput);
    if (url) onNavigate(url);
  };

  const handleAddFavorite = (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;

    const url = sanitizeUrl(newUrl);
    const newFav = { label: newLabel.trim(), url };
    setFavorites([...favorites, newFav]);
    setNewLabel('');
    setNewUrl('');
  };

  const handleRemoveFavorite = (indexToRemove) => {
    setFavorites(favorites.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="new-tab-container">
      <div className="new-tab-content">
        <div className="new-tab-logo-container">
          <img src={`${process.env.PUBLIC_URL}/alligator.png`} alt="TORNagator Logo" className="new-tab-logo-icon" style={{ width: '64px', height: '64px' }} />
          <h1 className="new-tab-title">TORNagator</h1>
        </div>

        {/* URL Paste Bar */}
        <div className="new-tab-search-box">
          <input
            type="text"
            className="new-tab-url-input"
            placeholder="Enter TORN URL (e.g. torn.com/gym.php) or paste custom link..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGo();
            }}
          />
          <button className="new-tab-go-btn" onClick={() => handleGo()}>
            Go
          </button>
        </div>

        {/* Favorites Header */}
        <div className="new-tab-favorites-header">
          <h2>Favorite Pages</h2>
          <button
            className={`new-tab-edit-btn ${isEditing ? 'active' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>

        {/* Favorites Grid */}
        <div className="new-tab-favorites-grid">
          {favorites.map((fav, index) => {
            const FavIcon = getQuickActionIcon(fav.url, fav.label) || IconLink;
            return (
              <div key={index} className={`new-tab-fav-card-wrapper ${isEditing ? 'editing' : ''}`}>
                <div
                  className="new-tab-fav-card"
                  onClick={() => !isEditing && handleGo(fav.url)}
                >
                  <div className="new-tab-fav-icon">
                    <FavIcon size={18} />
                  </div>
                  <div className="new-tab-fav-label">{fav.label}</div>
                </div>
                {isEditing && (
                  <button
                    className="new-tab-fav-delete-btn"
                    onClick={() => handleRemoveFavorite(index)}
                    aria-label={`Remove ${fav.label}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* Add New Favorite inline card in edit mode */}
          {isEditing && (
            <form onSubmit={handleAddFavorite} className="new-tab-add-fav-card">
              <input
                type="text"
                placeholder="Label (e.g. Gym)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
                className="new-tab-add-input"
              />
              <input
                type="text"
                placeholder="URL (e.g. torn.com/gym.php)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                required
                className="new-tab-add-input"
              />
              <button type="submit" className="new-tab-add-btn">
                + Add
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

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
const INJECTED_CSS_SCRIPT = `
  (() => {
    let style = document.getElementById('tornagator-injected-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'tornagator-injected-css';
      style.textContent = \`
        [class*="mobileLink___"] span {
          color: #888888 !important;
        }
        [class*="mobileLink___"]:hover span {
          color: #ffffff !important;
        }
        [class*="active___"] [class*="mobileLink___"] span {
          color: #ffffff !important;
          text-shadow: 0 0 3px rgba(255, 255, 255, 0.4) !important;
        }
      \`;
      document.head.appendChild(style);
    }
  })()
`;

const STATS_REDIR_SCRIPT = `
  (() => {
    console.log("TORNagator: STATS_REDIR_SCRIPT loaded and running. Location: " + window.location.href + " bound=" + window._tornagator_global_listeners_bound);

    const isInside = (x, y, rect) => {
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const handleGlobalTap = (e) => {
      let x, y;
      if (e.type === 'touchstart') {
        if (e.touches && e.touches.length > 0) {
          x = e.touches[0].clientX;
          y = e.touches[0].clientY;
        } else {
          return;
        }
      } else {
        x = e.clientX;
        y = e.clientY;
      }

      // Find current energy bar element
      const energySelectors = [
        '[class*="energyContainer___"]',
        '[class*="energy___"]',
        '[id*="energy"]',
        '[aria-label*="Energy" i]',
        'div[class*="sidebar"] [class*="energy" i]',
      ];
      let energyEl = null;
      for (const selector of energySelectors) {
        const found = document.querySelector(selector);
        if (found) {
          energyEl = found;
          break;
        }
      }
      if (!energyEl) {
        energyEl = Array.from(document.querySelectorAll('div, li, p, span, a')).find(el => {
          const text = (el.textContent || '').trim();
          return text.startsWith('Energy:') && el.children.length < 8;
        });
      }

      if (energyEl) {
        const rect = energyEl.getBoundingClientRect();
        const isTargetInside = isInside(x, y, rect) || energyEl.contains(e.target);
        if (isTargetInside) {
          console.log("TORNagator: Global intercept! Clicked inside energy bar. Navigating to gym.php. event=" + e.type + " coords=" + x + "," + y);
          e.preventDefault();
          e.stopPropagation();
          window.location.href = 'https://www.torn.com/gym.php';
          return;
        }
      }

      // Find current nerve bar element
      const nerveSelectors = [
        '[class*="nerveContainer___"]',
        '[class*="nerve___"]',
        '[id*="nerve"]',
        '[aria-label*="Nerve" i]',
        'div[class*="sidebar"] [class*="nerve" i]',
      ];
      let nerveEl = null;
      for (const selector of nerveSelectors) {
        const found = document.querySelector(selector);
        if (found) {
          nerveEl = found;
          break;
        }
      }
      if (!nerveEl) {
        nerveEl = Array.from(document.querySelectorAll('div, li, p, span, a')).find(el => {
          const text = (el.textContent || '').trim();
          return text.startsWith('Nerve:') && el.children.length < 8;
        });
      }

      if (nerveEl) {
        const rect = nerveEl.getBoundingClientRect();
        const isTargetInside = isInside(x, y, rect) || nerveEl.contains(e.target);
        if (isTargetInside) {
          console.log("TORNagator: Global intercept! Clicked inside nerve bar. Navigating to crimes.php. event=" + e.type + " coords=" + x + "," + y);
          e.preventDefault();
          e.stopPropagation();
          window.location.href = 'https://www.torn.com/crimes.php';
          return;
        }
      }
    };

    if (!window._tornagator_global_listeners_bound) {
      window._tornagator_global_listeners_bound = true;
      document.addEventListener('click', handleGlobalTap, true);
      document.addEventListener('touchstart', handleGlobalTap, true);
      console.log("TORNagator: Global capturing click/touch listeners bound successfully!");
    }
  })()
`;

const WebviewTab = ({ tab, isActive, onUpdate, targetCountry, setTargetCountry, itemsData, cargoCapacity, apiKey, showNavControls, userData, factionData, baldrHighestStat, setBaldrHighestStat }) => {
  const tabId = tab?.id;
  const tabUrl = tab?.url || '';
  const tabTitle = tab?.title || '';

  const webviewRef = useRef(null);
  const initialUrlRef = useRef(tabUrl);
  const domReadyRef = useRef(false); // true once dom-ready fires; reset on navigation
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const isNewTab = tabUrl === 'newtab';
  if (initialUrlRef.current === 'newtab' && tabUrl !== 'newtab') {
    initialUrlRef.current = tabUrl;
  }

  const updateNavigationState = useCallback(() => {
    const wv = webviewRef.current;
    if (wv && isElectron) {
      try {
        setCanGoBack(wv.canGoBack());
        setCanGoForward(wv.canGoForward());
      } catch (err) {
        // Can fail if webview isn't fully ready
      }
    } else {
      setCanGoBack(false);
      setCanGoForward(false);
    }
  }, []);

  const injectMarketValues = useCallback((wvInstance) => {
    if (!wvInstance || !domReadyRef.current || !isElectron) return;
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

    const injectScript = `
      (() => {
        window._tornagator_market_values = ${JSON.stringify(itemsMarketValues)};
        window._tornagator_market_values_by_id = ${JSON.stringify(itemsMarketValuesById)};
        window._tornagator_cargo_capacity = ${cargoCapacity || 5};
        window._tornagator_sorted_names = null;
        window._tornagator_api_key = ${JSON.stringify(apiKey)};
        window._tornagator_user_data = ${JSON.stringify(userData)};
        window._tornagator_faction_data = ${JSON.stringify(factionData)};
        window._tornagator_tab_id = ${JSON.stringify(tabId)};
      })()
    `;
    wvInstance.executeJavaScript(injectScript).catch(() => { });
  }, [itemsData, cargoCapacity, apiKey, userData, factionData, tabId]);

  const trySelectCountry = useCallback((attempt = 1) => {
    if (!targetCountry) return;

    if (isCapacitor) {
      if (!window.AndroidTornBridge || !window.AndroidTornBridge.executeInOverlay) return;

      const currentUrl = tabUrl || '';
      if (!currentUrl.includes('travelagency.php') && !currentUrl.includes('sid=travel')) return;

      console.log(`TORNagator: Triggering selectCountry (attempt ${attempt}) on Android for:`, targetCountry);
      const script = `
        (() => {
          let attempt = ${attempt};
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

          const run = () => {
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

            if (attempt < 15) {
              attempt++;
              setTimeout(run, 400);
            }
            return false;
          };

          run();
        })()
      `;
      window.AndroidTornBridge.executeInOverlay(tabId, script);
      setTargetCountry(null);
    } else {
      const wv = webviewRef.current;
      if (!wv || !isElectron) return;

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
    }
  }, [targetCountry, setTargetCountry, tabUrl, tabId]);

  const handleBridgeMessage = useCallback(async (payload) => {
    if (payload.type === 'fetch') {
      const { id, url } = payload;
      try {
        const response = await fetch(url);
        const data = await response.json();
        const responseScript = `
          (() => {
            window._tornagator_fetch_responses = window._tornagator_fetch_responses || {};
            window._tornagator_fetch_responses['${id}'] = ${JSON.stringify({ data })};
          })()
        `;
        if (isCapacitor) {
          if (window.AndroidTornBridge && window.AndroidTornBridge.executeInOverlay) {
            window.AndroidTornBridge.executeInOverlay(tabId, responseScript);
          }
        } else {
          const wv = webviewRef.current;
          if (wv) {
            wv.executeJavaScript(responseScript).catch(() => {});
          }
        }
      } catch (err) {
        const responseScript = `
          (() => {
            window._tornagator_fetch_responses = window._tornagator_fetch_responses || {};
            window._tornagator_fetch_responses['${id}'] = ${JSON.stringify({ error: err.message })};
          })()
        `;
        if (isCapacitor) {
          if (window.AndroidTornBridge && window.AndroidTornBridge.executeInOverlay) {
            window.AndroidTornBridge.executeInOverlay(tabId, responseScript);
          }
        } else {
          const wv = webviewRef.current;
          if (wv) {
            wv.executeJavaScript(responseScript).catch(() => {});
          }
        }
      }
    } else if (payload.type === 'set_baldr_primary') {
      if (setBaldrHighestStat) {
        setBaldrHighestStat(payload.stat);
      }
    }
  }, [tabId, setBaldrHighestStat]);

  useEffect(() => {
    if (!isCapacitor) return;

    const handleBridgeEvent = (e) => {
      try {
        const payload = JSON.parse(e.detail);
        if (payload.tabId === tabId) {
          handleBridgeMessage(payload);
        }
      } catch (err) {
        console.error("Failed to parse bridge event payload:", err);
      }
    };

    window.addEventListener('tornagatorBridge', handleBridgeEvent);
    return () => {
      window.removeEventListener('tornagatorBridge', handleBridgeEvent);
    };
  }, [tabId, handleBridgeMessage]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !isElectron) return;

    const handleNavigate = (e) => {
      if (e.url.includes('__cf_chl_') || e.url.includes('/cdn-cgi/')) {
        return;
      }
      // Reset dom-ready flag on full navigations so we don't call executeJavaScript
      // on a webview that has torn down its renderer context.
      domReadyRef.current = false;
      if (tabId) {
        onUpdate(tabId, { url: e.url });
      }
      updateNavigationState();
    };
    const handleNavigateInPage = (e) => {
      if (e.url.includes('__cf_chl_') || e.url.includes('/cdn-cgi/')) {
        return;
      }
      // In-page navigations do not destroy the context, so keep domReadyRef.current true.
      if (tabId) {
        onUpdate(tabId, { url: e.url });
      }
      updateNavigationState();
      injectMarketValues(wv);
    };
    const handleTitle = (e) => {
      if (tabId) {
        onUpdate(tabId, { title: e.title });
      }
    };
    const handleConsole = (e) => {
      if (window.process && window.process.stdout) {
        window.process.stdout.write(`[Webview-${tabId || 'unknown'}] ${e.message}\n`);
      }
      console.log(`[Webview-${tabId || 'unknown'}]`, e.message);
      if (e.message && e.message.startsWith("TORNAGATOR_BRIDGE:")) {
        try {
          const payload = JSON.parse(e.message.substring("TORNAGATOR_BRIDGE:".length()));
          handleBridgeMessage(payload);
        } catch (err) {
          console.error("Failed to parse bridge message payload:", err);
        }
      }
    };

    wv.addEventListener('did-navigate', handleNavigate);
    wv.addEventListener('did-navigate-in-page', handleNavigateInPage);
    wv.addEventListener('did-stop-loading', updateNavigationState);
    wv.addEventListener('page-title-updated', handleTitle);
    wv.addEventListener('console-message', handleConsole);

    return () => {
      wv.removeEventListener('did-navigate', handleNavigate);
      wv.removeEventListener('did-navigate-in-page', handleNavigateInPage);
      wv.removeEventListener('did-stop-loading', updateNavigationState);
      wv.removeEventListener('page-title-updated', handleTitle);
      wv.removeEventListener('console-message', handleConsole);
    };
  }, [tabId, onUpdate, updateNavigationState, isNewTab, injectMarketValues, handleBridgeMessage]);

  useEffect(() => {
    if (isActive && targetCountry) {
      const timer = setTimeout(() => {
        trySelectCountry();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, targetCountry, trySelectCountry]);

  useEffect(() => {
    if (!isActive || !isElectron) return;

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
    if (!wv || !isElectron) return;


    const handleDomReady = () => {
      domReadyRef.current = true;
      updateNavigationState();
      injectMarketValues(wv);
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

      wv.executeJavaScript(STATS_REDIR_SCRIPT).catch(err => {
        console.error("TORNagator: Failed to inject stats redir script:", err);
      });
    };

    wv.addEventListener('dom-ready', handleDomReady);
    return () => {
      wv.removeEventListener('dom-ready', handleDomReady);
    };
  }, [isActive, targetCountry, trySelectCountry, updateNavigationState, isNewTab, injectMarketValues]);

  // Handle catalog updates from IPC
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !isElectron || !window.require) return;
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

  // Inject items data whenever they change or when this tab is active.
  // Guard on domReadyRef so we never call executeJavaScript before dom-ready fires
  // (e.g. when a newly-opened tab is immediately made active via navigateTo).
  useEffect(() => {
    const wv = webviewRef.current;
    if (wv && isActive && domReadyRef.current && isElectron) {
      injectMarketValues(wv);
    }
  }, [isActive, injectMarketValues]);

  useEffect(() => {
    if (!isActive) return;

    const script = `
      (() => {
        try {
          const isTravel = window.location.href.includes('travelagency.php') || window.location.href.includes('sid=travel') || window.location.href.includes('index.php');
          const isCrimes = window.location.href.includes('crimes.php') || window.location.href.includes('sid=crimes');
          const isItemMarket = window.location.href.includes('imarket.php') || window.location.href.includes('sid=ItemMarket') || window.location.href.includes('sid=itemmarket') || window.location.href.includes('sid=imarket');
          const isGym = window.location.href.includes('gym.php');

          if (!isTravel && !isCrimes && !isItemMarket && !isGym) {
            return null;
          }

          if (isGym) {
            console.log('[TORNagator] Overlay script isGym block executing, url:', window.location.href);
            try {
              const header = document.querySelector('.content-title');
              if (header) {
                const userData = window._tornagator_user_data;
                const factionData = window._tornagator_faction_data;
                const stats = {
                  strength: 0,
                  defense: 0,
                  speed: 0,
                  dexterity: 0
                };

                let dataFound = false;

                // 1. Try parsing from user faction_perks (highest priority/fallback)
                if (userData && Array.isArray(userData.faction_perks)) {
                  userData.faction_perks.forEach(perk => {
                    const p = perk.toLowerCase();
                    if (p.includes('gym gains')) {
                      const match = p.match(/\\+\\s*([\\d.]+)\\s*%/);
                      if (match) {
                        const val = parseFloat(match[1]);
                        if (p.includes('strength')) { stats.strength = val; dataFound = true; }
                        else if (p.includes('defense') || p.includes('defence')) { stats.defense = val; dataFound = true; }
                        else if (p.includes('speed')) { stats.speed = val; dataFound = true; }
                        else if (p.includes('dexterity')) { stats.dexterity = val; dataFound = true; }
                      }
                    }
                  });
                }

                // 2. If no gym gains perks were found in faction_perks, or faction_perks wasn't available,
                // fallback to faction upgrades if they are present.
                if (!dataFound && factionData && factionData.upgrades) {
                  const upgrades = Array.isArray(factionData.upgrades) ? factionData.upgrades : Object.values(factionData.upgrades);
                  upgrades.forEach(up => {
                    const branch = up.branch || '';
                    if (branch.toLowerCase() === 'steadfast') {
                      const name = (up.name || '').toLowerCase();
                      const level = up.level || 0;
                      if (name.includes('strength')) { stats.strength = level; dataFound = true; }
                      else if (name.includes('defense') || name.includes('defence')) { stats.defense = level; dataFound = true; }
                      else if (name.includes('speed')) { stats.speed = level; dataFound = true; }
                      else if (name.includes('dexterity')) { stats.dexterity = level; dataFound = true; }
                    }
                  });
                }

                const hasData = (userData && userData.faction_perks !== undefined) || (factionData && factionData.upgrades !== undefined);
                const dataStr = JSON.stringify(stats) + '_' + hasData;
                const existing = document.getElementById('tornagator-gym-steadfast');
                const shouldRecreate = !existing || existing.dataset.stats !== dataStr;

                if (shouldRecreate && (userData || factionData)) {
                  if (existing) {
                    existing.remove();
                  }
                  const container = document.createElement('div');
                  container.id = 'tornagator-gym-steadfast';
                  container.dataset.stats = dataStr;
                  
                  if (window.innerWidth < 600) {
                    container.style.display = 'flex';
                    container.style.flexWrap = 'wrap';
                    container.style.gap = '6px';
                    container.style.marginLeft = '0px';
                    container.style.marginTop = '6px';
                  } else {
                    container.style.display = 'inline-flex';
                    container.style.alignItems = 'center';
                    container.style.gap = '6px';
                    container.style.marginLeft = '16px';
                  }
                  
                  container.style.verticalAlign = 'middle';
                  container.style.fontFamily = "'Inter', -apple-system, sans-serif";
                  container.style.fontSize = '12px';
                  container.style.background = 'rgba(20, 20, 20, 0.8)';
                  container.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                  container.style.borderRadius = '6px';
                  container.style.padding = '4px 10px';
                  container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
                  container.style.color = '#e0e0e0';

                  if (hasData) {
                    const createBadge = (label, val) => {
                      const badge = document.createElement('div');
                      badge.style.display = 'flex';
                      badge.style.alignItems = 'center';
                      badge.style.gap = '3px';
                      badge.style.padding = '2px 6px';
                      badge.style.borderRadius = '4px';
                      badge.style.background = val > 0 ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255, 255, 255, 0.03)';
                      badge.style.border = val > 0 ? '1px solid rgba(46, 204, 113, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)';

                      const lblSpan = document.createElement('span');
                      lblSpan.textContent = label + ':';
                      lblSpan.style.fontWeight = 'bold';
                      lblSpan.style.fontSize = '10px';
                      lblSpan.style.textTransform = 'uppercase';
                      lblSpan.style.color = val > 0 ? '#2ecc71' : '#888';

                      const valSpan = document.createElement('span');
                      valSpan.textContent = '+' + val + '%';
                      valSpan.style.fontWeight = 'bold';
                      valSpan.style.color = val > 0 ? '#2ecc71' : '#666';

                      badge.appendChild(lblSpan);
                      badge.appendChild(valSpan);
                      return badge;
                    };

                    container.appendChild(createBadge('Str', stats.strength));
                    container.appendChild(createBadge('Def', stats.defense));
                    container.appendChild(createBadge('Spd', stats.speed));
                    container.appendChild(createBadge('Dex', stats.dexterity));
                  } else {
                    const warningBadge = document.createElement('div');
                    warningBadge.style.display = 'flex';
                    warningBadge.style.alignItems = 'center';
                    warningBadge.style.padding = '2px 6px';
                    warningBadge.style.borderRadius = '4px';
                    warningBadge.style.background = 'rgba(241, 196, 15, 0.1)';
                    warningBadge.style.border = '1px solid rgba(241, 196, 15, 0.25)';
                    warningBadge.style.fontSize = '10px';
                    warningBadge.style.fontWeight = 'bold';
                    warningBadge.style.color = '#f1c40f';
                    warningBadge.textContent = 'Unknown (Limited API Key)';
                    warningBadge.title = 'Please provide a Limited or Full access API key to view faction Steadfast upgrades';
                    container.appendChild(warningBadge);
                  }

                  const h1 = header.querySelector('h1');
                  if (h1) {
                    if (window.innerWidth < 600) {
                      h1.style.display = 'block';
                      h1.style.marginBottom = '4px';
                    } else {
                      h1.style.display = 'inline-block';
                      h1.style.verticalAlign = 'middle';
                    }
                    h1.after(container);
                  } else {
                    header.appendChild(container);
                  }
                }
              }
            } catch (err) {
              console.error('[TORNagator] Steadfast injection error:', err);
            }

            // Stacking Warning Injection
            try {
              if (${isCapacitor}) {
                const uData = window._tornagator_user_data;
                const maxEnergy = (uData && uData.energy && uData.energy.maximum) ? uData.energy.maximum : 100;
                const isStacking = uData && uData.energy && uData.energy.current > maxEnergy;
                if (isStacking && !window._tornagator_stacking_warning_dismissed) {
                  let warningBanner = document.getElementById('tornagator-stacking-warning');
                  if (!warningBanner) {
                    warningBanner = document.createElement('div');
                    warningBanner.id = 'tornagator-stacking-warning';
                    warningBanner.style.position = 'fixed';
                    warningBanner.style.top = '12px';
                    warningBanner.style.left = '50%';
                    warningBanner.style.transform = 'translateX(-50%)';
                    warningBanner.style.backgroundColor = 'rgba(231, 76, 60, 0.95)';
                    warningBanner.style.backdropFilter = 'blur(8px)';
                    warningBanner.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                    warningBanner.style.borderRadius = '8px';
                    warningBanner.style.padding = '10px 20px';
                    warningBanner.style.color = '#fff';
                    warningBanner.style.zIndex = '999999';
                    warningBanner.style.display = 'flex';
                    warningBanner.style.alignItems = 'center';
                    warningBanner.style.gap = '12px';
                    warningBanner.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6)';
                    warningBanner.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                    
                    const warningIcon = document.createElement('span');
                    warningIcon.innerHTML = '⚠️';
                    warningIcon.style.fontSize = '1.2rem';
                    warningBanner.appendChild(warningIcon);
                    
                    const textContainer = document.createElement('div');
                    const title = document.createElement('span');
                    title.textContent = 'Stacking Warning';
                    title.style.fontSize = '0.8rem';
                    title.style.fontWeight = 'bold';
                    title.style.display = 'block';
                    
                    const desc = document.createElement('span');
                    desc.textContent = 'Your energy is ' + (uData && uData.energy ? uData.energy.current : 0) + '/' + maxEnergy + '. You might be stacking and may not want to train in the gym.';
                    desc.style.fontSize = '0.7rem';
                    desc.style.color = 'rgba(255, 255, 255, 0.9)';
                    desc.style.display = 'block';
                    
                    textContainer.appendChild(title);
                    textContainer.appendChild(desc);
                    warningBanner.appendChild(textContainer);
                    
                    const closeBtn = document.createElement('button');
                    closeBtn.textContent = '×';
                    closeBtn.style.background = 'none';
                    closeBtn.style.border = 'none';
                    closeBtn.style.color = '#fff';
                    closeBtn.style.cursor = 'pointer';
                    closeBtn.style.fontSize = '1.3rem';
                    closeBtn.style.opacity = '0.7';
                    closeBtn.onclick = () => {
                      warningBanner.remove();
                      window._tornagator_stacking_warning_dismissed = true;
                    };
                    warningBanner.appendChild(closeBtn);
                    
                    document.body.appendChild(warningBanner);
                  }
                } else {
                  const existingBanner = document.getElementById('tornagator-stacking-warning');
                  if (existingBanner && (window._tornagator_stacking_warning_dismissed || !isStacking)) {
                    existingBanner.remove();
                  }
                }
              } else {
                const existingBanner = document.getElementById('tornagator-stacking-warning');
                if (existingBanner) {
                  existingBanner.remove();
                }
              }
            } catch (err) {
              console.error('[TORNagator] Stacking warning injection error:', err);
            }

            // 3. Baldr's Gym Optimizer - Injects "trains needed" next to stat values
            try {
              // Re-read userData/factionData from window globals (different scope from steadfast block)
              const baldrUserData = window._tornagator_user_data;
              const baldrFactionData = window._tornagator_faction_data;

              // Read faction steadfast perks for accurate gain multiplier
              const baldrStats = { strength: 0, defense: 0, speed: 0, dexterity: 0 };
              if (baldrUserData && Array.isArray(baldrUserData.faction_perks)) {
                baldrUserData.faction_perks.forEach(function(perk) {
                  var p = perk.toLowerCase();
                  if (p.includes('gym gains')) {
                    var m = p.match(/\\+\\s*([\\d.]+)\\s*%/);
                    if (m) {
                      var val = parseFloat(m[1]);
                      if (p.includes('strength')) baldrStats.strength = val;
                      else if (p.includes('defense') || p.includes('defence')) baldrStats.defense = val;
                      else if (p.includes('speed')) baldrStats.speed = val;
                      else if (p.includes('dexterity')) baldrStats.dexterity = val;
                    }
                  }
                });
              }

              // Get current stats from DOM
              const strEl = document.querySelector('li[class*="strength___"] span[class*="propertyValue___"]');
              const defEl = document.querySelector('li[class*="defense___"] span[class*="propertyValue___"]');
              const speEl = document.querySelector('li[class*="speed___"] span[class*="propertyValue___"]');
              const dexEl = document.querySelector('li[class*="dexterity___"] span[class*="propertyValue___"]');

              if (strEl && defEl && speEl && dexEl) {
                const strVal = parseInt(strEl.textContent.replace(/,/g, ''), 10) || 0;
                const defVal = parseInt(defEl.textContent.replace(/,/g, ''), 10) || 0;
                const speVal = parseInt(speEl.textContent.replace(/,/g, ''), 10) || 0;
                const dexVal = parseInt(dexEl.textContent.replace(/,/g, ''), 10) || 0;

                // Detect active gym
                const activeBtn = document.querySelector('button[class*="gymButton___"][class*="active___"]') ||
                                  document.querySelector('[class*="gymButton___"][class*="active___"]');

                let gymName = 'Unknown';
                let energyPerTrain = 10;
                if (activeBtn) {
                  const label = activeBtn.getAttribute('aria-label') || '';
                  gymName = label.split('.')[0].trim();

                  const energyMatch = label.match(/Energy usage\s*-\s*(\d+)/i);
                  if (energyMatch) {
                    energyPerTrain = parseInt(energyMatch[1], 10);
                  }
                }

                // Gym dots table
                const gymDotsTable = {
                  "Premier Fitness": { str: 2.0, spe: 2.0, def: 2.0, dex: 2.0, energy: 5 },
                  "Average Joes": { str: 2.4, spe: 2.4, def: 2.8, dex: 2.4, energy: 5 },
                  "Woody's Workout Club": { str: 2.8, spe: 3.2, def: 3.0, dex: 2.8, energy: 5 },
                  "Beach Bods": { str: 3.2, spe: 3.2, def: 3.2, dex: 0.0, energy: 5 },
                  "Silver Gym": { str: 3.4, spe: 3.6, def: 3.4, dex: 3.4, energy: 5 },
                  "Pour Femme": { str: 3.4, spe: 3.6, def: 3.6, dex: 3.8, energy: 5 },
                  "Davies Den": { str: 3.7, spe: 0.0, def: 3.7, dex: 3.7, energy: 5 },
                  "Global Gym": { str: 4.0, spe: 4.0, def: 4.0, dex: 4.0, energy: 5 },

                  "Knuckle Heads": { str: 4.8, spe: 4.4, def: 4.0, dex: 4.2, energy: 10 },
                  "Pioneer Fitness": { str: 4.4, spe: 4.6, def: 4.8, dex: 4.4, energy: 10 },
                  "Anabolic Anomalies": { str: 5.0, spe: 4.6, def: 5.2, dex: 4.6, energy: 10 },
                  "Core": { str: 5.0, spe: 5.2, def: 5.0, dex: 5.0, energy: 10 },
                  "Racing Fitness": { str: 5.0, spe: 5.4, def: 4.8, dex: 5.2, energy: 10 },
                  "Complete Cardio": { str: 5.5, spe: 5.8, def: 5.5, dex: 5.2, energy: 10 },
                  "Legs, Bums and Tums": { str: 0.0, spe: 5.6, def: 5.6, dex: 5.8, energy: 10 },
                  "Deep Burn": { str: 6.0, spe: 6.0, def: 6.0, dex: 6.0, energy: 10 },

                  "Apollo Gym": { str: 6.0, spe: 6.2, def: 6.4, dex: 6.2, energy: 10 },
                  "Gun Shop": { str: 6.6, spe: 6.4, def: 6.2, dex: 6.2, energy: 10 },
                  "Force Training": { str: 6.4, spe: 6.6, def: 6.4, dex: 6.8, energy: 10 },
                  "Cha Cha's": { str: 6.4, spe: 6.4, def: 6.8, dex: 7.0, energy: 10 },
                  "Atlas": { str: 7.0, spe: 6.4, def: 6.4, dex: 6.6, energy: 10 },
                  "Last Round": { str: 6.8, spe: 6.6, def: 7.0, dex: 6.6, energy: 10 },
                  "The Edge": { str: 6.8, spe: 7.0, def: 7.0, dex: 6.8, energy: 10 },
                  "George's": { str: 7.3, spe: 7.3, def: 7.3, dex: 7.3, energy: 10 },
                  "George's Gym": { str: 7.3, spe: 7.3, def: 7.3, dex: 7.3, energy: 10 },

                  "Balboa's Gym": { str: 0.0, spe: 0.0, def: 7.5, dex: 7.5, energy: 25 },
                  "Frontline Fitness": { str: 7.5, spe: 7.5, def: 0.0, dex: 0.0, energy: 25 },
                  "Gym 3000": { str: 8.0, spe: 0.0, def: 0.0, dex: 0.0, energy: 50 },
                  "Mr. Isoyamas": { str: 0.0, spe: 0.0, def: 8.0, dex: 0.0, energy: 50 },
                  "Mr. Isoyama's": { str: 0.0, spe: 0.0, def: 8.0, dex: 0.0, energy: 50 },
                  "Total Rebound": { str: 0.0, spe: 8.0, def: 0.0, dex: 0.0, energy: 50 },
                  "Elites": { str: 0.0, spe: 0.0, def: 0.0, dex: 8.0, energy: 50 },
                  "The Sports Science Lab": { str: 9.0, spe: 9.0, def: 9.0, dex: 9.0, energy: 50 }
                };

                const dots = gymDotsTable[gymName] || { str: 5.5, spe: 5.8, def: 5.5, dex: 5.2, energy: energyPerTrain };

                // Get current happy
                const currentHappy = (baldrUserData && baldrUserData.happy && baldrUserData.happy.current) || 4000;

                // Setup relation keys - primaryKey interpolated from React state at build time
                const primaryKey = "${(baldrHighestStat || 'strength').toLowerCase() === 'defence' ? 'defense' : (baldrHighestStat || 'strength').toLowerCase()}";

                let secondaryKey = 'speed';
                let low1Key = 'defense';
                let low2Key = 'dexterity';

                if (primaryKey === 'strength') {
                  secondaryKey = 'speed';
                  low1Key = 'defense';
                  low2Key = 'dexterity';
                } else if (primaryKey === 'defense') {
                  secondaryKey = 'dexterity';
                  low1Key = 'strength';
                  low2Key = 'speed';
                } else if (primaryKey === 'speed') {
                  secondaryKey = 'strength';
                  low1Key = 'defense';
                  low2Key = 'dexterity';
                } else if (primaryKey === 'dexterity') {
                  secondaryKey = 'defense';
                  low1Key = 'strength';
                  low2Key = 'speed';
                }

                const ratios = {};
                ratios[primaryKey] = 30.86;
                ratios[secondaryKey] = 24.69;
                ratios[low1Key] = 22.22;
                ratios[low2Key] = 22.22;

                // Implied totals for each stat
                const impliedTotals = {
                  strength: strVal / (ratios.strength / 100),
                  defense: defVal / (ratios.defense / 100),
                  speed: speVal / (ratios.speed / 100),
                  dexterity: dexVal / (ratios.dexterity / 100),
                };

                // Find max implied total
                let maxTotal = 0;
                let boundingStatKey = 'strength';
                for (const key of Object.keys(impliedTotals)) {
                  if (impliedTotals[key] > maxTotal) {
                    maxTotal = impliedTotals[key];
                    boundingStatKey = key;
                  }
                }

                // Calculate targets based on the max implied total
                const targets = {};
                targets.strength = Math.ceil(maxTotal * (ratios.strength / 100));
                targets.defense = Math.ceil(maxTotal * (ratios.defense / 100));
                targets.speed = Math.ceil(maxTotal * (ratios.speed / 100));
                targets.dexterity = Math.ceil(maxTotal * (ratios.dexterity / 100));

                // Helper to format stat differences
                const formatDiff = (num) => {
                  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'b';
                  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'm';
                  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
                  return num.toString();
                };

                const statMap = {
                  strength: { current: strVal, target: targets.strength, dot: dots.str, perk: baldrStats.strength, el: strEl },
                  defense: { current: defVal, target: targets.defense, dot: dots.def, perk: baldrStats.defense, el: defEl },
                  speed: { current: speVal, target: targets.speed, dot: dots.spe, perk: baldrStats.speed, el: speEl },
                  dexterity: { current: dexVal, target: targets.dexterity, dot: dots.dex, perk: baldrStats.dexterity, el: dexEl }
                };

                Object.keys(statMap).forEach(key => {
                  const stat = statMap[key];
                  const diff = stat.target - stat.current;

                  // Injected badge ID
                  const badgeId = 'tornagator-gym-trains-' + key;
                  let badge = document.getElementById(badgeId);
                  if (!badge) {
                    badge = document.createElement('span');
                    badge.id = badgeId;
                    badge.style.display = 'inline-block';
                    badge.style.marginLeft = '8px';
                    badge.style.fontSize = '11px';
                    badge.style.letterSpacing = '0.5px';
                    badge.style.padding = '2px 5px';
                    badge.style.borderRadius = '3px';
                    badge.style.verticalAlign = 'middle';

                    // Append right after the span value element
                    stat.el.parentNode.appendChild(badge);
                  }

                  // Render badge
                  if (diff > 0) {
                    badge.textContent = '+' + formatDiff(diff);
                    badge.style.display = 'inline-block';
                    badge.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                    badge.style.color = '#888';
                    badge.style.border = '1px solid #444';
                  } else {
                    badge.style.display = 'none';
                  }

                  // Color the stat elements
                  let highlightColor = '';
                  if (diff > 0) {
                    const percentAway = diff / stat.target;
                    if (percentAway < 0.1) {
                      highlightColor = '#73B005'; // Green
                    } else if (percentAway < 0.3) {
                      highlightColor = '#e67e22'; // Yellow
                    } else {
                      highlightColor = '#e74c3c'; // Red
                    }
                  } else {
                    highlightColor = ''; // Default
                  }

                  stat.el.style.color = highlightColor;
                  const titleEl = stat.el.parentNode.querySelector('[class^="title-"]');
                  if (titleEl) titleEl.style.color = highlightColor;

                  // Add a star next to the stat title
                  const starBadgeId = 'tornagator-primary-star-' + key;
                  let starBadge = document.getElementById(starBadgeId);
                  const isPrimary = (key === primaryKey);

                  if (!starBadge) {
                    starBadge = document.createElement('span');
                    starBadge.id = starBadgeId;
                    starBadge.style.fontSize = '12px';
                    starBadge.style.marginRight = '4px';
                    starBadge.style.verticalAlign = 'middle';
                    starBadge.style.cursor = 'pointer';
                    starBadge.title = isPrimary ? 'Primary Stat (Baldr Ratio)' : 'Click to set as Primary Stat';

                    starBadge.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('TORNAGATOR_BRIDGE:' + JSON.stringify({
                        tabId: '${tabId}',
                        type: 'set_baldr_primary',
                        stat: key
                      }));
                    });

                    // Try to find the label element (the sibling of stat.el)
                    let labelEl = Array.from(stat.el.parentNode.children).find(el => el !== stat.el && !el.id.includes('tornagator'));

                    if (labelEl) {
                      labelEl.prepend(starBadge);
                    } else {
                      // Fallback: prepend to the parent container
                      stat.el.parentNode.prepend(starBadge);
                    }
                  }

                  // Update star styling
                  starBadge.textContent = '★ ';
                  starBadge.style.color = isPrimary ? '#f39c12' : '#666'; // Gold or Gray
                  starBadge.style.textShadow = isPrimary ? '0 0 2px rgba(243,156,18,0.5)' : 'none';
                });
              }
            } catch (err) {
              console.error('[TORNagator] Baldr Gym Optimizer injection error:', err);
            }
          }

          if ((isTravel || isCrimes) && (!window._tornagator_market_values || !window._tornagator_market_values_by_id)) {
            return null;
          }

          const marketValuesById = window._tornagator_market_values_by_id || {};
          const marketValues = window._tornagator_market_values || {};

          if (isTravel || isCrimes) {
            const hasTravelTable = !!document.querySelector('[class*="stockTableWrapper___"]');
            const hasCrimesOutcome = !!document.querySelector('div[class*=outcomeReward___]');

            if (!hasTravelTable && !hasCrimesOutcome) {
              return null;
            }

            if (!window._tornagator_sorted_names && window._tornagator_market_values) {
              window._tornagator_sorted_names = Object.keys(marketValues).sort((a, b) => b.length - a.length);
            }
            const sortedNames = window._tornagator_sorted_names || [];
            const cargoCapacity = window._tornagator_cargo_capacity || 5;


            // 1. Find and update header cells
            if (hasTravelTable) {
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
                  profitHeaderSpan.style.color = '#888';
                  profitHeaderSpan.style.fontWeight = 'normal';
                  profitHeaderSpan.style.fontSize = '0.85em';
                  profitHeaderSpan.style.marginLeft = '4px';
                  costBtn.appendChild(profitHeaderSpan);
                }
              }

              // Cleanup any previously injected profit columns/headers if they exist in DOM
              document.querySelectorAll('.injected-profit-header, .injected-profit-cell').forEach(el => el.remove());

              // Determine current travel display mode (default: sell)
              if (!window._tornagator_travel_mode) {
                let savedMode = 'sell';
                try {
                  savedMode = localStorage.getItem('tornagator_travel_mode') || 'sell';
                } catch (e) {}
                window._tornagator_travel_mode = savedMode;
              }

              // Define global redraw function for travel rows once
              window._tornagator_redraw_travel = () => {
                const mode = window._tornagator_travel_mode || 'sell';
                const currentRows = Array.from(document.querySelectorAll('[class*="row___"]')).filter(r => {
                  const hasInput = Array.from(r.querySelectorAll('input')).some(inp => {
                    const type = (inp.getAttribute('type') || 'text').toLowerCase();
                    return type !== 'button' && type !== 'submit' && type !== 'image' && type !== 'hidden';
                  });
                  const hasBtn = r.querySelector('button, a, [role="button"], input[type="button"], input[type="submit"]');
                  return hasInput && hasBtn && r.children.length >= 5;
                });


                for (const r of currentRows) {
                  const tWrapper = r.closest('[class*="stockTableWrapper___"]') || r.parentElement?.parentElement;
                  const hRow = tWrapper ? tWrapper.querySelector('[class*="itemsHeader___"]') : null;
                  if (!hRow) continue;

                  const origHeaderCells = Array.from(hRow.children);
                  const costHIdx = origHeaderCells.findIndex(cell => cell.textContent.toLowerCase().includes('cost'));
                  const nameHIdx = origHeaderCells.findIndex(cell => cell.textContent.toLowerCase().includes('name'));
                  if (costHIdx === -1 || nameHIdx === -1) continue;

                  const origRowCells = Array.from(r.children);
                  const cCell = origRowCells[costHIdx];
                  const nCell = origRowCells[nameHIdx];
                  if (!cCell || !nCell) continue;

                  let pSpan = nCell.querySelector('.injected-market-price');
                  let nameTextSpan = nCell.querySelector('.tornagator-name-text');
                  let wrapper = nCell.querySelector('.tornagator-cell-wrapper');

                  let iName = '';
                  if (nameTextSpan) {
                    iName = nameTextSpan.textContent;
                  } else {
                    iName = nCell.textContent;
                    if (pSpan) {
                      iName = iName.replace(pSpan.textContent, '');
                    }
                  }
                  iName = iName.trim().toLowerCase();

                  let mValue = 0;
                  let mName = '';
                  for (const name of sortedNames) {
                    if (iName.includes(name)) {
                      mValue = marketValues[name];
                      mName = name;
                      break;
                    }
                  }


                  if (!mName) continue;

                  // Setup wrapper / styles on name cell to support stacked name and pill layout
                  if (!wrapper) {
                    wrapper = document.createElement('div');
                    wrapper.className = 'tornagator-cell-wrapper';
                    wrapper.style.display = 'flex';
                    wrapper.style.flexDirection = 'column';
                    wrapper.style.justifyContent = 'center';
                    wrapper.style.alignItems = 'flex-start';
                    wrapper.style.width = '100%';
                    wrapper.style.boxSizing = 'border-box';

                    if (!nameTextSpan) {
                      nameTextSpan = document.createElement('span');
                      nameTextSpan.className = 'tornagator-name-text';
                      nameTextSpan.style.overflow = 'hidden';
                      nameTextSpan.style.textOverflow = 'ellipsis';
                      nameTextSpan.style.whiteSpace = 'nowrap';
                      nameTextSpan.style.width = '100%';
                      nameTextSpan.style.display = 'block';

                      const nodesToMove = [];
                      for (const child of Array.from(nCell.childNodes)) {
                        if (child !== pSpan && child !== wrapper) {
                          nodesToMove.push(child);
                        }
                      }
                      nodesToMove.forEach(node => nameTextSpan.appendChild(node));
                      wrapper.appendChild(nameTextSpan);
                    } else {
                      wrapper.appendChild(nameTextSpan);
                    }

                    if (pSpan) {
                      wrapper.appendChild(pSpan);
                    }
                    nCell.appendChild(wrapper);
                  }

                  const ndSpaceSpan = cCell.querySelector('[class*="neededSpace___"]');
                  const cText = (ndSpaceSpan || cCell).textContent.replace(/[^0-9]/g, '');
                  const cCost = parseInt(cText, 10) || 0;
                  const pPerItem = mValue - cCost;
                  const tProfit = pPerItem * cargoCapacity;

                  if (!pSpan) {
                    pSpan = document.createElement('span');
                    pSpan.className = 'injected-market-price';
                    wrapper.appendChild(pSpan);
                  }

                  pSpan.style.fontSize = '0.74em';
                  pSpan.style.cursor = 'pointer';
                  pSpan.style.padding = '2px 6px';
                  pSpan.style.borderRadius = '4px';
                  pSpan.style.userSelect = 'none';
                  pSpan.style.display = 'inline-block';
                  pSpan.style.fontWeight = 'bold';
                  pSpan.style.fontFamily = "-apple-system, BlinkMacSystemFont, sans-serif";
                  pSpan.style.transition = 'all 0.1s ease';
                  pSpan.style.marginTop = '4px';

                  if (!nCell.dataset.hasClickListener) {
                    nCell.dataset.hasClickListener = 'true';
                    nCell.style.cursor = 'pointer';
                    nCell.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newMode = window._tornagator_travel_mode === 'sell' ? 'profit' : 'sell';
                      window._tornagator_travel_mode = newMode;
                      try {
                        localStorage.setItem('tornagator_travel_mode', newMode);
                      } catch (e) {}
                      if (typeof window._tornagator_redraw_travel === 'function') {
                        window._tornagator_redraw_travel();
                      }
                    });
                  }

                  if (mValue === 0) {
                    pSpan.textContent = 'N/A';
                    pSpan.style.color = '#888';
                    pSpan.style.background = 'rgba(255, 255, 255, 0.05)';
                    pSpan.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                  } else {
                    if (mode === 'sell') {
                      pSpan.textContent = 'Sell: $' + mValue.toLocaleString();
                      pSpan.style.color = '#3498db';
                      pSpan.style.background = 'rgba(52, 152, 219, 0.08)';
                      pSpan.style.border = '1px solid rgba(52, 152, 219, 0.18)';
                    } else {
                      const isProfit = tProfit > 0;
                      pSpan.textContent = 'Cargo: ' + (isProfit ? '+' : '') + '$' + tProfit.toLocaleString();
                      pSpan.style.color = isProfit ? '#2ecc71' : '#e74c3c';
                      pSpan.style.background = isProfit ? 'rgba(46, 204, 113, 0.08)' : 'rgba(231, 76, 60, 0.08)';
                      pSpan.style.border = isProfit ? '1px solid rgba(46, 204, 113, 0.18)' : '1px solid rgba(231, 76, 60, 0.18)';
                    }
                  }
                }
              };

              // Trigger initial redraw immediately
              window._tornagator_redraw_travel();
            }

            // 3. Inject market values for found items on Crimes page (ONLY under outcome reward container)
            if (hasCrimesOutcome) {
              if (!document.getElementById('tornagator-crime-styles')) {
                const style = document.createElement('style');
                style.id = 'tornagator-crime-styles';
                style.textContent = 'div[class*=itemCell___] { position: relative !important; } div[class*=itemCell___][data-crime-value]::after { content: attr(data-crime-value); position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none; text-align: center; font-size: 0.62rem; font-weight: bold; padding: 1px 4px; border-radius: 3px; background-color: rgba(0, 0, 0, 0.85); border: 1px solid rgba(255, 255, 255, 0.15); display: block; z-index: 5; } div[class*=itemCell___][data-crime-value="..."]::after { color: #aaa; } div[class*=itemCell___][data-crime-value="N/A"]::after { color: #888; } div[class*=itemCell___][data-crime-value^="$"]::after { color: #10b981; }';
                document.head.appendChild(style);
              }

              const rewardCells = document.querySelectorAll('div[class*=outcomeReward___] div[class*=itemCell___]');
              
              for (const cell of rewardCells) {
                const img = cell.querySelector('img[class*=image___]');
                if (!img) {
                  if (cell.hasAttribute('data-crime-value')) {
                    cell.removeAttribute('data-crime-value');
                  }
                  continue;
                }

                const currentAttr = cell.getAttribute('data-crime-value');
                if (currentAttr && currentAttr !== '...') continue;

                const src = img.getAttribute('src') || img.src || '';
                if (!src) continue;

                // Extract item ID from src url (e.g. /images/items/904/medium.png)
                const parts = src.split('/');
                const itemId = parts.find(p => p && !isNaN(p) && /^[0-9]+$/.test(p));
                if (!itemId) continue;

                // Setup badge drawing function
                const renderBadge = (val) => {
                  // Check quantity
                  const countSpan = cell.querySelector('span[class*=count___]');
                  const qty = countSpan ? (parseInt(countSpan.textContent.replace(/[^0-9]/g, ''), 10) || 1) : 1;

                  if (val > 0) {
                    const totalVal = val * qty;
                    if (qty > 1) {
                      cell.setAttribute('data-crime-value', '$' + totalVal.toLocaleString() + ' ($' + val.toLocaleString() + ')');
                    } else {
                      cell.setAttribute('data-crime-value', '$' + val.toLocaleString());
                    }
                  } else {
                    cell.setAttribute('data-crime-value', 'N/A');
                  }
                };

                const marketValue = marketValuesById[itemId];
                if (marketValue !== undefined) {
                  renderBadge(marketValue);
                } else {
                  if (currentAttr === '...') continue;
                  if (window._tornagator_fetching_catalog) continue;

                  cell.setAttribute('data-crime-value', '...');

                  window._tornagator_fetching_catalog = true;
                  console.log("[TORNagator Webview] Requesting Torn items catalog on-demand for itemId:", itemId);

                  marketValuesById[itemId] = 0;
                  window._tornagator_pending_item_id = itemId;
                }
              }
            }

            const pendingItemId = window._tornagator_pending_item_id || null;
            if (pendingItemId) {
              window._tornagator_pending_item_id = null;
            }
            return { requestFetchItemId: pendingItemId };
          }

          if (isItemMarket) {
            // 1. Inject styles once
            let style = document.getElementById('tornagator-scan-styles');
            if (!style) {
              style = document.createElement('style');
              style.id = 'tornagator-scan-styles';
              style.textContent = '.tornagator-market-scan-btn { position: fixed; bottom: 80px; right: 20px; z-index: 99999; background: linear-gradient(135deg, rgba(231,76,60,0.95), rgba(192,41,43,0.95)); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 30px; padding: 10px 20px; font-size: 13px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2); display: flex; align-items: center; gap: 8px; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); } .tornagator-market-scan-btn:hover { transform: translateY(-3px) scale(1.05); box-shadow: 0 8px 25px rgba(231, 76, 60, 0.5); background: linear-gradient(135deg, #e74c3c, #c0392b); } .tornagator-market-scan-btn:active { transform: translateY(1px) scale(0.98); }';
              document.head.appendChild(style);
            }

            // 2. Inject the floating scanner button if not already present
            if (!document.querySelector('.tornagator-market-scan-btn')) {
              const scanBtn = document.createElement('button');
              scanBtn.className = 'tornagator-market-scan-btn';
              scanBtn.innerHTML = '<span>🔍</span> Scan Buy Mug Targets';
              scanBtn.onclick = () => {
                if (window._tornagator_run_seller_scan) {
                  window._tornagator_run_seller_scan();
                }
              };
              document.body.appendChild(scanBtn);
            }

            // 3. Define the scanning logic globally once in the webview context
            if (!window._tornagator_run_seller_scan) {
              // Climbing-ancestor method to find listing rows
              const findListingRows = () => {
                const found = [];
                const profileLinks = document.querySelectorAll('a[href*="profiles.php?XID="]');
                profileLinks.forEach(pLink => {
                  let ancestor = pLink.parentElement;
                  let depth = 0;
                  while (ancestor && depth < 8) {
                    const buyBtn = Array.from(ancestor.querySelectorAll('button, a, [role="button"], input')).find(el => {
                      const text = (el.textContent || el.value || '').trim().toLowerCase();
                      const className = (el.className || '').toString().toLowerCase();
                      return text.includes('buy') || className.includes('buy') || el.tagName === 'BUTTON';
                    });
                    if (buyBtn) {
                      if (!found.some(r => r.row === ancestor)) {
                        found.push({ row: ancestor, pLink, buyBtn });
                      }
                      break;
                    }
                    ancestor = ancestor.parentElement;
                    depth++;
                  }
                });
                return found;
              };

              window._tornagator_run_seller_scan = async () => {
                const session = Date.now();
                window._tornagator_scan_session = session;

                const hostFetch = (url) => {
                  return new Promise((resolve, reject) => {
                    const id = Math.random().toString(36).substr(2, 9);
                    window._tornagator_pending_fetches = window._tornagator_pending_fetches || [];
                    console.log("TORNAGATOR_BRIDGE:" + JSON.stringify({
                      type: "fetch",
                      id: id,
                      url: url,
                      tabId: window._tornagator_tab_id
                    }));

                    const checkInterval = setInterval(() => {
                      if (window._tornagator_fetch_responses && window._tornagator_fetch_responses[id]) {
                        clearInterval(checkInterval);
                        const res = window._tornagator_fetch_responses[id];
                        delete window._tornagator_fetch_responses[id];
                        if (res.error) {
                          reject(new Error(res.error));
                        } else {
                          resolve(res.data);
                        }
                      }
                    }, 50);
                  });
                };

                // Clear any running queue processing and states
                window._tornagator_scan_queue = [];
                window._tornagator_scan_results = [];
                window._tornagator_scan_attempted = [];
                window._tornagator_scan_completed = 0;
                window._tornagator_scan_processing = false;
                window._tornagator_scan_current_id = null;

                if (window._tornagator_scan_observer) {
                  window._tornagator_scan_observer.disconnect();
                  window._tornagator_scan_observer = null;
                }

                const currentRows = findListingRows();

                // Create or open the glassmorphic scanning panel
                let panel = document.getElementById('tornagator-scan-panel');
                if (!panel) {
                  panel = document.createElement('div');
                  panel.id = 'tornagator-scan-panel';
                  panel.style.position = 'fixed';
                  panel.style.top = '60px';
                  panel.style.right = '20px';
                  panel.style.width = '340px';
                  panel.style.maxHeight = '75vh';
                  panel.style.backgroundColor = 'rgba(20, 20, 20, 0.95)';
                  panel.style.backdropFilter = 'blur(10px)';
                  panel.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                  panel.style.borderRadius = '10px';
                  panel.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
                  panel.style.zIndex = '999999';
                  panel.style.display = 'flex';
                  panel.style.flexDirection = 'column';
                  panel.style.padding = '12px';
                  panel.style.color = '#fff';
                  panel.style.fontFamily = 'Inter, Roboto, Arial, sans-serif';
                  document.body.appendChild(panel);
                }

                panel.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:10px;"><span style="font-weight:bold; font-size:13px; color:#e74c3c; display:flex; align-items:center; gap:6px;">🛡️ BUY MUG ANALYSIS</span><button id="tornagator-close-scan" style="background:none; border:none; color:#888; font-size:16px; cursor:pointer; padding:0 4px;">&times;</button></div><div id="tornagator-scan-body" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px;"><div style="font-size:11px; color:#aaa; margin-bottom:4px; display:flex; justify-content:space-between;"><span id="scan-progress-text">Progress: 0/0</span></div><div style="height:4px; background-color:#222; border-radius:2px; overflow:hidden; margin-bottom:8px;"><div id="scan-progress-bar" style="width:0%; height:100%; background-color:#e74c3c; transition:width 0.2s;"></div></div><div id="scan-results-list" style="display:flex; flex-direction:column; gap:6px;"></div></div>';

                panel.querySelector('#tornagator-close-scan').onclick = () => {
                  if (window._tornagator_scan_observer) {
                    window._tornagator_scan_observer.disconnect();
                    window._tornagator_scan_observer = null;
                  }
                  window._tornagator_scan_queue = [];
                  window._tornagator_scan_results = [];
                  window._tornagator_scan_attempted = [];
                  window._tornagator_scan_current_id = null;
                  window._tornagator_scan_processing = false;
                  panel.remove();
                };

                const body = panel.querySelector('#tornagator-scan-body');
                const listContainer = panel.querySelector('#scan-results-list');
                const apiKey = window._tornagator_api_key;
                const userData = window._tornagator_user_data || {};

                if (!apiKey) {
                  body.innerHTML = '<div style="color:#e74c3c; text-align:center; padding:15px 0; font-size:11px; font-weight:bold;">API Key not found inside webview. Please reload or check your settings.</div>';
                  return;
                }

                const initialSellers = [];
                currentRows.forEach(item => {
                  const pLink = item.pLink;
                  const href = pLink.getAttribute('href') || '';
                  const m = href.match(/XID=(\\d+)/i);
                  if (!m) return;
                  const id = m[1];
                  const name = pLink.textContent.trim();
                  if (!initialSellers.some(s => s.id === id)) {
                    initialSellers.push({ id, name, row: item.row });
                  }
                });

                if (initialSellers.length === 0) {
                  body.innerHTML = '<div style="color:#aaa; text-align:center; padding:15px 0; font-size:11px; font-weight:bold;">No sellers found on page. Please select an item to view listings.</div>';
                  return;
                }

                window._tornagator_scan_queue = initialSellers;

                const escapeHtml = (unsafe) => {
                  return (unsafe || '').toString()
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
                };

                const getScanTotalCount = () => {
                  return window._tornagator_scan_results.length + window._tornagator_scan_queue.length + (window._tornagator_scan_current_id ? 1 : 0);
                };

                const updateProgressUI = () => {
                  const completed = window._tornagator_scan_completed;
                  const total = getScanTotalCount();
                  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 100;
                  const progressText = panel.querySelector('#scan-progress-text');
                  if (progressText) {
                    progressText.textContent = 'Progress: ' + completed + '/' + total;
                  }
                  const progressBar = panel.querySelector('#scan-progress-bar');
                  if (progressBar) {
                    progressBar.style.width = progressPct + '%';
                  }
                };

                const sortAndRenderResults = () => {
                  const order = { 'Very Easy': 1, 'Easy': 2, 'Medium': 3, 'Hard': 4, 'Jail': 5, 'Hospital': 6 };
                  window._tornagator_scan_results.sort((a, b) => {
                    const valA = order[a.assessment] || (a.state === 'Okay' ? 1.5 : 7);
                    const valB = order[b.assessment] || (b.state === 'Okay' ? 1.5 : 7);
                    return valA - valB;
                  });

                  listContainer.innerHTML = '';
                  window._tornagator_scan_results.forEach(res => {
                    const sortedEl = document.createElement('div');
                    sortedEl.style.backgroundColor = 'rgba(255,255,255,0.02)';
                    sortedEl.style.padding = '8px';
                    sortedEl.style.borderRadius = '6px';
                    sortedEl.style.border = '1px solid ' + res.assessmentColor + '33';
                    sortedEl.style.display = 'flex';
                    sortedEl.style.justifyContent = 'space-between';
                    sortedEl.style.alignItems = 'center';
                    sortedEl.style.fontSize = '11px';
                    sortedEl.style.cursor = 'pointer';
                    sortedEl.style.transition = 'background-color 0.2s';
                    sortedEl.style.marginBottom = '4px';

                    sortedEl.onclick = () => {
                      window.location.href = 'https://www.torn.com/profiles.php?XID=' + res.id;
                    };
                    sortedEl.onmouseenter = () => sortedEl.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    sortedEl.onmouseleave = () => sortedEl.style.backgroundColor = 'rgba(255,255,255,0.02)';

                    sortedEl.innerHTML = '<div style="flex:1; min-width:0; padding-right:8px;"><div style="display:flex; justify-content:space-between; align-items:center;"><span style="font-weight:bold; color:#fff;">' + escapeHtml(res.name) + '</span><span style="color:#888; font-size:10px;">Lvl ' + res.level + ' &bull; Age ' + res.age + 'd</span></div><div style="font-size:10px; color:#aaa; display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;"><span>WR: <strong style="color:' + (res.winRate >= 70 ? '#e74c3c' : res.winRate >= 50 ? '#f39c12' : '#2ecc71') + '">' + res.winRate + '%</strong></span><span>Cri: ' + res.crimes.toLocaleString() + '</span><span>Drg: ' + res.drugs.toLocaleString() + '</span></div></div><div style="flex-shrink:0;"><span style="display:inline-block; font-size:10px; font-weight:bold; color:' + res.assessmentColor + '; padding:2px 6px; border-radius:10px; background-color:' + res.assessmentColor + '15; border:1px solid ' + res.assessmentColor + '44;">' + res.assessment + '</span></div>';
                    listContainer.appendChild(sortedEl);
                  });

                  if (window._tornagator_scan_queue.length === 0) {
                    const completeEl = document.createElement('div');
                    completeEl.style.color = '#2ecc71';
                    completeEl.style.fontSize = '10px';
                    completeEl.style.fontWeight = 'bold';
                    completeEl.style.textAlign = 'center';
                    completeEl.style.marginTop = '4px';
                    completeEl.style.marginBottom = '6px';
                    completeEl.textContent = '✅ Analysis complete. Sorted by threat level.';
                    listContainer.insertBefore(completeEl, listContainer.firstChild);
                  }
                };

                const processSeller = async (seller, rowEl) => {
                  try {
                    const data = await hostFetch('https://api.torn.com/user/' + seller.id + '?selections=profile,personalstats&key=' + apiKey);

                    if (data.error) {
                      throw new Error(data.error.error || 'API Error');
                    }

                    const profile = data || {};
                    const ps = data.personalstats || {};

                    const level = profile.level || 0;
                    const age = profile.age || 0;
                    const statusState = profile.status?.state || 'Okay';
                    const statusDesc = profile.status?.description || '';

                    const attacksWon = ps.attackswon || 0;
                    const attacksLost = ps.attackslost || 0;
                    const defendsWon = ps.defendswon || 0;
                    const defendsLost = ps.defendslost || 0;
                    const totalFights = attacksWon + attacksLost + defendsWon + defendsLost;
                    const winRate = totalFights > 0 ? Math.round(((attacksWon + defendsWon) / totalFights) * 100) : 0;

                    const criminalOffenses = ps.criminaloffenses || 0;
                    const drugsUsed = ps.drugsused || 0;
                    const refills = (ps.refills || 0) + (ps.nerverefills || 0) + (ps.tokenrefills || 0);
                    const boosters = ps.boostersused || 0;

                    // User comparison
                    const userLevel = userData.level || 0;
                    const userCrimes = userData.personalstats?.criminaloffenses || 0;
                    const userDrugs = userData.personalstats?.drugsused || 0;
                    const userRefills = (userData.personalstats?.refills || 0) + (userData.personalstats?.nerverefills || 0) + (userData.personalstats?.tokenrefills || 0);
                    const userBoosters = userData.personalstats?.boostersused || 0;

                    let pointsWeWin = 0;
                    if (userLevel > level) pointsWeWin++;
                    if (winRate < 50) pointsWeWin++;
                    if (userCrimes > criminalOffenses) pointsWeWin++;
                    if (userDrugs > drugsUsed) pointsWeWin++;
                    if (userRefills > refills) pointsWeWin++;
                    if (userBoosters > boosters) pointsWeWin++;

                    let assessment = 'Easy';
                    let assessmentColor = '#2ecc71';

                    if (level > userLevel + 10 || winRate > 80) {
                      assessment = 'Hard';
                      assessmentColor = '#e74c3c';
                    } else if (level > userLevel || winRate > 65) {
                      assessment = 'Medium';
                      assessmentColor = '#f39c12';
                    } else if (pointsWeWin >= 4) {
                      assessment = 'Very Easy';
                      assessmentColor = '#2ecc71';
                    } else {
                      assessment = 'Easy';
                      assessmentColor = '#2ecc71';
                    }

                    if (statusState !== 'Okay') {
                      assessment = statusState;
                      assessmentColor = statusState === 'Hospital' ? '#e74c3c' : '#f39c12';
                    }

                    const result = {
                      id: seller.id,
                      name: seller.name,
                      level,
                      age,
                      winRate,
                      state: statusState,
                      statusDesc,
                      assessment,
                      assessmentColor,
                      crimes: criminalOffenses,
                      drugs: drugsUsed,
                      refills,
                      boosters
                    };

                    const existingIdx = window._tornagator_scan_results.findIndex(r => r.id === seller.id);
                    if (existingIdx !== -1) {
                      window._tornagator_scan_results[existingIdx] = result;
                    } else {
                      window._tornagator_scan_results.push(result);
                    }

                    // Update UI listing element
                    if (rowEl) {
                      rowEl.style.border = '1px solid ' + assessmentColor + '33';
                      rowEl.innerHTML = '<div style="flex:1; min-width:0; padding-right:8px;"><div style="display:flex; justify-content:space-between; align-items:center;"><span style="font-weight:bold; color:#fff;">' + escapeHtml(seller.name) + '</span><span style="color:#888; font-size:10px;">Lvl ' + level + ' &bull; Age ' + age + 'd</span></div><div style="font-size:10px; color:#aaa; display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;"><span>WR: <strong style="color:' + (winRate >= 70 ? '#e74c3c' : winRate >= 50 ? '#f39c12' : '#2ecc71') + '">' + winRate + '%</strong></span><span>Cri: ' + criminalOffenses.toLocaleString() + '</span><span>Drg: ' + drugsUsed.toLocaleString() + '</span></div></div><div style="flex-shrink:0;"><span style="display:inline-block; font-size:10px; font-weight:bold; color:' + assessmentColor + '; padding:2px 6px; border-radius:10px; background-color:' + assessmentColor + '15; border:1px solid ' + assessmentColor + '44;">' + assessment + '</span></div>';
                      
                      rowEl.style.cursor = 'pointer';
                      rowEl.onclick = () => {
                        window.location.href = 'https://www.torn.com/profiles.php?XID=' + seller.id;
                      };
                      rowEl.onmouseenter = () => rowEl.style.backgroundColor = 'rgba(255,255,255,0.05)';
                      rowEl.onmouseleave = () => rowEl.style.backgroundColor = 'rgba(255,255,255,0.01)';
                    }

                    // Inject visual badges inline next to seller's name in market row
                    const sellerNameLink = seller.row.querySelector('a[href*="profiles.php?XID="]');
                    if (sellerNameLink) {
                      seller.row.querySelectorAll('.injected-mug-badge').forEach(b => b.remove());
                      const badge = document.createElement('span');
                      badge.className = 'injected-mug-badge';
                      badge.style.display = 'inline-block';
                      badge.style.marginLeft = '8px';
                      badge.style.fontSize = '9px';
                      badge.style.fontWeight = 'bold';
                      badge.style.padding = '1px 5px';
                      badge.style.borderRadius = '6px';
                      badge.style.color = assessmentColor;
                      badge.style.backgroundColor = assessmentColor + '11';
                      badge.style.border = '1px solid ' + assessmentColor + '44';
                      badge.style.cursor = 'help';
                      badge.title = 'Lvl: ' + level + ' | Win Rate: ' + winRate + '% | Age: ' + age + 'd | State: ' + statusState + (statusDesc ? ' (' + statusDesc.replace(/<[^>]+>/g, '') + ')' : '');
                      badge.textContent = 'Lvl ' + level + ' | WR ' + winRate + '% | ' + assessment;
                      sellerNameLink.parentNode.insertBefore(badge, sellerNameLink.nextSibling);
                    }

                  } catch (e) {
                    console.error('Scan error:', e);
                    if (rowEl) {
                      rowEl.style.backgroundColor = 'rgba(231,76,60,0.05)';
                      rowEl.style.border = '1px solid #e74c3c33';
                      rowEl.innerHTML = '<div style="font-weight:bold; color:#fff;">' + escapeHtml(seller.name) + '</div><div style="color:#e74c3c; font-size:10px; margin-top:2px;">Fetch Failed: ' + escapeHtml(e.message) + '</div>';
                    }
                  }

                  window._tornagator_scan_completed++;
                  updateProgressUI();
                };

                const processQueue = async () => {
                  if (window._tornagator_scan_processing) return;
                  window._tornagator_scan_processing = true;

                  while (window._tornagator_scan_queue.length > 0) {
                    if (window._tornagator_scan_session !== session) {
                      break;
                    }
                    const seller = window._tornagator_scan_queue.shift();
                    window._tornagator_scan_current_id = seller.id;
                    window._tornagator_scan_attempted.push(seller.id);

                    let rowEl = document.getElementById('seller-row-' + seller.id);
                    if (!rowEl) {
                      rowEl = document.createElement('div');
                      rowEl.id = 'seller-row-' + seller.id;
                      rowEl.style.backgroundColor = 'rgba(255,255,255,0.01)';
                      rowEl.style.padding = '8px';
                      rowEl.style.borderRadius = '6px';
                      rowEl.style.border = '1px solid #333';
                      rowEl.style.display = 'flex';
                      rowEl.style.justifyContent = 'space-between';
                      rowEl.style.alignItems = 'center';
                      rowEl.style.fontSize = '11px';
                      rowEl.style.marginBottom = '4px';
                      rowEl.innerHTML = '<div><span style="font-weight:bold; color:#fff;">' + escapeHtml(seller.name) + '</span><span style="color:#666; font-size:10px; margin-left:4px;">[' + seller.id + ']</span></div><div style="color:#888; font-style:italic;">Queueing...</div>';
                      listContainer.appendChild(rowEl);
                    }

                    rowEl.querySelector('div:last-child').textContent = 'Fetching...';
                    await processSeller(seller, rowEl);
                    window._tornagator_scan_current_id = null;

                    if (window._tornagator_scan_queue.length > 0) {
                      await new Promise(r => setTimeout(r, 350));
                    }
                  }

                  window._tornagator_scan_processing = false;
                  sortAndRenderResults();
                };

                // Start initial process
                updateProgressUI();
                processQueue();

                // 4. Set up the MutationObserver to dynamically parse and append new listings
                const targetNode = document.querySelector('.content-wrapper') || document.body || document.documentElement;
                if (targetNode) {
                  const observer = new MutationObserver(() => {
                    const allRows = findListingRows();
                    const newSellers = [];
                    allRows.forEach(item => {
                      const pLink = item.pLink;
                      const href = pLink.getAttribute('href') || '';
                      const m = href.match(/XID=(\\d+)/i);
                      if (!m) return;
                      const id = m[1];
                      const name = pLink.textContent.trim();

                      const alreadyProcessed = window._tornagator_scan_results.some(r => r.id === id);
                      const alreadyQueued = window._tornagator_scan_queue.some(s => s.id === id);
                      const alreadyAttempted = window._tornagator_scan_attempted.includes(id);
                      const isProcessing = window._tornagator_scan_current_id === id;

                      if (!alreadyProcessed && !alreadyQueued && !isProcessing && !alreadyAttempted) {
                        newSellers.push({ id, name, row: item.row });
                      }
                    });

                    if (newSellers.length > 0) {
                      window._tornagator_scan_queue.push(...newSellers);
                      updateProgressUI();
                      if (!window._tornagator_scan_processing) {
                        processQueue();
                      }
                    }
                  });
                  observer.observe(targetNode, { childList: true, subtree: true });
                  window._tornagator_scan_observer = observer;
                }
              };
            }
          }

          return null;
        } catch (e) {
          console.error("Profit/Crimes injection error:", e);
          return null;
        }
      })()
    `;

    if (isCapacitor) {
      const profitInterval = setInterval(() => {
        if (!window.AndroidTornBridge || !window.AndroidTornBridge.executeInOverlay) return;

        const currentUrl = tabUrl || '';
        const isTravel = currentUrl.includes('travelagency.php') || currentUrl.includes('sid=travel') || (currentUrl.includes('index.php') && userData?.status?.state === 'Traveling');
        const isCrimes = currentUrl.includes('crimes.php') || currentUrl.includes('sid=crimes');
        const isItemMarket = currentUrl.includes('imarket.php') || currentUrl.includes('sid=ItemMarket') || currentUrl.includes('sid=itemmarket') || currentUrl.includes('sid=imarket');
        const isGym = currentUrl.includes('gym.php');

        console.log('[TORNagator] interval tick - tabUrl:', currentUrl, 'isGym:', isGym, 'tabId:', tabId);

        if (!isTravel && !isCrimes && !isItemMarket && !isGym) return;

        if (isGym) {
          window._tornagator_last_injected_script = script;
        }

        window.AndroidTornBridge.executeInOverlay(tabId, script);
      }, 1000);

      return () => clearInterval(profitInterval);
    } else {
      const wv = webviewRef.current;
      if (!wv || !isElectron) return;

      const profitInterval = setInterval(() => {
        let currentUrl = '';
        try {
          if (!wv.isConnected) return;
          wv.getWebContentsId(); // Ensure webview is attached and ready
          currentUrl = wv.getURL() || '';
        } catch (e) {
          return;
        }

        const isTravel = currentUrl.includes('travelagency.php') || currentUrl.includes('sid=travel') || (currentUrl.includes('index.php') && userData?.status?.state === 'Traveling');
        const isCrimes = currentUrl.includes('crimes.php') || currentUrl.includes('sid=crimes');
        const isItemMarket = currentUrl.includes('imarket.php') || currentUrl.includes('sid=ItemMarket') || currentUrl.includes('sid=itemmarket') || currentUrl.includes('sid=imarket');
        const isGym = currentUrl.includes('gym.php');

        if (!isTravel && !isCrimes && !isItemMarket && !isGym) return;

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
    }
  }, [isActive, isNewTab, userData, tabUrl, tabId, baldrHighestStat]);

  const placeholderRef = useRef(null);

  // Reusable callback to sync all React-side metadata (API keys, user/faction details, market prices) to WebView global namespace
  const syncMetadata = useCallback(() => {
    if (!isCapacitor) return;
    if (!window.AndroidTornBridge || !window.AndroidTornBridge.executeInOverlay) return;

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

    const injectScript = `
      (() => {
        window._tornagator_market_values = ${JSON.stringify(itemsMarketValues)};
        window._tornagator_market_values_by_id = ${JSON.stringify(itemsMarketValuesById)};
        window._tornagator_cargo_capacity = ${cargoCapacity || 5};
        window._tornagator_sorted_names = null;
        window._tornagator_api_key = ${JSON.stringify(apiKey)};
        window._tornagator_user_data = ${JSON.stringify(userData)};
        window._tornagator_faction_data = ${JSON.stringify(factionData)};
        window._tornagator_tab_id = ${JSON.stringify(tabId)};
      })()
    `;

    console.log("TORNagator: Syncing metadata into overlay WebView for", tabId);
    window.AndroidTornBridge.executeInOverlay(tabId, injectScript);
  }, [itemsData, cargoCapacity, apiKey, userData, factionData, tabId]);

  // Clean up WebView instance on Android when browser tab component is unmounted
  useEffect(() => {
    return () => {
      if (isCapacitor && window.AndroidTornBridge && window.AndroidTornBridge.destroyTorn) {
        console.log(`[WebviewTab] Component unmounting, destroying WebView for tabId=${tabId}`);
        window.AndroidTornBridge.destroyTorn(tabId);
      }
    };
  }, [tabId]);

  // Sync back/forward button states and url updates from native WebView
  useEffect(() => {
    if (!isCapacitor) return;
    if (!isActive) return;

    const handleTornUrlChange = (e) => {
      const { tabId: eventTabId, url, title, canGoBack: nativeCanGoBack, canGoForward: nativeCanGoForward } = e.detail || {};
      if (eventTabId && eventTabId !== tabId) return;
      setCanGoBack(!!nativeCanGoBack);
      setCanGoForward(!!nativeCanGoForward);

      if (tabId) {
        const updates = {
          canGoBack: !!nativeCanGoBack,
          canGoForward: !!nativeCanGoForward
        };
        if (url && url !== tabUrl) {
          const resolvedTitle = (title && title !== 'about:blank' && !title.startsWith('http://') && !title.startsWith('https://')) ? title : 'Loading...';
          updates.url = url;
          updates.title = resolvedTitle;
        }
        onUpdate(tabId, updates);
      }

      // Inject stats redirects and styles on Capacitor overlay
      if (window.AndroidTornBridge && window.AndroidTornBridge.executeInOverlay) {
        syncMetadata();
        window.AndroidTornBridge.executeInOverlay(tabId, INJECTED_CSS_SCRIPT);
        window.AndroidTornBridge.executeInOverlay(tabId, STATS_REDIR_SCRIPT);

        // Auto-select target country if active
        if (targetCountry) {
          setTimeout(() => {
            trySelectCountry();
          }, 500);
        }
      }
    };

    const handleTornTitleChange = (e) => {
      const { tabId: eventTabId, title } = e.detail || {};
      if (eventTabId && eventTabId !== tabId) return;
      if (tabId && title) {
        onUpdate(tabId, { title });
      }
    };

    window.addEventListener('tornUrlChange', handleTornUrlChange);
    window.addEventListener('tornTitleChange', handleTornTitleChange);

    // Run initial injections if overlay is active
    if (window.AndroidTornBridge && window.AndroidTornBridge.executeInOverlay) {
      syncMetadata();
      window.AndroidTornBridge.executeInOverlay(tabId, INJECTED_CSS_SCRIPT);
      window.AndroidTornBridge.executeInOverlay(tabId, STATS_REDIR_SCRIPT);

      // Auto-select target country if active
      if (targetCountry) {
        setTimeout(() => {
          trySelectCountry();
        }, 500);
      }
    }

    return () => {
      window.removeEventListener('tornUrlChange', handleTornUrlChange);
      window.removeEventListener('tornTitleChange', handleTornTitleChange);
    };
  }, [isActive, tabId, tabUrl, onUpdate, targetCountry, trySelectCountry, syncMetadata]);

  // Inject/Sync metadata into the Capacitor overlay whenever it changes and overlay is active
  useEffect(() => {
    if (isActive) {
      syncMetadata();
    }
  }, [isActive, syncMetadata]);

  // Sync visibility and position of the native WebView overlay
  useEffect(() => {
    if (!isCapacitor) return;
    if (!isActive) return;

    const updateOverlay = () => {
      if (!placeholderRef.current) return;
      const rect = placeholderRef.current.getBoundingClientRect();
      const hasSize = rect.width > 0 && rect.height > 0;

      console.log(`[TornView Overlay] updateOverlay tabId=${tabId}: rect.w=${rect.width}, rect.h=${rect.height}, hasSize=${hasSize}, url=${tabUrl}`);

      if (hasSize) {
        const dpr = window.devicePixelRatio || 1;
        const x = Math.round(rect.left * dpr);
        const y = Math.round(rect.top * dpr);
        const width = Math.round(rect.width * dpr);
        const height = Math.round(rect.height * dpr);

        if (window.AndroidTornBridge && window.AndroidTornBridge.showTorn) {
          window.AndroidTornBridge.showTorn(tabId, x, y, width, height, tabUrl);
        }
      } else {
        if (window.AndroidTornBridge && window.AndroidTornBridge.hideTorn) {
          window.AndroidTornBridge.hideTorn(tabId);
        }
      }
    };

    updateOverlay();

    let observer;
    if (placeholderRef.current) {
      observer = new ResizeObserver(() => {
        updateOverlay();
      });
      observer.observe(placeholderRef.current);
    }

    window.addEventListener('resize', updateOverlay);
    window.addEventListener('scroll', updateOverlay, true);

    return () => {
      console.log(`[TornView Overlay] Cleanup visibility tabId=${tabId}`);
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', updateOverlay);
      window.removeEventListener('scroll', updateOverlay, true);
      if (window.AndroidTornBridge && window.AndroidTornBridge.hideTorn) {
        window.AndroidTornBridge.hideTorn(tabId);
      }
    };
  }, [isActive, tabId, tabUrl]);

  const handleGoBack = () => {
    if (isCapacitor) {
      if (window.AndroidTornBridge && window.AndroidTornBridge.goBack) {
        window.AndroidTornBridge.goBack(tabId);
      }
    } else {
      const wv = webviewRef.current;
      if (wv && isElectron && wv.canGoBack()) {
        wv.goBack();
        updateNavigationState();
      }
    }
  };

  const handleGoForward = () => {
    if (isCapacitor) {
      if (window.AndroidTornBridge && window.AndroidTornBridge.goForward) {
        window.AndroidTornBridge.goForward(tabId);
      }
    } else {
      const wv = webviewRef.current;
      if (wv && isElectron && wv.canGoForward()) {
        wv.goForward();
        updateNavigationState();
      }
    }
  };

  const handleReload = () => {
    if (isCapacitor) {
      if (window.AndroidTornBridge && window.AndroidTornBridge.reload) {
        window.AndroidTornBridge.reload(tabId);
      }
    } else {
      const wv = webviewRef.current;
      if (wv) {
        if (isElectron) {
          wv.reload();
        } else {
          try {
            // eslint-disable-next-line no-self-assign
            wv.src = wv.src;
          } catch (e) { }
        }
        updateNavigationState();
      }
    }
  };

  if (!tab) return null;

  if (isNewTab) {
    return (
      <div style={{ display: isActive ? 'flex' : 'none', flexDirection: 'column', position: 'absolute', inset: 0 }}>
        <NewTabPage tabId={tabId} onNavigate={(url) => onUpdate(tabId, { url, title: 'Torn' })} />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      inset: 0,
      width: isActive ? '100%' : '0',
      height: isActive ? '100%' : '0',
      opacity: isActive ? 1 : 0,
      pointerEvents: isActive ? 'auto' : 'none',
      overflow: 'hidden'
    }}>
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
            value={tabUrl}
            readOnly
            onClick={(e) => e.target.select()}
            title="Click to select/copy URL"
          />
        </div>
      )}

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {isElectron ? (
          <webview
            ref={webviewRef}
            src={initialUrlRef.current}
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            title={tabTitle}
            className="torn-iframe"
            style={{ visibility: isActive ? 'visible' : 'hidden' }}
          />
        ) : isCapacitor ? (
          <div
            ref={placeholderRef}
            className="torn-iframe-placeholder"
            style={{
              width: '100%',
              height: '100%',
              background: '#1a1a1a'
            }}
          />
        ) : (
          <div
            style={{
              display: isActive ? 'flex' : 'none',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: 'radial-gradient(circle at center, #1b263b 0%, #0d1b2a 100%)',
              color: '#fff',
              padding: '24px',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(52, 152, 219, 0.4))' }}>🛡️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 12px 0', color: '#e0e6ed' }}>
              Embedded Browsing Blocked
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '320px', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Torn.com restricts embedding inside web browsers for security reasons. Tap below to view this tab in a secure native browser.
            </p>
            <button
              onClick={() => {
                import('@capacitor/browser').then(({ Browser }) => {
                  Browser.open({ url: tabUrl });
                }).catch(err => console.error(err));
              }}
              style={{
                background: 'linear-gradient(135deg, #3498db, #2ecc71)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(52,152,219,0.3)',
                transition: 'transform 0.15s ease'
              }}
            >
              Open in Secure Browser
            </button>
          </div>
        )}
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
 * A compact collapsible section wrapper used in the sidebar.
 */
// CollapsibleSidebarSection supports controlled mode (isOpen + onToggle) so the
// parent can own state that survives data syncs, while still accepting a
// defaultOpen prop for uncontrolled usage.
const CollapsibleSidebarSection = ({ title, count, statusColor, defaultOpen = false, isOpen: controlledIsOpen, onToggle, children }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const toggle = () => {
    if (isControlled) {
      onToggle && onToggle();
    } else {
      setInternalIsOpen(o => !o);
    }
  };

  return (
    <div style={{ marginBottom: '6px' }}>
      <div
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          backgroundColor: '#1b1b1b',
          border: `1px solid ${statusColor}44`,
          borderRadius: isOpen ? '6px 6px 0 0' : '6px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#222'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1b1b1b'}
      >
        <span style={{
          display: 'inline-block',
          transition: 'transform 0.25s',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          fontSize: '0.7rem',
          color: statusColor
        }}>▶</span>
        <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </span>
        <span style={{
          marginLeft: 'auto',
          backgroundColor: `${statusColor}18`,
          border: `1px solid ${statusColor}33`,
          color: statusColor,
          borderRadius: '10px',
          padding: '0px 6px',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          minWidth: '20px',
          textAlign: 'center'
        }}>
          {count}
        </span>
      </div>
      {isOpen && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '4px 0 0 0',
          borderLeft: `2px solid ${statusColor}22`,
          marginLeft: '4px',
          paddingLeft: '4px'
        }}>
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Component for rendering a single member sidebar row with real-time ticking timer.
 */
// MemberSidebarRow supports controlled open mode (isOpen + onToggle) so the
// parent can persist expanded state across data syncs.
const MemberSidebarRow = React.memo(({ member, userData, compareMode, navigateTo, isOpen: controlledIsOpen, onToggle, isPinned, onTogglePin }) => {
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

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const toggleOpen = () => {
    if (isControlled) {
      onToggle && onToggle();
    } else {
      setInternalIsOpen(o => !o);
    }
  };
  const isOkay = currentStatusState === 'Okay';
  const statusColor = isOkay ? '#2ecc71' : currentStatusState === 'Hospital' ? '#e74c3c' : currentStatusState === 'Jail' ? '#f39c12' : '#3498db';
  const profile = member.profile || {};
  const hasProfile = Object.keys(profile).length > 0;

  return (
    <div
      onClick={toggleOpen}
      style={{
        padding: '6px 8px',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: '6px',
        borderLeft: `3px solid ${statusColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        transition: 'all 0.15s ease',
        cursor: 'pointer'
      }}
      className="torn-stat-bar"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
        <div style={{ minWidth: 0 }}>
          <span style={{
            marginRight: '6px',
            fontSize: '0.6rem',
            color: '#666',
            display: 'inline-block',
            transition: 'transform 0.15s ease',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            verticalAlign: 'middle',
            userSelect: 'none'
          }}>
            ▶
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              navigateTo(`https://www.torn.com/profiles.php?XID=${member.id}`);
            }}
            style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'none', verticalAlign: 'middle' }}
            className="text-link"
          >
            {member.name}
          </span>
          <span style={{ color: '#555', fontSize: '0.7rem', marginLeft: '4px', verticalAlign: 'middle' }}>[{member.id}]</span>
          {member.last_action?.status && (
            <span
              title={member.last_action.status}
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: member.last_action.status === 'Online' ? '#2ecc71' :
                  member.last_action.status === 'Idle' ? '#f39c12' : '#e74c3c',
                marginLeft: '6px',
                verticalAlign: 'middle',
                boxShadow: member.last_action.status === 'Online' ? '0 0 4px #2ecc71' :
                  member.last_action.status === 'Idle' ? '0 0 4px #f39c12' : 'none'
              }}
            />
          )}
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onTogglePin) onTogglePin(member.id);
            }}
            className={`member-card-pin-btn ${isPinned ? 'is-pinned' : ''}`}
            style={{
              padding: '2px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              marginLeft: '4px',
              verticalAlign: 'middle',
            }}
            title={isPinned ? "Unpin Target" : "Pin Target"}
          >
            <IconPin size={11} color={isPinned ? '#f1c40f' : '#555'} fill={isPinned ? '#f1c40f' : 'none'} />
          </span>

          <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3px' }}>
            Lvl {member.level}
            {member.suspectedRaw && (
              <>
                {' • '}
                <span style={{ color: '#e74c3c', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <IconBarChart size={10} color="#e74c3c" /> {member.suspectedRaw}
                </span>
              </>
            )}
            {' • '}
            <IconClock size={10} color="#888" /> {member.last_action?.relative || 'Unknown'}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '0.72rem' }}>
            {currentStatusState || 'Unknown'}
          </span>
          {isOkay ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateTo(`https://www.torn.com/page.php?sid=attack&user2ID=${member.id}`);
              }}
              style={{
                backgroundColor: 'rgba(231, 76, 60, 0.15)',
                border: '1px solid rgba(231, 76, 60, 0.4)',
                borderRadius: '3px',
                color: '#e74c3c',
                padding: '1px 5px',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                lineHeight: '1.2',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(231, 76, 60, 0.7)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(231, 76, 60, 0.4)';
              }}
            >
              ⚔️ Attack
            </button>
          ) : (
            currentDescription && currentDescription !== currentStatusState && (
              <span style={{ color: '#666', fontSize: '0.65rem' }}>
                {currentDescription.replace(/<[^>]+>/g, '').replace(/Hospitalized for /i, '')}
              </span>
            )
          )}
        </div>
      </div>

      {isOpen && (
        <>
          {/* Profile indicators */}
          {hasProfile && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px', marginTop: '2px', fontSize: '0.7rem' }}>
              <div>
                <span style={{ color: '#888' }}>
                  {profile.age ? `${profile.age.toLocaleString()}d` : ''}
                  {member.winRate ? ` • ${Math.round(member.winRate)}% WR` : ''}
                </span>
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
              onClick={(e) => {
                e.stopPropagation();
                navigateTo(`https://www.torn.com/profiles.php?XID=${member.id}`);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                navigateTo(`https://www.torn.com/page.php?sid=attack&user2ID=${member.id}`);
              }}
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
        </>
      )}
    </div>
  );
});

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
const TornView = ({ userData, factionData, loadFactionData, apiKey, requestedUrl, setRequestedUrl, targetCountry, setTargetCountry, itemsData, cargoCapacity, showNavControls, isActive, baldrHighestStat, setBaldrHighestStat }) => {
  const defaultTab = { id: 'home', url: 'https://www.torn.com/index.php', title: 'Torn' };
  const [tabs, setTabs] = useLocalStorage('torn_browser_tabs', [defaultTab]);
  const [activeTabId, setActiveTabId] = useLocalStorage('torn_browser_active_tab', 'home');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState(null);

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
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useLocalStorage('torn_sidebar_header_collapsed', false);
  const [isWarOverviewCollapsed, setIsWarOverviewCollapsed] = useLocalStorage('torn_sidebar_war_overview_collapsed', false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useLocalStorage('torn_sidebar_controls_collapsed', false);
  const [isLiveStatsCollapsed, setIsLiveStatsCollapsed] = useLocalStorage('torn_sidebar_live_stats_collapsed', false);
  const [isFinancesCollapsed, setIsFinancesCollapsed] = useLocalStorage('torn_sidebar_finances_collapsed', false);
  const [isQuickActionsCollapsed, setIsQuickActionsCollapsed] = useLocalStorage('torn_sidebar_quick_actions_collapsed', false);

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

  // Ticking chain timeout for flashing the sidebar red
  const chain = factionData?.chain || {};
  const chainCurrent = chain.current || 0;
  const chainTimeout = chain.timeout || 0;
  const [sidebarChainTimeout, setSidebarChainTimeout] = useState(chainTimeout);

  useEffect(() => {
    setSidebarChainTimeout(chainTimeout);
  }, [chainTimeout]);

  useEffect(() => {
    if (sidebarChainTimeout <= 0) return;
    const timer = setInterval(() => {
      setSidebarChainTimeout(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [sidebarChainTimeout]);

  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem('tornagator_faction_status_filter') || 'all';
  });

  useEffect(() => {
    try {
      localStorage.setItem('tornagator_faction_status_filter', statusFilter);
    } catch (e) { }
  }, [statusFilter]);

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
    } catch (e) { }
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

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('tornagator_pinned_targets');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('[TORNagator] Failed to parse pinned targets from localStorage', e);
      return {};
    }
  });

  const handleTogglePin = useCallback((memberId) => {
    setPinnedIds(prev => {
      const updated = { ...prev, [memberId]: !prev[memberId] };
      if (!updated[memberId]) {
        delete updated[memberId];
      }
      try {
        localStorage.setItem('tornagator_pinned_targets', JSON.stringify(updated));
      } catch (e) {
        console.error('[TORNagator] Failed to save pinned targets to localStorage', e);
      }
      return updated;
    });
  }, []);

  // Sync pinned targets when switching to the TORN tab or storage changes
  useEffect(() => {
    if (isActive) {
      try {
        const stored = localStorage.getItem('tornagator_pinned_targets');
        setPinnedIds(stored ? JSON.parse(stored) : {});
      } catch (e) {}
    }
  }, [isActive]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tornagator_pinned_targets') {
        try {
          setPinnedIds(e.newValue ? JSON.parse(e.newValue) : {});
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Stable maps (useRef) that track open/closed state for sidebar sections and
  // individual member rows across data syncs.  We use refs (not state) so that
  // updating them never triggers a re-render — the open state is read directly
  // during render via the controlled-component props on each child.
  const sectionOpenState = useRef({});
  const memberOpenState = useRef({});

  // Force a re-render after toggling so the controlled children update.
  const [, forceRerender] = useState(0);
  const bumpRender = useCallback(() => forceRerender(n => n + 1), []);

  // Handle android back button inside TORN tab
  useEffect(() => {
    if (!isActive) return;

    const handleAndroidBack = (e) => {
      console.log('[TornView] androidBack event captured');
      if (isImportOpen) {
        setIsImportOpen(false);
        e.preventDefault();
        return;
      }
      if (isAddingNew) {
        setIsAddingNew(false);
        e.preventDefault();
        return;
      }
      if (isEditingQuick) {
        setIsEditingQuick(false);
        e.preventDefault();
        return;
      }

      // Find the active tab
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab && activeTab.canGoBack) {
        if (isCapacitor) {
          if (window.AndroidTornBridge && window.AndroidTornBridge.goBack) {
            console.log('[TornView] Navigating back inside active webview overlay:', activeTab.id);
            window.AndroidTornBridge.goBack(activeTab.id);
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('androidBack', handleAndroidBack);
    return () => {
      document.removeEventListener('androidBack', handleAndroidBack);
    };
  }, [isActive, isImportOpen, isAddingNew, isEditingQuick, activeTabId, tabs]);


  // Memoize the mapping, filtering, and sorting of enemy faction members
  const sortedAndFilteredGroups = useMemo(() => {
    if (!enemyFactionData || !enemyFactionData.members) return null;

    const buildMember = ([id, member]) => {
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
    };

    const applySortOrder = (arr) => arr.sort((a, b) => {
      if (sortBy === 'default') {
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

    const allMembers = Object.entries(enemyFactionData.members).map(buildMember);
    const filteredMembers = allMembers.filter(m => {
      const status = m.last_action?.status;
      if (statusFilter === 'online') {
        return status === 'Online' || status === 'Idle';
      }
      if (statusFilter === 'offline') {
        return status === 'Offline' || !status;
      }
      return true;
    });

    // Separate pinned and unpinned members
    const pinnedMembers = filteredMembers.filter(m => pinnedIds[m.id]);
    const unpinnedMembers = filteredMembers.filter(m => !pinnedIds[m.id]);

    const groups = {};
    if (pinnedMembers.length > 0) {
      groups.pinned = { label: '📌 Pinned Targets', color: '#f1c40f', members: pinnedMembers };
    }
    groups.okay = { label: '⚔️ Okay & Hospitalized', color: '#2ecc71', members: [] };
    groups.jail = { label: '🔒 In Jail', color: '#f39c12', members: [] };
    groups.other = { label: '✈️ Other', color: '#3498db', members: [] };

    unpinnedMembers.forEach(m => {
      const state = m.status?.state || '';
      if (state === 'Okay' || state === 'Hospital') groups.okay.members.push(m);
      else if (state === 'Jail') groups.jail.members.push(m);
      else groups.other.members.push(m);
    });

    Object.values(groups).forEach(g => applySortOrder(g.members));

    return groups;
  }, [enemyFactionData, memberProfiles, importedStats, sortBy, sortOrder, statusFilter, pinnedIds]);

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
    if (isActive && !sidebarCollapsed && sidebarTab === 'war' && !enemyFactionData && !isLoadingTargets && !isSyncingTargets && enemyFactionId && apiKey) {
      doFetchTargets(false);
    }
  }, [isActive, sidebarCollapsed, sidebarTab, enemyFactionData, isLoadingTargets, isSyncingTargets, enemyFactionId, apiKey, doFetchTargets]);

  // Auto-sync timer effect
  useEffect(() => {
    if (!isActive || syncInterval <= 0 || !enemyFactionId || !apiKey || sidebarTab !== 'war' || sidebarCollapsed) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !isLoadingTargets && !isSyncingTargets) {
        if (loadFactionData) loadFactionData();
        doFetchTargets(true);
      }
    }, syncInterval * 1000);

    return () => clearInterval(intervalId);
  }, [isActive, syncInterval, enemyFactionId, apiKey, sidebarTab, sidebarCollapsed, isLoadingTargets, isSyncingTargets, doFetchTargets, loadFactionData]);

  // Trigger target status refresh immediately when sidebar war tab becomes active and visible
  useEffect(() => {
    if (isActive && !sidebarCollapsed && sidebarTab === 'war' && enemyFactionData && !isLoadingTargets && !isSyncingTargets && enemyFactionId && apiKey) {
      doFetchTargets(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, sidebarCollapsed, sidebarTab]);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const isGymPage = activeTab?.url?.includes('gym.php');
  const energyValue = userData?.energy?.current || 0;
  const maxEnergyValue = userData?.energy?.maximum || 100;
  const isStacking = energyValue > maxEnergyValue;
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

    const safeUrl = sanitizeUrl(newUrl);
    if (safeUrl === 'https://www.torn.com/index.php' && newUrl !== safeUrl && newUrl !== 'https://www.torn.com/index.php') {
      alert('Invalid URL scheme for security reasons.');
      return;
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
      const safeReqUrl = sanitizeUrl(requestedUrl);
      const existingTab = tabs.find(t => areUrlsEqual(t.url, safeReqUrl));
      if (existingTab) {
        setActiveTabId(existingTab.id);
      } else {
        const newTabId = `tab-${Date.now()}`;
        setTabs(prev => [...prev, { id: newTabId, url: safeReqUrl, title: 'Torn' }]);
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

  const handleNewTab = (initialUrl) => {
    // Guard: when called from onClick, initialUrl is a SyntheticEvent — ignore it
    const url = (typeof initialUrl === 'string') ? initialUrl : 'newtab';
    const id = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id, url, title: 'New Tab' }]);
    setActiveTabId(id);
  };

  const handleDragStart = (e, index, tabId) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e, index) => {
    if (draggedTabId === null) return;
    setTabs(prev => {
      const cleanPrev = (prev || []).filter(t => t && t.id);
      const dragIdx = cleanPrev.findIndex(t => t.id === draggedTabId);
      if (dragIdx === -1 || dragIdx === index) return cleanPrev;

      const newTabs = [...cleanPrev];
      const [draggedTab] = newTabs.splice(dragIdx, 1);
      if (!draggedTab) return cleanPrev;
      newTabs.splice(index, 0, draggedTab);
      return newTabs;
    });
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
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
    const safeHref = sanitizeUrl(href);
    if (safeHref === 'https://www.torn.com/index.php' && href !== safeHref && href !== 'https://www.torn.com/index.php') return;



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

  const isChainDanger = (chainCurrent > 0 || sidebarChainTimeout > 0) && sidebarChainTimeout > 0 && sidebarChainTimeout < 60;
  const shouldFlashDanger = isChainDanger && sidebarTab === 'war';

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
          {/* Tab Bar UI */}
          <div className="torn-tab-bar" style={{ display: 'flex', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333', padding: '0 8px', overflowX: 'auto' }}>
            {tabs.filter(t => t && t.id).map((tab, index) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                onContextMenu={(e) => handleTabContextMenu(e, tab)}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index, tab.id)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  backgroundColor: activeTabId === tab.id ? '#2c2c2c' : 'transparent',
                  borderTopLeftRadius: '6px',
                  borderTopRightRadius: '6px',
                  cursor: draggedTabId === tab.id ? 'grabbing' : 'grab',
                  minWidth: '120px',
                  maxWidth: '200px',
                  borderRight: '1px solid #333',
                  borderTop: activeTabId === tab.id ? '2px solid #e74c3c' : '2px solid transparent',
                  opacity: draggedTabId === tab.id ? 0.4 : 1,
                  userSelect: 'none',
                  transition: 'opacity 0.15s ease'
                }}
              >
                <span style={{
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '0.75rem',
                  color: activeTabId === tab.id ? '#fff' : '#aaa',
                  pointerEvents: draggedTabId !== null ? 'none' : 'auto'
                }}>
                  {tab.title || 'Torn'}
                </span>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    fontSize: '1rem',
                    lineHeight: '1',
                    pointerEvents: draggedTabId !== null ? 'none' : 'auto'
                  }}
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
            {showStackingWarning && !isCapacitor && (
              <div className="stacking-warning-banner">
                <IconWarning size={20} color="#fff" />
                <div>
                  <span className="stacking-warning-title">Stacking Warning</span>
                  <span className="stacking-warning-desc">
                    Your energy is {energyValue}/{maxEnergyValue}. You might be stacking and may not want to train in the gym.
                  </span>
                </div>
                <button
                  className="stacking-warning-close"
                  onClick={() => setDismissedWarnings(prev => ({ ...prev, [activeTabId]: true }))}
                  title="Dismiss warning"
                  aria-label="Dismiss stacking warning"
                >
                  ×
                </button>
              </div>
            )}

            {tabs.filter(t => t && t.id).sort((a, b) => a.id.localeCompare(b.id)).map(tab => (
              <WebviewTab
                key={tab.id}
                tab={tab}
                isActive={isActive && activeTabId === tab.id}
                onUpdate={handleTabUpdate}
                targetCountry={targetCountry}
                setTargetCountry={setTargetCountry}
                itemsData={itemsData}
                cargoCapacity={cargoCapacity}
                apiKey={apiKey}
                showNavControls={showNavControls}
                userData={userData}
                factionData={factionData}
                baldrHighestStat={baldrHighestStat}
                setBaldrHighestStat={setBaldrHighestStat}
              />
            ))}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        {!isCapacitor && (
          <aside
            className={`torn-sidebar${sidebarCollapsed ? ' collapsed' : ''} ${shouldFlashDanger ? 'sidebar-danger-flash' : ''}`}
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
                <div
                  onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                  className="torn-sidebar-header"
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: isHeaderCollapsed ? '8px' : '12px',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    {!isHeaderCollapsed ? (
                      <>
                        <div className="torn-sidebar-avatar">
                          {userData?.name?.[0] ?? '?'}
                        </div>
                        <div className="torn-sidebar-player" style={{ minWidth: 0 }}>
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
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span
                          className="torn-sidebar-status-dot"
                          style={{ backgroundColor: statusColor, width: '8px', height: '8px', margin: 0 }}
                          title={userData?.status?.description}
                        />
                        <span style={{ fontWeight: 'bold', fontSize: '0.82rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {userData?.name ?? 'Unknown'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#666', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '8px' }}>
                          Lv {userData?.level}
                        </span>
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.65rem',
                    color: '#666',
                    transform: isHeaderCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.2s',
                    paddingLeft: '6px'
                  }}>
                    ▶
                  </span>
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
                      <div
                        onClick={() => setIsLiveStatsCollapsed(!isLiveStatsCollapsed)}
                        className="torn-sidebar-section-title"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.55rem',
                            color: '#555',
                            transform: isLiveStatsCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                            transition: 'transform 0.2s',
                            display: 'inline-block'
                          }}>
                            ▶
                          </span>
                          <span>Live Stats</span>
                        </div>
                        {isLiveStatsCollapsed && userData && (
                          <span style={{ fontSize: '0.62rem', color: '#666', fontWeight: 'normal' }}>
                            ⚡{userData.energy?.current} • 🎯{userData.nerve?.current} • ❤️{userData.life?.current}
                          </span>
                        )}
                      </div>
                      {!isLiveStatsCollapsed && (
                        <>
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
                        </>
                      )}
                    </div>

                    {/* Money */}
                    {moneyFormatted && (
                      <div className="torn-sidebar-section">
                        <div
                          onClick={() => setIsFinancesCollapsed(!isFinancesCollapsed)}
                          className="torn-sidebar-section-title"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.55rem',
                              color: '#555',
                              transform: isFinancesCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                              transition: 'transform 0.2s',
                              display: 'inline-block'
                            }}>
                              ▶
                            </span>
                            <span>Finances</span>
                          </div>
                          {isFinancesCollapsed && (
                            <span style={{ fontSize: '0.65rem', color: '#2ecc71', fontWeight: 'bold' }}>
                              {moneyFormatted}
                            </span>
                          )}
                        </div>
                        {!isFinancesCollapsed && (
                          <div
                            className="torn-money-card"
                            onClick={() => navigateTo('https://www.torn.com/bank.php')}
                            title="Open Bank"
                          >
                            <span className="torn-money-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><IconCoin size={13} color="#f1c40f" /> Cash on Hand</span>
                            <span className="torn-money-value">{moneyFormatted}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick actions */}
                    <div className="torn-sidebar-section">
                      <div
                        onClick={() => setIsQuickActionsCollapsed(!isQuickActionsCollapsed)}
                        className="torn-sidebar-section-title"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: isQuickActionsCollapsed ? '0' : '8px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.55rem',
                            color: '#555',
                            transform: isQuickActionsCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                            transition: 'transform 0.2s',
                            display: 'inline-block'
                          }}>
                            ▶
                          </span>
                          <span>Quick Actions</span>
                        </div>
                        {!isQuickActionsCollapsed && (
                          <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
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
                        )}
                      </div>

                      {!isQuickActionsCollapsed && (
                        <>
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
                                    title={`Remove ${action.label}`}
                                    aria-label={`Remove quick action ${action.label}`}
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
                                    aria-label={`Rename quick action ${action.label}`}
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
                                      title={`Move ${action.label} left`}
                                      aria-label={`Move ${action.label} left`}
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
                                      title={`Move ${action.label} right`}
                                      aria-label={`Move ${action.label} right`}
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
                        </>
                      )}
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
                        {/* War Status Header / Collapsible Overview Toggle */}
                        <div
                          onClick={() => setIsWarOverviewCollapsed(!isWarOverviewCollapsed)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            paddingBottom: '6px',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.6rem',
                              color: '#666',
                              transform: isWarOverviewCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                              transition: 'transform 0.2s',
                              display: 'inline-block'
                            }}>
                              ▶
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              WAR OVERVIEW
                            </span>
                          </div>
                          {isWarOverviewCollapsed && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#e74c3c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }} title={`vs ${suspectedStatsFaction || enemyFactionInfo?.name || 'Enemy'}`}>
                                vs {suspectedStatsFaction || enemyFactionInfo?.name || 'Enemy'}
                              </div>
                              <CompactChainInfo chain={factionData?.chain} />
                            </div>
                          )}
                          {!isWarOverviewCollapsed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleForceRefresh();
                              }}
                              disabled={isLoadingTargets || isSyncingTargets}
                              style={{
                                background: 'transparent',
                                border: '1px solid #444',
                                borderRadius: '20px',
                                padding: '2px 8px',
                                cursor: (isLoadingTargets || isSyncingTargets) ? 'not-allowed' : 'pointer',
                                color: (isLoadingTargets || isSyncingTargets) ? '#666' : '#3498db',
                                fontWeight: 'bold',
                                fontSize: '0.62rem',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <IconRefresh
                                size={8}
                                color={(isLoadingTargets || isSyncingTargets) ? '#666' : '#3498db'}
                                className={isSyncingTargets ? 'spin-animation' : ''}
                              />
                            </button>
                          )}
                        </div>

                        {!isWarOverviewCollapsed && (
                          <>
                            {/* War Details */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  vs {suspectedStatsFaction || enemyFactionInfo?.name || 'Enemy Faction'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <IconTarget size={10} color="#888" /> Target: {currentWar?.war?.target || 'N/A'} pts
                                </div>
                              </div>
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
                          </>
                        )}

                        {/* Sorting & Import Panel Header */}
                        <div
                          onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            paddingBottom: '4px',
                            marginTop: '4px',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.6rem',
                              color: '#666',
                              transform: isControlsCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                              transition: 'transform 0.2s',
                              display: 'inline-block'
                            }}>
                              ▶
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              CONTROLS & SETTINGS
                            </span>
                          </div>
                          {isControlsCollapsed && (
                            <span style={{ fontSize: '0.65rem', color: '#666' }}>
                              Sort: {sortBy} {statusFilter !== 'all' && `• ${statusFilter === 'online' ? 'Online' : 'Offline'}`} • Auto Sync: {syncInterval > 0 ? `${syncInterval}s` : 'Off'}
                            </span>
                          )}
                        </div>

                        {!isControlsCollapsed && (
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

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'bold' }}>SHOW:</span>
                              <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
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
                                <option value="all">All Members</option>
                                <option value="online">Online / Idle</option>
                                <option value="offline">Offline Only</option>
                              </select>
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
                        )}

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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', paddingRight: '4px', minHeight: 0 }}>
                            {(() => {
                              if (!sortedAndFilteredGroups) return null;

                              // Seed default section-open state on first render
                              Object.entries(sortedAndFilteredGroups).forEach(([key]) => {
                                if (sectionOpenState.current[key] === undefined) {
                                  sectionOpenState.current[key] = key === 'okay' || key === 'pinned';
                                }
                              });

                              const renderRows = (members) => members.map((member) => (
                                <MemberSidebarRow
                                  key={member.id}
                                  member={member}
                                  userData={userData}
                                  compareMode={compareMode}
                                  navigateTo={navigateTo}
                                  isOpen={memberOpenState.current[member.id] === true}
                                  onToggle={() => {
                                    memberOpenState.current[member.id] = !memberOpenState.current[member.id];
                                    bumpRender();
                                  }}
                                  isPinned={!!pinnedIds[member.id]}
                                  onTogglePin={handleTogglePin}
                                />
                              ));

                              return Object.entries(sortedAndFilteredGroups)
                                .filter(([, g]) => g.members.length > 0)
                                .map(([key, g]) => (
                                  <CollapsibleSidebarSection
                                    key={key}
                                    title={g.label}
                                    count={g.members.length}
                                    statusColor={g.color}
                                    isOpen={sectionOpenState.current[key] === true}
                                    onToggle={() => {
                                      sectionOpenState.current[key] = !sectionOpenState.current[key];
                                      bumpRender();
                                    }}
                                  >
                                    {renderRows(g.members)}
                                  </CollapsibleSidebarSection>
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
        )}
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
