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

export const IconLink = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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

export const IconPin = ({ size = 16, color = 'currentColor', fill = 'none', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <line x1="12" y1="17" x2="12" y2="22"/>
    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.48A2 2 0 0 1 15 9.28V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.28c0 .4-.12.79-.34 1.11L5.88 14a2 2 0 0 0-.44 1.24V17z"/>
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

export const IconChevronLeft = ({ size = 14, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polyline points="15 18 9 12 15 6"/>
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

export const IconGraduationCap = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
  </svg>
);

export const IconGavel = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="m14 13-8.3 8.3c-.8.8-2 .8-2.8 0a2 2 0 0 1 0-2.8L11.2 10m3.3-3.3 4.2 4.2M16 2l6 6M10.8 7.2l6 6"/>
  </svg>
);

export const IconChurch = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M12 22V10l-8 4v8h16v-8l-8-4z"/>
    <path d="M12 10V4"/>
    <path d="M10 6h4M12 4v4"/>
    <path d="M10 22v-4a2 2 0 0 1 4 0v4"/>
  </svg>
);

export const IconCasino = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <rect x="2" y="6" width="10" height="10" rx="2"/>
    <circle cx="5" cy="9" r="1" fill="currentColor"/>
    <circle cx="9" cy="13" r="1" fill="currentColor"/>
    <rect x="12" y="8" width="10" height="10" rx="2"/>
    <circle cx="15" cy="11" r="1" fill="currentColor"/>
    <circle cx="17" cy="13" r="1" fill="currentColor"/>
    <circle cx="19" cy="15" r="1" fill="currentColor"/>
  </svg>
);

export const IconDump = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M3 6h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>
    <path d="M3 6l4-3h10l4 3"/>
    <line x1="8" y1="10" x2="8" y2="15"/>
    <line x1="12" y1="10" x2="12" y2="15"/>
    <line x1="16" y1="10" x2="16" y2="15"/>
  </svg>
);

export const IconLoanShark = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M2 20c3-1.5 5-1.5 8 0s5 1.5 8 0 5-1.5 8 0"/>
    <path d="M7 19c2-5 6-9 10-9-1.5 3-1.5 6-3 9H7z"/>
    <path d="M18 5h-4a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-4"/>
    <path d="M16 3v12"/>
  </svg>
);

export const IconRaceway = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M4 22V2m0 3c5-1.5 8 1.5 16 0v8c-8 1.5-11-1.5-16 0"/>
    <path d="M8 4v8M12 3v8M16 4v8"/>
  </svg>
);

export const IconEstateAgents = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <path d="M9 22V12h6v10"/>
    <path d="M12 5v2"/>
  </svg>
);

export const IconPrivateIsland = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M2 20c5-2 15-2 20 0"/>
    <path d="M8 20c1-4 3-7 6-9"/>
    <path d="M14 11c-2-3-5-3-5-3s3 3 5 3zm0 0c0-4 3-5 3-5s-1 4-3 5zm0 0c3-2 6-1 6-1s-4 2-6 1z"/>
  </svg>
);

export const IconPointsBuilding = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M9 14V8h3.5a2 2 0 0 1 0 4H9"/>
  </svg>
);

export const IconPointsMarket = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M10 14V8h2.5a2 2 0 0 1 0 4H10"/>
  </svg>
);

export const IconItemMarket = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M12 3v18M3 6h18M6 6v6a6 6 0 0 0 12 0V6"/>
    <path d="M3 10a3 3 0 0 0 6 0M15 10a3 3 0 0 0 6 0"/>
  </svg>
);

export const IconCityHall = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M4 22h16M6 14v8M18 22v-8M12 6V3M9 6h6M12 6a4 4 0 0 0-4 4v4h8v-4a4 4 0 0 0-4-4zM2 22h20"/>
  </svg>
);

export const IconPawnShop = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="7" r="3"/>
    <circle cx="7" cy="15" r="3"/>
    <circle cx="17" cy="15" r="3"/>
    <line x1="12" y1="10" x2="9" y2="13"/>
    <line x1="12" y1="10" x2="15" y2="13"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

export const IconRecycling = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M7 11H2V6M21 13h-5v5M14 3h5v5"/>
    <path d="M3.5 18.5a9 9 0 0 0 15.3-3.5M20.5 5.5a9 9 0 0 0-15.3 3.5M12 21a9 9 0 0 1-8.5-6"/>
  </svg>
);

export const IconGun = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M19 11H8l-1.5-3h11a1.5 1.5 0 0 1 1.5 1.5V11z"/>
    <path d="M9 11v6a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1v-7"/>
    <path d="M9 13h3v2H9z"/>
  </svg>
);

export const IconCyberForce = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="5" x2="12" y2="9"/>
    <line x1="12" y1="15" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="9" y2="12"/>
    <line x1="15" y1="12" x2="19" y2="12"/>
  </svg>
);

export const IconClothing = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M20.38 3.46L16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2L3.62 3.46a1 1 0 0 0-1.34.45L.38 7.54a1 1 0 0 0 .45 1.34L4 10.5V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10.5l3.17-1.62a1 1 0 0 0 .45-1.34l-1.9-3.63a1 1 0 0 0-1.34-.45z"/>
  </svg>
);

export const IconStaff = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polygon points="12 2 15 8 22 9 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9 9 8 12 2"/>
    <circle cx="12" cy="11" r="2"/>
  </svg>
);

export const IconNewspaper = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
    <path d="M18 14h-8M18 18h-8M16 6H10v4h6V6Z"/>
  </svg>
);

export const IconJail = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M7 3v18M11 3v18M15 3v18M19 3v18M3 12h18"/>
  </svg>
);

export const IconMuseum = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="m2 9 10-6 10 6M4 21V9M20 21V9M8 21V12M12 21V12M16 21V12M1 21h22"/>
  </svg>
);

export const IconUsers = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export const IconStar = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export const IconMessageSquare = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export const IconCrosshair = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="22" y1="12" x2="18" y2="12"/>
    <line x1="6" y1="12" x2="2" y2="12"/>
    <line x1="12" y1="6" x2="12" y2="2"/>
    <line x1="12" y1="22" x2="12" y2="18"/>
  </svg>
);

export const IconBox = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

export const IconCpu = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <path d="M9 9h6v6H9zm0-5V2m6 2V2m-9 18v2m6-2v2M4 9H2m2 6H2m18-6h2m-2 6h2"/>
  </svg>
);

export const IconAnchor = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="5" r="3"/>
    <line x1="12" y1="8" x2="12" y2="22"/>
    <path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
    <circle cx="5" cy="12" r="1"/>
    <circle cx="19" cy="12" r="1"/>
  </svg>
);

export const IconGem = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M6 3h12l4 6-10 12L2 9z"/>
    <path d="M11 3 8 9l4 12 4-12-3-6"/>
    <path d="M2 9h20"/>
  </svg>
);

export const IconTag = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M20.59 13.41 12 4.83a2 2 0 0 0-1.41-.59H4v6.59a2 2 0 0 0 .59 1.41l8.59 8.59a2 2 0 0 0 2.83 0l6.59-6.59a2 2 0 0 0 0-2.83z"/>
    <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export const IconMail = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

export const IconPrinter = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

export const IconTrash = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

export const IconShoppingBag = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

export const IconInfo = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

export const IconCandy = ({ size = 16, color = 'currentColor', style, className } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
    <path d="m15.5 8.5 4.5-4.5h3v3l-4.5 4.5M8.5 15.5l-4.5 4.5H1v-3l4.5-4.5"/>
  </svg>
);

// ── Quick Action href→icon lookup map ─────────────────────────────────────────

export const QUICK_ACTION_ICONS = {
  'gym.php':           IconDumbbell,
  'crimes.php':        IconBolt,
  'loader.php':        IconSwords,       // attack
  'sid=attack':        IconSwords,       // attack
  'imarket.php':       IconItemMarket,   // Item Market
  'travelagency.php':  IconPlane,
  'events.php':        IconTarget,
  'bazaar.php':        IconStore,
  'index.php':         IconHome,
  'hospital.php':      IconHospital,
  'city.php':          IconBuilding,
  'bank.php':          IconBank,
  'factions.php':      IconFolder,
  'casino.php':        IconCasino,       // Casino
  'dump.php':          IconDump,         // Dump
  'church.php':        IconChurch,       // Church
  'education.php':     IconGraduationCap,// Education
  'amarket.php':       IconGavel,        // Auction House
  'loanshark.php':     IconLoanShark,    // Loan Shark
  'properties.php':    IconEstateAgents, // Estate Agent
  'museum.php':        IconMuseum,       // Museum
  'pawnshop.php':      IconPawnShop,     // Pawn Shop
  'recycling.php':     IconRecycling,    // Recycling Center
  'points.php':        IconPointsBuilding,
  'step=gunshop':      IconGun,
  'step=cyberforce':   IconCyberForce,
  'step=docks':        IconAnchor,
  'step=jewelry':      IconGem,
  'step=pharmacy':     IconPill,
  'step=postoffice':   IconMail,
  'step=printshop':    IconPrinter,
  'step=superstore':   IconShoppingBag,
  'step=sweetshop':    IconCandy,
  'step=clothing':     IconClothing,
  'step=bitsnbobs':    IconBox,
};

/**
 * Determines the most appropriate icon component to use based on an action's URL and label.
 * Looks through pre-defined URL path mappings and keyword mappings to match the intent of the action.
 *
 * @param {string} [href=''] - The URL of the quick action.
 * @param {string} [label=''] - The display text of the quick action.
 * @returns {React.FC} The React icon component best matching the action, or a fallback icon if none match.
 */
export const getQuickActionIcon = (href = '', label = '') => {
  const safeHref = (href || '').toLowerCase();
  const safeLabel = (label || '').toLowerCase();
  const combined = `${safeHref} ${safeLabel}`;

  // 1. Check exact/partial URL-based matching first
  for (const [key, Icon] of Object.entries(QUICK_ACTION_ICONS)) {
    if (safeHref.includes(key.toLowerCase())) return Icon;
  }

  // 2. Define keyword-to-icon mapping for custom actions based on what user typed
  const keywordMappings = [
    { keywords: ['crocodile', 'alligator', 'gator', 'lizard', 'reptile', 'tornagator'], icon: IconCrocodile },
    { keywords: ['gym', 'dumbbell', 'workout', 'train', 'exercise', 'physical'], icon: IconDumbbell },
    { keywords: ['muscle', 'strength', 'power'], icon: IconMuscle },
    { keywords: ['jail', 'prison', 'court', 'law', 'judge', 'scales', 'justice', 'jailed'], icon: IconJail },
    { keywords: ['crime', 'crimes', 'mug', 'nerve', 'steal', 'rob', 'hustle', 'bolt', 'energy'], icon: IconBolt },
    { keywords: ['attack', 'fight', 'battle', 'combat', 'war', 'swords', 'sword', 'hit', 'loader'], icon: IconSwords },
    { keywords: ['peace'], icon: IconPeace },
    { keywords: ['bazaar', 'shop', 'store', 'item', 'items', 'buy', 'sell'], icon: IconStore },
    { keywords: ['market', 'imarket', 'stock', 'stocks', 'share', 'shares', 'trade', 'trading', 'chart', 'graph'], icon: IconChartUp },
    { keywords: ['travel', 'fly', 'flight', 'plane', 'airport', 'abroad', 'overseas', 'country', 'countries'], icon: IconPlane },
    { keywords: ['hospital', 'clinic', 'doctor', 'medical', 'heal'], icon: IconHospital },
    { keywords: ['heart', 'life', 'hp'], icon: IconHeart },
    { keywords: ['home', 'profile', 'main', 'index', 'base', 'house', 'estate', 'property', 'properties'], icon: IconHome },
    { keywords: ['bank', 'deposit', 'save', 'wealth'], icon: IconBank },
    { keywords: ['money', 'cash', 'coin', 'coins', 'points', 'point'], icon: IconCoin },
    { keywords: ['event', 'events', 'target', 'mission', 'missions', 'quest', 'quests', 'daily', 'activity'], icon: IconTarget },
    { keywords: ['city', 'town', 'building', 'map', 'area', 'street', 'place'], icon: IconBuilding },
    { keywords: ['time', 'clock', 'timer', 'watch', 'date', 'schedule'], icon: IconClock },
    { keywords: ['warning', 'alert', 'hazard', 'danger'], icon: IconWarning },
    { keywords: ['gamepad', 'play', 'game', 'slots', 'lottery', 'bet', 'betting', 'gamble', 'gambling', 'poker', 'wheel'], icon: IconGamepad },
    { keywords: ['casino'], icon: IconCasino },
    { keywords: ['dump'], icon: IconDump },
    { keywords: ['pill', 'drug', 'drugs', 'rehab', 'addict', 'addiction', 'medicine'], icon: IconPill },
    { keywords: ['refresh', 'reload', 'cycle', 'loop', 'again'], icon: IconRefresh },
    { keywords: ['faction', 'factions', 'clan', 'guild', 'folder'], icon: IconFolder },
    { keywords: ['education', 'study', 'class', 'learn', 'degree', 'university', 'college', 'course', 'courses'], icon: IconGraduationCap },
    { keywords: ['auction', 'gavel', 'bid', 'bids'], icon: IconGavel },
    { keywords: ['church', 'cross', 'god', 'pray', 'religion'], icon: IconChurch },
    { keywords: ['chronicle', 'archives', 'newspaper', 'news', 'press'], icon: IconNewspaper },
    { keywords: ['museum'], icon: IconMuseum },
    { keywords: ['community', 'center', 'users', 'staff', 'committee', 'hall', 'city hall'], icon: IconUsers },
    { keywords: ['donator', 'star', 'crown'], icon: IconStar },
    { keywords: ['message', 'messaging', 'mail', 'send', 'post', 'post office'], icon: IconMail },
    { keywords: ['gun', 'guns', 'ammo', 'weapon', 'weapons', 'pistol', 'armory', 'crosshair', 'shoot'], icon: IconGun },
    { keywords: ['bobs', 'bits', 'gift', 'box', 'package'], icon: IconBox },
    { keywords: ['cyber', 'force', 'cpu', 'hacking', 'terminal', 'tech'], icon: IconCyberForce },
    { keywords: ['dock', 'docks', 'anchor', 'ship', 'boat', 'harbor', 'port'], icon: IconAnchor },
    { keywords: ['jewelry', 'jewel', 'gem', 'diamond', 'ring'], icon: IconGem },
    { keywords: ['pawn', 'tag', 'tags', 'label'], icon: IconPawnShop },
    { keywords: ['clothing', 'tc clothing', 'shirt', 'clothes'], icon: IconClothing },
    { keywords: ['printer', 'print'], icon: IconPrinter },
    { keywords: ['recycling', 'recycle', 'trash'], icon: IconRecycling },
    { keywords: ['super', 'super store', 'bag'], icon: IconShoppingBag },
    { keywords: ['sweet', 'sweets', 'candy', 'cookie', 'chocolate'], icon: IconCandy },
    { keywords: ['visitor', 'info', 'guide'], icon: IconInfo },
    { keywords: ['loan', 'loanshark', 'shark'], icon: IconLoanShark },
    { keywords: ['raceway', 'race', 'racing'], icon: IconRaceway },
    { keywords: ['island'], icon: IconPrivateIsland }
  ];

  // Check the keyword mappings to match what user typed
  for (const mapping of keywordMappings) {
    if (mapping.keywords.some(keyword => combined.includes(keyword))) {
      return mapping.icon;
    }
  }

  return IconTarget;
};
