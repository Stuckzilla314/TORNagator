import React, { useState, useEffect } from 'react';
import { fetchFactionById } from './tornApi';
import { useWarTimer } from './useWarTimer';
import { IconSword, IconPeace, IconTarget, IconSwords, IconPill, IconBolt, IconMuscle, IconClock, IconBarChart, IconTrash, IconPin } from './Icons';
import { isCapacitor } from './utils';

/**
 * Renders a card displaying details for a specific Ranked War (upcoming or active).
 *
 * @param {Object} props - The component props.
 * @param {Object} props.war - The specific war data object.
 * @param {Object} props.factionData - Data about the user's current faction.
 * @param {Object} props.cardStyle - CSS style object for the outer card container.
 * @param {Object} props.labelStyle - CSS style object for labels.
 * @param {Object} props.valueStyle - CSS style object for values.
 * @param {Function} props.onOpenInTorn - Callback to open a link in Torn.
 * @returns {React.JSX.Element} The rendered RankedWarCard component.
 */
const RankedWarCard = ({ war, factionData, cardStyle, labelStyle, valueStyle, onOpenInTorn }) => {
  const factionsEntries = Object.entries(war.factions || {}).map(([id, f]) => ({ id, ...f }));
  const ourFactionInfo = factionsEntries.find(f => f.name === factionData.name) || {};
  const ourFactionScore = ourFactionInfo.score || 0;

  const enemyFactionInfo = factionsEntries.find(f => f.name !== factionData.name) || {};
  const enemyFactionId = enemyFactionInfo.id || '';
  const enemyFactionName = enemyFactionInfo.name || 'Unknown Faction';
  const enemyFactionScore = enemyFactionInfo.score || 0;

  const targetScore = war.war.target || 'N/A';
  const startTime = war.war.start;
  const timer = useWarTimer(startTime);

  return (
    <div style={{ ...cardStyle, border: `1px solid ${timer.isFuture ? '#f1c40f' : '#e74c3c'}`, background: timer.isFuture ? 'linear-gradient(145deg, #1e1e1e, #2c251a)' : 'linear-gradient(145deg, #1e1e1e, #2c1a1a)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ marginTop: 0, color: timer.isFuture ? '#f1c40f' : '#e74c3c', display: 'flex', alignItems: 'center', gap: '10px', fontSize: isCapacitor ? '1.2rem' : '1.5rem' }}>
            {timer.isFuture
              ? <><IconClock size={20} color="#f1c40f" /> Upcoming Ranked War</>
              : <><IconSword size={20} color="#e74c3c" /> Active Ranked War</>}
          </h3>
          <p style={{ margin: '4px 0', fontSize: isCapacitor ? '1rem' : '1.2rem', fontWeight: 'bold' }}>
            vs <a 
              href={`https://www.torn.com/factions.php?step=profile&ID=${enemyFactionId}`} 
              onClick={(e) => {
                if (onOpenInTorn) {
                  e.preventDefault();
                  onOpenInTorn(`https://www.torn.com/factions.php?step=profile&ID=${enemyFactionId}`);
                }
              }}
              className="text-link" 
              style={{ color: '#fff' }}
            >
              {enemyFactionName}
            </a>
          </p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px', flexWrap: 'wrap' }}>
            <div style={{ ...labelStyle, color: '#888', fontSize: '0.75rem' }}>
              Scheduled: {new Date(startTime * 1000).toLocaleString()}
            </div>
            <div style={{ ...labelStyle, color: timer.isFuture ? '#f1c40f' : '#3498db', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {timer.status}: {timer.display}
            </div>
          </div>
        </div>
        <div className="ranked-war-card-scores" style={{ display: 'flex', gap: isCapacitor ? '1rem' : '2rem', textAlign: 'center', flexWrap: 'wrap', justifyContent: isCapacitor ? 'space-between' : 'flex-start', width: isCapacitor ? '100%' : 'auto', marginTop: isCapacitor ? '12px' : 0 }}>
          <div>
            <div style={{ ...labelStyle, color: '#aaa', fontSize: isCapacitor ? '0.75rem' : '0.85rem' }}>
              <a 
                href={`https://www.torn.com/factions.php?step=profile&ID=${factionData.ID}`} 
                onClick={(e) => {
                  if (onOpenInTorn) {
                    e.preventDefault();
                    onOpenInTorn(`https://www.torn.com/factions.php?step=profile&ID=${factionData.ID}`);
                  }
                }}
                className="text-link" 
                style={{ color: 'inherit' }}
              >
                {factionData.name}
              </a>
            </div>
            <div style={{ ...valueStyle, fontSize: isCapacitor ? '1.5rem' : '2rem', color: '#3498db' }}>{ourFactionScore}</div>
          </div>
          <div className="ranked-war-card-divider" style={{ alignSelf: 'center', fontSize: '1.5rem', color: '#666', fontWeight: 'bold' }}>-</div>
          <div>
            <div style={{ ...labelStyle, color: '#aaa', fontSize: isCapacitor ? '0.75rem' : '0.85rem' }}>
              <a 
                href={`https://www.torn.com/factions.php?step=profile&ID=${enemyFactionId}`} 
                onClick={(e) => {
                  if (onOpenInTorn) {
                    e.preventDefault();
                    onOpenInTorn(`https://www.torn.com/factions.php?step=profile&ID=${enemyFactionId}`);
                  }
                }}
                className="text-link" 
                style={{ color: 'inherit' }}
              >
                {enemyFactionName}
              </a>
            </div>
            <div style={{ ...valueStyle, fontSize: isCapacitor ? '1.5rem' : '2rem', color: '#e74c3c' }}>{enemyFactionScore}</div>
          </div>
          {!isCapacitor && <div className="ranked-war-card-divider" style={{ alignSelf: 'center', borderLeft: '1px solid #444', height: '50px', margin: '0 10px' }}></div>}
          <div>
            <div style={{ ...labelStyle, color: '#aaa', fontSize: isCapacitor ? '0.75rem' : '0.85rem' }}>Target Score</div>
            <div style={{ ...valueStyle, fontSize: isCapacitor ? '1.5rem' : '2rem', color: '#f1c40f' }}>{targetScore}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Renders the Faction War dashboard tab, fetching and displaying current faction details,
 * peace treaties, active/upcoming ranked wars, and territory wars.
 *
 * @param {Object} props - The component props.
 * @param {string} props.apiKey - The user's API key.
 * @param {Object} props.factionData - Basic faction data provided by parent.
 * @param {Object} props.userData - The current user's data.
 * @param {Function} props.onOpenInTorn - Callback to open links inside the Torn view.
 * @returns {React.JSX.Element|null} The rendered FactionWar component, or null if user is not in a faction.
 */
/**
 * Parses suspected target stats/XP from a raw text block (e.g. from copy-pasting).
 * 
 * @param {string} text - Raw text containing suspected stats.
 * @returns {Object} An object containing the parsed factionName and a map of stats by lowercase username.
 */
const parseSuspectedStats = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const stats = {};
  let factionName = '';
  
  if (lines.length === 0) return { factionName, stats };
  
  let startIndex = 0;
  // If the first line doesn't start with a number and doesn't look like a header, treat it as the Faction name.
  if (lines[0] && !/^\d+\s/.test(lines[0]) && !/No\b/i.test(lines[0])) {
    factionName = lines[0];
    startIndex = 1;
  }
  
  // If the next line is a header (contains "No" or "XP"), skip it.
  if (lines[startIndex] && /No\b/i.test(lines[startIndex])) {
    startIndex++;
  }
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Split by tabs, multiple spaces, or regular spaces
    let parts = line.split('\t').map(p => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
    }
    if (parts.length < 3) {
      parts = line.split(/\s+/).map(p => p.trim()).filter(Boolean);
    }
    
    if (parts.length >= 3) {
      const index = parts[0];
      const xpVal = parts[parts.length - 1];
      const name = parts.slice(1, parts.length - 1).join(' ').trim();
      
      // Parse numeric value for sorting
      let numericValue = 0;
      const cleanVal = xpVal.toLowerCase().replace(/,/g, '').trim();
      
      // Try to parse values like 559m or 759k
      const match = cleanVal.match(/^([\d.]+)\s*([kmbt]?)$/);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2];
        if (unit === 'k') numericValue = num * 1000;
        else if (unit === 'm') numericValue = num * 1000000;
        else if (unit === 'b') numericValue = num * 1000000000;
        else if (unit === 't') numericValue = num * 1000000000000;
        else numericValue = num;
      } else {
        const numOnly = parseFloat(cleanVal);
        if (!isNaN(numOnly)) numericValue = numOnly;
      }
      
      stats[name.toLowerCase()] = {
        raw: xpVal,
        value: numericValue,
        index: parseInt(index, 10) || i
      };
    }
  }
  
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
 * A collapsible section wrapper used to group faction member cards.
 */
const CollapsibleSection = ({ title, count, statusColor, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: '8px' }}>
      {/* Section header / toggle */}
      <div
        onClick={() => setIsOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          backgroundColor: '#1a1a1a',
          border: `1px solid ${statusColor}55`,
          borderRadius: isOpen ? '8px 8px 0 0' : '8px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#222'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1a1a1a'}
      >
        {/* Chevron */}
        <span style={{
          display: 'inline-block',
          transition: 'transform 0.25s',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          fontSize: '0.8rem',
          color: statusColor
        }}>▶</span>

        {/* Title */}
        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: statusColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {title}
        </span>

        {/* Badge */}
        <span style={{
          marginLeft: 'auto',
          backgroundColor: `${statusColor}22`,
          border: `1px solid ${statusColor}55`,
          color: statusColor,
          borderRadius: '12px',
          padding: '1px 10px',
          fontSize: '0.78rem',
          fontWeight: 'bold',
          minWidth: '28px',
          textAlign: 'center'
        }}>
          {count}
        </span>
      </div>

      {/* Collapsible body */}
      {isOpen && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '6px 0 0 0',
          borderLeft: `2px solid ${statusColor}33`,
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
 * Component for rendering an individual Faction Member Card with real-time countdown timer.
 */
const FactionMemberCard = ({ member, userData, compareMode, hasImportedStats, onOpenInTorn, isPinned, onTogglePin, isMinimal }) => {
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
  
  const profile = member.profile;
  const daysPlaying = profile.age;
  const ps = profile.personalstats || {};
  const attacksWon = ps.attackswon || 0;
  const attacksLost = ps.attackslost || 0;
  const defendsWon = ps.defendswon || 0;
  const defendsLost = ps.defendslost || 0;
  const totalFights = attacksWon + attacksLost + defendsWon + defendsLost;
  const winRate = totalFights > 0 ? Math.round(((attacksWon + defendsWon) / totalFights) * 100) : null;
  const criminalOffenses = ps.criminaloffenses || 0;
  const drugsUsed = ps.drugsused || 0;
  const totalRefills = (ps.refills || 0) + (ps.nerverefills || 0) + (ps.tokenrefills || 0);
  const boostersUsed = ps.boostersused || 0;
  const hasProfile = Object.keys(profile).length > 0;

  if (isMinimal) {
    return (
      <a 
        href={`https://www.torn.com/profiles.php?XID=${member.id}`} 
        onClick={(e) => {
          if (onOpenInTorn) {
            e.preventDefault();
            onOpenInTorn(`https://www.torn.com/profiles.php?XID=${member.id}`);
          }
        }}
        className="dashboard-card-link is-minimal"
        style={{ borderRadius: '6px' }}
      >
        <div className="member-card-wrapper minimal" style={{ borderLeft: `4px solid ${statusColor}`, padding: '6px 12px' }}>
          {/* Line 1: Name, Online status, and Pin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.2' }}>
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>
              {member.name}
            </span>
            {member.last_action?.status && (
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: member.last_action.status === 'Online' ? '#2ecc71' :
                                   member.last_action.status === 'Idle' ? '#f39c12' : '#e74c3c',
                  boxShadow: member.last_action.status === 'Online' ? '0 0 4px #2ecc71' : 'none'
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
              }}
              title={isPinned ? "Unpin Target" : "Pin Target"}
            >
              <IconPin size={13} color={isPinned ? '#f1c40f' : '#555'} fill={isPinned ? '#f1c40f' : 'none'} />
            </span>
          </div>

          {/* Line 2: Status */}
          <div style={{ marginTop: '4px', fontSize: '0.82rem', color: statusColor, display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.2' }}>
            <span>{currentStatusState}</span>
            {currentStatusState === 'Hospital' && currentDescription && (
              <span style={{ color: '#aaa', fontSize: '0.78rem' }}>
                ({currentDescription.replace(/<[^>]+>/g, '').replace(/Hospitalized for /i, '')})
              </span>
            )}
          </div>
        </div>
      </a>
    );
  }

  return (
    <a 
      href={`https://www.torn.com/profiles.php?XID=${member.id}`} 
      onClick={(e) => {
        if (onOpenInTorn) {
          e.preventDefault();
          onOpenInTorn(`https://www.torn.com/profiles.php?XID=${member.id}`);
        }
      }}
      className="dashboard-card-link"
      style={{ borderRadius: '8px' }}
    >
      <div className="member-card-wrapper" style={{ borderLeft: `6px solid ${statusColor}` }}>
        <div className={`member-card-grid${hasImportedStats ? ' has-stats' : ''}`}>
          {/* Name & Status details */}
          <div className="member-card-info">
            <div>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {member.name}
              </span>
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onTogglePin) onTogglePin(member.id);
                }}
                className={`member-card-pin-btn ${isPinned ? 'is-pinned' : ''}`}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  verticalAlign: 'middle',
                  marginLeft: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                }}
                title={isPinned ? "Unpin Target" : "Pin Target"}
              >
                <IconPin size={15} color={isPinned ? '#f1c40f' : '#555'} fill={isPinned ? '#f1c40f' : 'none'} />
              </span>
              <span style={{ color: '#666', fontSize: '0.85rem', marginLeft: '6px' }}>[{member.id}]</span>
              {member.last_action?.status && (
                <span
                  title={member.last_action.status}
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: member.last_action.status === 'Online' ? '#2ecc71' :
                                     member.last_action.status === 'Idle' ? '#f39c12' : '#e74c3c',
                    marginLeft: '8px',
                    verticalAlign: 'middle',
                    boxShadow: member.last_action.status === 'Online' ? '0 0 5px #2ecc71' :
                               member.last_action.status === 'Idle' ? '0 0 5px #f39c12' : 'none'
                  }}
                />
              )}
              <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px' }}>
                Lvl {member.level} • Last: {member.last_action?.relative || 'Unknown'}
              </div>
            </div>
            
            <div className="member-card-status-col">
              <span className="member-card-status-text" style={{ color: statusColor }}>{currentStatusState}</span>
              {currentDescription && currentDescription !== currentStatusState && (
                <span className="member-card-status-desc">
                  {currentDescription.replace(/<[^>]+>/g, '').replace(/Hospitalized for /i, '')}
                </span>
              )}
            </div>
          </div>

          {/* Desktop Stats (hidden on mobile via CSS) */}
          <div className="member-card-desktop-stats">
            {hasImportedStats && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Suspected XP</div>
                {member.suspectedRaw ? (
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <IconBarChart size={14} color="#e74c3c" /> {member.suspectedRaw}
                  </div>
                ) : (
                  <div style={{ color: '#444', fontSize: '0.85rem' }}>—</div>
                )}
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Days Playing</div>
              {hasProfile ? (
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f1c40f' }}>
                  {daysPlaying !== null ? daysPlaying.toLocaleString() : '—'}
                </div>
              ) : (
                <div style={{ color: '#555', fontSize: '0.85rem' }}>Loading...</div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Atk W/L</div>
              {hasProfile ? (
                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                  <span style={{ color: '#2ecc71' }}>{attacksWon.toLocaleString()}</span>
                  <span style={{ color: '#555', margin: '0 4px' }}>/</span>
                  <span style={{ color: '#e74c3c' }}>{attacksLost.toLocaleString()}</span>
                </div>
              ) : (
                <div style={{ color: '#555', fontSize: '0.85rem' }}>—</div>
              )}
              {hasProfile && (
                <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '2px' }}>Def: <span style={{ color: '#2ecc71' }}>{defendsWon.toLocaleString()}</span>/<span style={{ color: '#e74c3c' }}>{defendsLost.toLocaleString()}</span></div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Win Rate</div>
              {hasProfile ? (
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: winRate >= 70 ? '#e74c3c' : winRate >= 50 ? '#f1c40f' : '#2ecc71' }}>
                  {winRate !== null ? `${winRate}%` : '—'}
                </div>
              ) : (
                <div style={{ color: '#555', fontSize: '0.85rem' }}>—</div>
              )}
            </div>
          </div>

          {/* Mobile Stats Grid (shown only on mobile via CSS) */}
          <div className={`member-card-mobile-stats${hasImportedStats ? ' has-stats' : ''}`}>
            {hasImportedStats && (
              <div className="member-card-mobile-stats-col">
                <div className="member-card-mobile-stats-label">Suspected XP</div>
                {member.suspectedRaw ? (
                  <div className="member-card-mobile-stats-val" style={{ color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                    <IconBarChart size={12} color="#e74c3c" /> {member.suspectedRaw}
                  </div>
                ) : (
                  <div className="member-card-mobile-stats-val" style={{ color: '#444' }}>—</div>
                )}
              </div>
            )}

            <div className="member-card-mobile-stats-col">
              <div className="member-card-mobile-stats-label">Days</div>
              <div className="member-card-mobile-stats-val" style={{ color: '#f1c40f' }}>
                {hasProfile && daysPlaying !== null ? daysPlaying.toLocaleString() : '—'}
              </div>
            </div>

            <div className="member-card-mobile-stats-col">
              <div className="member-card-mobile-stats-label">Atk W/L</div>
              <div className="member-card-mobile-stats-val">
                {hasProfile ? (
                  <>
                    <span style={{ color: '#2ecc71' }}>{attacksWon.toLocaleString()}</span>
                    <span style={{ color: '#555', margin: '0 2px' }}>/</span>
                    <span style={{ color: '#e74c3c' }}>{attacksLost.toLocaleString()}</span>
                  </>
                ) : '—'}
              </div>
            </div>

            <div className="member-card-mobile-stats-col">
              <div className="member-card-mobile-stats-label">Win Rate</div>
              <div className="member-card-mobile-stats-val" style={{ color: winRate >= 70 ? '#e74c3c' : winRate >= 50 ? '#f1c40f' : '#2ecc71' }}>
                {hasProfile && winRate !== null ? `${winRate}%` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Activity strip */}
        {hasProfile && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #333' }}>
            {[
              { 
                label: <><IconSwords size={12} color="#e67e22" /> Crimes</>, 
                value: criminalOffenses, 
                color: '#e67e22',
                own: userData.personalstats?.criminaloffenses || 0
              },
              { 
                label: <><IconPill size={12} color="#9b59b6" /> Drugs</>, 
                value: drugsUsed, 
                color: '#9b59b6',
                own: userData.personalstats?.drugsused || 0
              },
              { 
                label: <><IconBolt size={12} color="#3498db" /> Refills</>, 
                value: totalRefills, 
                color: '#3498db',
                own: (userData.personalstats?.refills || 0) + (userData.personalstats?.nerverefills || 0) + (userData.personalstats?.tokenrefills || 0)
              },
              { 
                label: <><IconMuscle size={12} color="#2ecc71" /> Boosters</>, 
                value: boostersUsed, 
                color: '#2ecc71',
                own: userData.personalstats?.boostersused || 0
              },
            ].map(({ label, value, color, own }) => {
              const diff = value - own;
              const diffStr = diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
              const diffColor = diff > 0 ? '#e74c3c' : diff < 0 ? '#2ecc71' : '#888';

              return (
                <span key={color} className="member-card-activity-badge" style={{ border: `1px solid ${color}44` }}>
                  {label}: <strong style={{ color }}>
                    {compareMode ? diffStr : value.toLocaleString()}
                  </strong>
                  {compareMode && (
                    <span style={{ fontSize: '0.7rem', color: diffColor, marginLeft: '2px', fontStyle: 'italic' }}>
                      {diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'even'}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </a>
  );
};

const FactionWar = ({ apiKey, factionData, userData, onOpenInTorn }) => {
  // Derive war state from factionData (safe to do before the guard — factionData may be null)
  const rankedWars = factionData?.ranked_wars || factionData?.rankedwars || {};
  const activeWars = Object.values(rankedWars);
  const isInWar = activeWars.length > 0;

  let firstEnemyFactionId = null;
  if (isInWar && factionData) {
    const factionsEntries = Object.entries(activeWars[0].factions || {}).map(([id, f]) => ({ id, ...f }));
    const enemyInfo = factionsEntries.find(f => f.name !== factionData.name) || {};
    firstEnemyFactionId = enemyInfo.id;
  }

  const cacheKey = firstEnemyFactionId ? `tornagator_targets_${firstEnemyFactionId}` : null;

  // Helper to load cache synchronously
  const getCachedData = () => {
    if (!cacheKey) return null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      sessionStorage.removeItem(cacheKey);
    }
    return null;
  };

  const cachedData = getCachedData();

  const [activeSubTab, setActiveSubTab] = useState(() => {
    return localStorage.getItem('tornagator_faction_active_subtab') || 'overview';
  });
  const [compareMode, setCompareMode] = useState(false);
  const [enemyFactionData, setEnemyFactionData] = useState(() => cachedData?.factionData || null);
  const [memberProfiles, setMemberProfiles] = useState(() => cachedData?.profiles || {});
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ done: 0, total: 0 });
  const [errorTargets, setErrorTargets] = useState(null);
  const [cachedAt, setCachedAt] = useState(() => cachedData?.fetchedAt || null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('tornagator_faction_sort_by') || 'default';
  });
  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('tornagator_faction_sort_order') || 'desc';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem('tornagator_faction_status_filter') || 'all';
  });
  const [layoutView, setLayoutView] = useState(() => {
    return localStorage.getItem('tornagator_faction_layout_view') || 'detailed';
  });
  const [importedStats, setImportedStats] = useState({});
  const [suspectedStatsFaction, setSuspectedStatsFaction] = useState('');

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('tornagator_pinned_targets');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Failed to parse pinned targets from localStorage', e);
      return {};
    }
  });

  const handleTogglePin = (memberId) => {
    setPinnedIds(prev => {
      const updated = { ...prev, [memberId]: !prev[memberId] };
      if (!updated[memberId]) {
        delete updated[memberId];
      }
      try {
        localStorage.setItem('tornagator_pinned_targets', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save pinned targets to localStorage', e);
      }
      return updated;
    });
  };

  // Sync cache if key changes later
  useEffect(() => {
    if (!cacheKey) return;
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

  // Save active subtab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('tornagator_faction_active_subtab', activeSubTab);
  }, [activeSubTab]);

  // Save sort selection and order to localStorage when they change
  useEffect(() => {
    localStorage.setItem('tornagator_faction_sort_by', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('tornagator_faction_sort_order', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem('tornagator_faction_status_filter', statusFilter);
  }, [statusFilter]);

  // Load targets if starting on the targets tab and they aren't loaded yet
  useEffect(() => {
    if (activeSubTab === 'targets' && !enemyFactionData && !isLoadingTargets && firstEnemyFactionId && apiKey) {
      doFetchTargets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, enemyFactionData, isLoadingTargets, firstEnemyFactionId, apiKey]);

  // Load suspected stats from localStorage when target faction ID changes
  useEffect(() => {
    if (!firstEnemyFactionId) return;
    try {
      const stored = localStorage.getItem(`tornagator_suspected_stats_${firstEnemyFactionId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setImportedStats(parsed.stats || {});
        setSuspectedStatsFaction(parsed.factionName || '');
      } else {
        setImportedStats({});
        setSuspectedStatsFaction('');
      }
    } catch (e) {
      console.error('[TORNagator] Error loading suspected stats:', e);
    }
  }, [firstEnemyFactionId]);

  const handleImportStats = (text) => {
    const { factionName, stats } = parseSuspectedStats(text);
    setImportedStats(stats);
    setSuspectedStatsFaction(factionName);
    if (firstEnemyFactionId) {
      try {
        localStorage.setItem(`tornagator_suspected_stats_${firstEnemyFactionId}`, JSON.stringify({ factionName, stats }));
      } catch (e) {
        console.error('[TORNagator] Error saving suspected stats:', e);
      }
    }
  };

  const handleClearStats = () => {
    setImportedStats({});
    setSuspectedStatsFaction('');
    if (firstEnemyFactionId) {
      localStorage.removeItem(`tornagator_suspected_stats_${firstEnemyFactionId}`);
    }
  };

  // Called when navigating to the targets tab — uses cache if available
  const handleLoadTargets = () => {
    if (!enemyFactionData) doFetchTargets();
  };

  // Called by the Refresh button — always bypasses cache
  const handleForceRefresh = () => {
    if (cacheKey) sessionStorage.removeItem(cacheKey);
    doFetchTargets();
  };

  // Early return AFTER all hooks
  if (!factionData) {
    return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading Faction Data...</div>;
  }

  const doFetchTargets = async () => {
    if (!firstEnemyFactionId || !apiKey) return;
    setIsLoadingTargets(true);
    setErrorTargets(null);
    setMemberProfiles({});
    try {
      const data = await fetchFactionById(apiKey, firstEnemyFactionId);
      setEnemyFactionData(data);
      const memberIds = Object.keys(data.members || {});
      setLoadingProgress({ done: 0, total: memberIds.length });
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
        setLoadingProgress({ done: Math.min(i + BATCH_SIZE, memberIds.length), total: memberIds.length });
        if (i + BATCH_SIZE < memberIds.length) {
          await new Promise(res => setTimeout(res, 350));
        }
      }
      setMemberProfiles(profiles);
      const fetchedAt = Date.now();
      setCachedAt(fetchedAt);
      // Persist to sessionStorage
      if (cacheKey) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ factionData: data, profiles, fetchedAt }));
        } catch (e) {
          console.warn('[TORNagator] sessionStorage full, targets not cached:', e);
        }
      }
    } catch (err) {
      setErrorTargets('Failed to fetch targets.');
    } finally {
      setIsLoadingTargets(false);
    }
  };



  const cardStyle = {
    backgroundColor: '#1e1e1e',
    padding: isCapacitor ? '10px' : '1.5rem',
    borderRadius: '12px',
    border: '1px solid #333',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    marginBottom: isCapacitor ? '1rem' : '2rem'
  };

  const labelStyle = {
    color: '#888',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '4px'
  };

  const valueStyle = {
    fontSize: '1.1rem',
    fontWeight: '500',
    color: '#fff'
  };

  const navItemStyle = (tab) => ({
    padding: isCapacitor ? '10px 12px' : '10px 20px',
    cursor: 'pointer',
    borderBottom: activeSubTab === tab ? '2px solid #e74c3c' : '2px solid transparent',
    color: activeSubTab === tab ? '#e74c3c' : '#888',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    background: 'none',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    fontFamily: 'inherit',
    fontSize: isCapacitor ? '0.9rem' : 'inherit'
  });

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
      <header className="faction-war-header" style={{ marginBottom: isCapacitor ? '1rem' : '2rem' }}>
        <h1 className="faction-war-title" style={{ margin: 0, fontSize: isCapacitor ? '1.8rem' : '2.5rem', fontWeight: '800' }}>
          <a 
            href={`https://www.torn.com/factions.php?step=profile&ID=${factionData.ID}`} 
            onClick={(e) => {
              if (onOpenInTorn) {
                e.preventDefault();
                onOpenInTorn(`https://www.torn.com/factions.php?step=profile&ID=${factionData.ID}`);
              }
            }}
            className="text-link" 
            style={{ color: 'inherit' }}
          >
            {factionData.name}
          </a> <span className="faction-war-tag" style={{ color: '#666', fontSize: isCapacitor ? '1.1rem' : '1.5rem' }}>[{factionData.tag}]</span>
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
          <span style={{ backgroundColor: '#333', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem' }}>
            Respect: {factionData.respect?.toLocaleString() || 'N/A'}
          </span>
          <span style={{ backgroundColor: '#333', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem' }}>
            Capacity: {factionData.capacity || 'N/A'}
          </span>
        </div>
      </header>

      {isInWar && (
        <nav style={{ marginBottom: '20px', borderBottom: '1px solid #333' }}>
          <button className="faction-war-nav-item" style={navItemStyle('overview')} onClick={() => setActiveSubTab('overview')}>War Overview</button>
          <button className="faction-war-nav-item" style={navItemStyle('targets')} onClick={() => {
            setActiveSubTab('targets');
            handleLoadTargets();
          }}>Enemy Targets</button>
        </nav>
      )}

      {activeSubTab === 'overview' && (
        <>
          {isInWar ? (
            activeWars.map((war, index) => (
              <RankedWarCard 
                key={index} 
                war={war} 
                factionData={factionData} 
                cardStyle={cardStyle} 
                labelStyle={labelStyle} 
                valueStyle={valueStyle} 
                onOpenInTorn={onOpenInTorn}
              />
            ))
          ) : (
            <div style={{ ...cardStyle, border: '1px solid #2ecc71', background: 'linear-gradient(145deg, #1e1e1e, #1a2c20)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ marginTop: 0, color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem' }}>
                    <IconPeace size={22} color="#2ecc71" /> Peace Time
                  </h3>
                  <p style={{ margin: '4px 0', fontSize: '1.1rem', color: '#aaa' }}>Your faction is not currently in a ranked war.</p>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: '#3498db' }}>General Information</h3>
              <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Leader</div><div style={valueStyle}>{factionData.leader !== 0 ? <a href={`https://www.torn.com/profiles.php?XID=${factionData.leader}`} onClick={(e) => { if (onOpenInTorn) { e.preventDefault(); onOpenInTorn(`https://www.torn.com/profiles.php?XID=${factionData.leader}`); } }} className="text-link" style={{ color: 'inherit' }}>{factionData.leader_name} [{factionData.leader}]</a> : 'Unknown'}</div></div>
              <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Co-Leader</div><div style={valueStyle}>{factionData['co-leader'] !== 0 ? <a href={`https://www.torn.com/profiles.php?XID=${factionData['co-leader']}`} onClick={(e) => { if (onOpenInTorn) { e.preventDefault(); onOpenInTorn(`https://www.torn.com/profiles.php?XID=${factionData['co-leader']}`); } }} className="text-link" style={{ color: 'inherit' }}>{factionData.co_leader_name} [{factionData['co-leader']}]</a> : 'Unknown'}</div></div>
              <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Age</div><div style={valueStyle}>{factionData.age || 'N/A'} days</div></div>
              <div style={{ marginBottom: '0' }}><div style={labelStyle}>Members</div><div style={valueStyle}>{Object.keys(factionData.members || {}).length}</div></div>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'targets' && isInWar && (
        <div style={cardStyle}>
          <div className="targets-header-row" style={{ 
            display: 'flex', 
            flexDirection: isCapacitor ? 'column' : 'row', 
            justifyContent: 'space-between', 
            alignItems: isCapacitor ? 'stretch' : 'center', 
            gap: isCapacitor ? '12px' : '0',
            marginBottom: cachedAt ? '0.5rem' : '1.5rem' 
          }}>
            <div className="targets-title-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: isCapacitor ? '100%' : 'auto' }}>
              <h3 className="targets-title-text" style={{ margin: 0, color: '#e74c3c', fontSize: isCapacitor ? '1.3rem' : '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}><IconTarget size={22} color="#e74c3c" /> Target Selection</h3>
              
              {isCapacitor && (
                <button 
                  onClick={handleForceRefresh} 
                  disabled={isLoadingTargets} 
                  className="targets-sync-btn"
                  style={{ 
                    background: 'transparent',
                    border: `1px solid ${isLoadingTargets ? '#222' : '#444'}`,
                    borderRadius: '20px',
                    padding: '4px 10px',
                    cursor: isLoadingTargets ? 'not-allowed' : 'pointer',
                    color: isLoadingTargets ? '#666' : '#3498db',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease',
                    opacity: isLoadingTargets ? 0.6 : 1
                  }}
                >
                  <span style={{ marginTop: '1px' }}>{isLoadingTargets ? 'SYNCING...' : 'SYNC'}</span>
                  <span style={{ fontSize: '0.8rem' }}>🔄</span>
                </button>
              )}
            </div>

            <div className="targets-action-group" style={{ display: 'flex', justifyContent: isCapacitor ? 'flex-start' : 'flex-end', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setCompareMode(!compareMode)}
                aria-pressed={compareMode}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  backgroundColor: '#333',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  transition: 'all 0.2s',
                  border: `1px solid ${compareMode ? '#e74c3c' : '#444'}`,
                  fontFamily: 'inherit'
                }}
              >
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: compareMode ? '#e74c3c' : '#555',
                  transition: 'all 0.2s'
                }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: compareMode ? '#fff' : '#888' }}>
                  COMPARE TO OWN
                </span>
              </button>

              {!isCapacitor && (
                <button 
                  onClick={handleForceRefresh} 
                  disabled={isLoadingTargets} 
                  className="targets-sync-btn"
                  style={{ 
                    background: 'transparent',
                    border: `1px solid ${isLoadingTargets ? '#222' : '#444'}`,
                    borderRadius: '20px',
                    padding: '4px 12px',
                    cursor: isLoadingTargets ? 'not-allowed' : 'pointer',
                    color: isLoadingTargets ? '#666' : '#3498db',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                    letterSpacing: '1px',
                    transition: 'all 0.3s ease',
                    opacity: isLoadingTargets ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => { 
                    if (!isLoadingTargets) {
                      e.currentTarget.style.borderColor = '#3498db';
                      e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => { 
                    if (!isLoadingTargets) {
                      e.currentTarget.style.borderColor = '#444';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ marginTop: '1px' }}>{isLoadingTargets ? 'SYNCING...' : 'SYNC TARGETS'}</span>
                  <span style={{ fontSize: '0.9rem' }}>🔄</span>
                </button>
              )}
            </div>
          </div>

          {cachedAt && !isLoadingTargets && (
            <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '1.5rem' }}>
              ✅ Cached — last fetched {new Date(cachedAt).toLocaleTimeString()}. Click Refresh to update.
            </div>
          )}

          {/* Controls / Sorting Bar */}
          {!isLoadingTargets && enemyFactionData && enemyFactionData.members && (
            <div className="targets-controls-bar" style={{ 
              display: 'flex', 
              flexDirection: isCapacitor ? 'column' : 'row',
              justifyContent: 'space-between', 
              alignItems: isCapacitor ? 'stretch' : 'center', 
              gap: '15px', 
              backgroundColor: '#161616', 
              padding: isCapacitor ? '10px' : '12px 16px', 
              borderRadius: '8px', 
              border: '1px solid #2d2d2d',
              marginBottom: '1.5rem'
            }}>
              {/* Sorting and Filter controls */}
              <div className="targets-filters-group" style={{ 
                display: 'flex', 
                flexDirection: isCapacitor ? 'column' : 'row',
                alignItems: isCapacitor ? 'stretch' : 'center', 
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div className="targets-filter-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: isCapacitor ? '100%' : 'auto' }}>
                  <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Sort By:</span>
                  <div style={{ display: 'flex', gap: '6px', flex: isCapacitor ? 1 : 'none', justifyContent: 'flex-end' }}>
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        backgroundColor: '#222',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        color: '#fff',
                        padding: '4px 8px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        outline: 'none',
                        flex: isCapacitor ? 1 : 'none'
                      }}
                    >
                      <option value="default">Status & Level (Default)</option>
                      <option value="level">Level</option>
                      {Object.keys(importedStats).length > 0 && <option value="xp">Suspected XP/Stats</option>}
                      <option value="age">Days Playing</option>
                      <option value="winrate">Win Rate</option>
                    </select>
                    
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      style={{
                        backgroundColor: '#222',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        color: '#aaa',
                        padding: '4.5px 10px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                <div className="targets-filter-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: isCapacitor ? '100%' : 'auto' }}>
                  <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Show:</span>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      backgroundColor: '#222',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '4px 8px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      outline: 'none',
                      flex: isCapacitor ? 1 : 'none',
                      maxWidth: isCapacitor ? 'none' : 'auto'
                    }}
                  >
                    <option value="all">All Members</option>
                    <option value="online">Online / Idle</option>
                    <option value="offline">Offline Only</option>
                  </select>
                </div>

                <div className="targets-filter-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: isCapacitor ? '100%' : 'auto' }}>
                  <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>View:</span>
                  <select 
                    value={layoutView} 
                    onChange={(e) => {
                      setLayoutView(e.target.value);
                      localStorage.setItem('tornagator_faction_layout_view', e.target.value);
                    }}
                    style={{
                      backgroundColor: '#222',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '4px 8px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      outline: 'none',
                      flex: isCapacitor ? 1 : 'none',
                      maxWidth: isCapacitor ? 'none' : 'auto'
                    }}
                  >
                    <option value="detailed">Detailed</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
              </div>

              {/* Import / Suspected stats info */}
              <div className="targets-import-group" style={{ 
                display: 'flex', 
                flexDirection: isCapacitor ? 'column' : 'row',
                alignItems: isCapacitor ? 'stretch' : 'center', 
                gap: '10px',
                borderTop: isCapacitor ? '1px solid #222' : 'none',
                paddingTop: isCapacitor ? '10px' : '0'
              }}>
                {Object.keys(importedStats).length > 0 ? (
                  <>
                    <span className="targets-import-status" style={{ 
                      fontSize: '0.8rem', 
                      color: '#2ecc71', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      justifyContent: isCapacitor ? 'center' : 'flex-start',
                      textAlign: 'center',
                      lineHeight: '1.3'
                    }}>
                      <span style={{ fontSize: '1rem' }}>📊</span> Suspected stats loaded {suspectedStatsFaction ? `(${suspectedStatsFaction})` : ''}
                    </span>
                    <div className="targets-import-actions" style={{ display: 'flex', gap: '10px', width: isCapacitor ? '100%' : 'auto' }}>
                      <button
                        onClick={() => setIsImportOpen(true)}
                        style={{
                          flex: isCapacitor ? 1 : 'none',
                          backgroundColor: 'rgba(52, 152, 219, 0.1)',
                          border: '1px solid #3498db',
                          borderRadius: '4px',
                          color: '#3498db',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'all 0.2s'
                        }}
                      >
                        Update Stats
                      </button>
                      <button
                        onClick={handleClearStats}
                        style={{
                          flex: isCapacitor ? 1 : 'none',
                          backgroundColor: 'rgba(231, 76, 60, 0.1)',
                          border: '1px solid #e74c3c',
                          borderRadius: '4px',
                          color: '#e74c3c',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <IconTrash size={12} color="#e74c3c" /> Clear
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setIsImportOpen(true)}
                    style={{
                      width: isCapacitor ? '100%' : 'auto',
                      backgroundColor: '#e74c3c',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(231, 76, 60, 0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                  >
                    📥 Import Suspected Stats
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Import Panel */}
          {isImportOpen && (
            <div style={{
              backgroundColor: '#1b1b1b',
              border: '1px solid #e74c3c',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#e74c3c', fontSize: '1.1rem' }}>Import Suspected Stats / XP</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#aaa', lineHeight: '1.4' }}>
                Paste the targets list copied from your faction forum, sheet, or Discord. The app will parse the member names and suspected stats/XP.
              </p>
              
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"Lion Force\nNo.\tName\tXP\n1\tJohan1\t559m\n2\tXqmano\t437m"}
                style={{
                  width: '100%',
                  height: '150px',
                  backgroundColor: '#111',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '10px',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  marginBottom: '15px',
                  outline: 'none'
                }}
              />
              
              <div style={{ display: 'flex', gap: '10px' }}>
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
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Import & Apply
                </button>
                <button
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportText('');
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#aaa',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isLoadingTargets ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '1.1rem', color: '#aaa', marginBottom: '12px' }}>
                Fetching profiles... ({loadingProgress.done}/{loadingProgress.total})
              </div>
              <div style={{ backgroundColor: '#222', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', backgroundColor: '#e74c3c', width: loadingProgress.total > 0 ? `${(loadingProgress.done / loadingProgress.total) * 100}%` : '0%', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          ) : errorTargets ? (
            <div style={{ color: '#e74c3c', textAlign: 'center', padding: '2rem' }}>{errorTargets}</div>
          ) : enemyFactionData && enemyFactionData.members ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(() => {
                const hasImportedStats = Object.keys(importedStats).length > 0;

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

                  return {
                    id,
                    ...member,
                    profile,
                    age: profile.age || 0,
                    winRate,
                    suspectedVal: suspect ? suspect.value : -1,
                    suspectedRaw: suspect ? suspect.raw : null,
                    suspectedIndex: suspect ? suspect.index : null
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

                // Group by status for unpinned members
                const groups = {
                  okay: { label: '⚔️ Okay & Hospitalized', color: '#2ecc71', members: [] },
                  jail: { label: '🔒 In Jail', color: '#f39c12', members: [] },
                  other: { label: '✈️ Other', color: '#3498db', members: [] },
                };

                unpinnedMembers.forEach(m => {
                  const state = m.status?.state || '';
                  if (state === 'Okay' || state === 'Hospital') groups.okay.members.push(m);
                  else if (state === 'Jail') groups.jail.members.push(m);
                  else groups.other.members.push(m);
                });

                // Sort within each group
                Object.values(groups).forEach(g => applySortOrder(g.members));
                applySortOrder(pinnedMembers);

                const renderCards = (members) => members.map((member) => (
                  <FactionMemberCard
                    key={member.id}
                    member={member}
                    userData={userData}
                    compareMode={compareMode}
                    hasImportedStats={hasImportedStats}
                    onOpenInTorn={onOpenInTorn}
                    isPinned={!!pinnedIds[member.id]}
                    onTogglePin={handleTogglePin}
                    isMinimal={layoutView === 'minimal'}
                  />
                ));

                const renderedGroups = Object.entries(groups)
                  .filter(([, g]) => g.members.length > 0)
                  .map(([key, g]) => (
                    <CollapsibleSection
                      key={key}
                      title={g.label}
                      count={g.members.length}
                      statusColor={g.color}
                      defaultOpen={key === 'okay'}
                    >
                      {renderCards(g.members)}
                    </CollapsibleSection>
                  ));

                if (pinnedMembers.length > 0) {
                  renderedGroups.unshift(
                    <CollapsibleSection
                      key="pinned"
                      title="📌 Pinned Targets"
                      count={pinnedMembers.length}
                      statusColor="#f1c40f"
                      defaultOpen={true}
                    >
                      {renderCards(pinnedMembers)}
                    </CollapsibleSection>
                  );
                }

                return renderedGroups;
              })()}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>No targets found.</div>
          )}
        </div>
      )}
    </div>
  );
};

// ⚡ Bolt: Wrapped with React.memo() to prevent deep tree re-renders of faction member profiles when other App state changes
export default React.memo(FactionWar);
