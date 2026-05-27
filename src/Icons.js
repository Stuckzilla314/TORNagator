/**
 * Icons.js — Centralized inline SVG icon components for TORNagator.
 * All icons accept: size (number, default 16), color (string, default 'currentColor'), style (object), className (string).
 */


// ── App / Navigation ──────────────────────────────────────────────────────────

export const IconCrocodile = ({ size = 20, color = 'currentColor', style, className } = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill={color}
    style={style}
    className={className}
    aria-hidden="true"
  >
    {/* Stylized crocodile/navigator head silhouette */}
    <path d="M2 18 C2 14 6 12 10 12 L22 12 C26 12 30 13 30 16 C30 18 28 19 26 19 L24 19 L24 21 L20 21 L20 19 L10 19 C8 19 6 20 5 22 L3 22 C2 22 1 21 2 18Z" />
    <circle cx="10" cy="15" r="1.5" fill="currentColor" stroke="none"/>
    <path d="M24 19 L28 22 M26 19 L29 21" strokeWidth="1.5"/>
  </svg>
);

export const IconGamepad = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <line x1="6" y1="12" x2="10" y2="12"/>
    <line x1="8" y1="10" x2="8" y2="14"/>
    <line x1="15" y1="13" x2="15" y2="13" strokeWidth="3" strokeLinecap="round"/>
    <line x1="18" y1="11" x2="18" y2="11" strokeWidth="3" strokeLinecap="round"/>
    <rect x="2" y="8" width="20" height="10" rx="4"/>
  </svg>
);

// ── Status / Travel ───────────────────────────────────────────────────────────

export const IconPlane = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4s-2 1-3.5 2.5L8 10 1 8.2l-.5.5 4 4 4-1 1 4 4 1 .5-.5z"/>
  </svg>
);

export const IconHospital = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M12 8v8M8 12h8"/>
  </svg>
);

export const IconScales = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M12 3v18M3 6l9-3 9 3M6 18a3 3 0 0 1-6 0l3-9 3 9ZM18 18a3 3 0 0 0 6 0l-3-9-3 9Z"/>
  </svg>
);

export const IconClock = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ── Stat Bars ─────────────────────────────────────────────────────────────────

export const IconBolt = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill={color} stroke="none"
    style={style} className={className} aria-hidden="true">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

export const IconDot = ({ size = 10, color = '#e74c3c', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 10 10"
    style={style} className={className} aria-hidden="true">
    <circle cx="5" cy="5" r="5" fill={color}/>
  </svg>
);

export const IconSmile = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);

export const IconHeart = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill={color} stroke="none"
    style={style} className={className} aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

// ── Money / Finance ───────────────────────────────────────────────────────────

export const IconCoin = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9"/>
    <path d="M14.5 9a3 3 0 0 0-5 2.2c0 1.7 2 3 3.5 4 1.5-1 3.5-2.3 3.5-4A3 3 0 0 0 14.5 9z" fill={color} stroke="none"/>
  </svg>
);

// ── Warning ───────────────────────────────────────────────────────────────────

export const IconWarning = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Quick Actions ─────────────────────────────────────────────────────────────

export const IconSwords = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
    <line x1="13" y1="19" x2="19" y2="13"/>
    <line x1="16" y1="16" x2="20" y2="20"/>
    <line x1="19" y1="21" x2="21" y2="19"/>
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/>
    <line x1="5" y1="14" x2="9" y2="18"/>
    <line x1="7" y1="17" x2="3" y2="21"/>
  </svg>
);

export const IconChartUp = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

export const IconTarget = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

export const IconStore = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M3 9l1-6h16l1 6"/>
    <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>
    <path d="M5 9v11h14V9"/>
  </svg>
);

// ── Presets ───────────────────────────────────────────────────────────────────

export const IconHome = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const IconDumbbell = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M6.5 6.5a2 2 0 0 1 2.83 0l8.54 8.54a2 2 0 0 1-2.83 2.83L6.5 9.33a2 2 0 0 1 0-2.83z"/>
    <path d="M2 20l4-4M20 4l-4 4M14 10l-4-4M10 14l4 4"/>
  </svg>
);

export const IconBuilding = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18"/>
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
  </svg>
);

export const IconBank = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polyline points="3 9 12 3 21 9"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="21" x2="21" y2="21"/>
    <line x1="6" y1="9" x2="6" y2="21"/>
    <line x1="10" y1="9" x2="10" y2="21"/>
    <line x1="14" y1="9" x2="14" y2="21"/>
    <line x1="18" y1="9" x2="18" y2="21"/>
  </svg>
);

export const IconFolder = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

// ── Faction War ───────────────────────────────────────────────────────────────

export const IconSword = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
    <line x1="13" y1="19" x2="19" y2="13"/>
    <line x1="16" y1="16" x2="20" y2="20"/>
    <line x1="19" y1="21" x2="21" y2="19"/>
  </svg>
);

export const IconPeace = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="2" x2="12" y2="22"/>
    <line x1="4.93" y1="7" x2="12" y2="12"/>
    <line x1="19.07" y1="7" x2="12" y2="12"/>
  </svg>
);

export const IconChevronRight = ({ size = 14, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const IconBarChart = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

export const IconPill = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="m10.5 20.5-7-7a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z"/>
    <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
  </svg>
);

export const IconRefresh = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

export const IconMuscle = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M14.5 12.5c0-1.5-1-3-3-3s-4 1.5-4 4 2 4 4 4 4-2 4-4"/>
    <path d="M14.5 12.5C17 10 19 8 18 5s-4-3-5-1"/>
    <path d="M9.5 12.5C7 10 5 8 6 5s4-3 5-1"/>
  </svg>
);

// ── Quick Action href→icon lookup map ─────────────────────────────────────────

export const QUICK_ACTION_ICONS = {
  'gym.php':           IconDumbbell,
  'crimes.php':        IconBolt,
  'loader.php':        IconSwords,       // attack
  'imarket.php':       IconChartUp,
  'travelagency.php':  IconPlane,
  'events.php':        IconTarget,
  'bazaar.php':        IconStore,
  'index.php':         IconHome,
  'hospital.php':      IconHospital,
  'city.php':          IconBuilding,
  'bank.php':          IconBank,
  'factions.php':      IconFolder,
};

/**
 * Returns the SVG icon component for a quick action based on its href.
 * Falls back to a generic target icon.
 */
export const getQuickActionIcon = (href = '') => {
  for (const [key, Icon] of Object.entries(QUICK_ACTION_ICONS)) {
    if (href.includes(key)) return Icon;
  }
  return IconTarget;
};
