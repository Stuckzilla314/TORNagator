import React, { useState, useEffect } from 'react';
import { fetchFactionById } from './tornApi';

import { useWarTimer } from './useWarTimer';

const RankedWarCard = ({ war, factionData, cardStyle, labelStyle, valueStyle }) => {
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
          <h3 style={{ marginTop: 0, color: timer.isFuture ? '#f1c40f' : '#e74c3c', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem' }}>
            {timer.isFuture ? '⏳ Upcoming Ranked War' : '⚔️ Active Ranked War'}
          </h3>
          <p style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
            vs <a href={`https://www.torn.com/factions.php?step=profile&ID=${enemyFactionId}`} target="_blank" rel="noopener noreferrer" className="text-link" style={{ color: '#fff' }}>{enemyFactionName}</a>
          </p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <div style={{ ...labelStyle, color: '#888', fontSize: '0.75rem' }}>
              Scheduled: {new Date(startTime * 1000).toLocaleString()}
            </div>
            <div style={{ ...labelStyle, color: timer.isFuture ? '#f1c40f' : '#3498db', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {timer.status}: {timer.display}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '2rem', textAlign: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...labelStyle, color: '#aaa' }}>
              <a href={`https://www.torn.com/factions.php?step=profile&ID=${factionData.ID}`} target="_blank" rel="noopener noreferrer" className="text-link" style={{ color: 'inherit' }}>{factionData.name}</a>
            </div>
            <div style={{ ...valueStyle, fontSize: '2rem', color: '#3498db' }}>{ourFactionScore}</div>
          </div>
          <div style={{ alignSelf: 'center', fontSize: '1.5rem', color: '#666', fontWeight: 'bold' }}>-</div>
          <div>
            <div style={{ ...labelStyle, color: '#aaa' }}>
              <a href={`https://www.torn.com/factions.php?step=profile&ID=${enemyFactionId}`} target="_blank" rel="noopener noreferrer" className="text-link" style={{ color: 'inherit' }}>{enemyFactionName}</a>
            </div>
            <div style={{ ...valueStyle, fontSize: '2rem', color: '#e74c3c' }}>{enemyFactionScore}</div>
          </div>
          <div style={{ alignSelf: 'center', borderLeft: '1px solid #444', height: '50px', margin: '0 10px' }}></div>
          <div>
            <div style={{ ...labelStyle, color: '#aaa' }}>Target Score</div>
            <div style={{ ...valueStyle, fontSize: '2rem', color: '#f1c40f' }}>{targetScore}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FactionWar = ({ apiKey, factionData, userData }) => {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [compareMode, setCompareMode] = useState(false);
  const [enemyFactionData, setEnemyFactionData] = useState(null);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ done: 0, total: 0 });
  const [errorTargets, setErrorTargets] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);

  // Derive war state from factionData (safe to do before the guard — factionData may be null)
  const rankedWars = factionData?.ranked_wars || {};
  const activeWars = Object.values(rankedWars);
  const isInWar = activeWars.length > 0;

  let firstEnemyFactionId = null;
  if (isInWar && factionData) {
    const factionsEntries = Object.entries(activeWars[0].factions || {}).map(([id, f]) => ({ id, ...f }));
    const enemyInfo = factionsEntries.find(f => f.name !== factionData.name) || {};
    firstEnemyFactionId = enemyInfo.id;
  }

  const cacheKey = firstEnemyFactionId ? `tornagator_targets_${firstEnemyFactionId}` : null;

  // Load from sessionStorage cache on mount (or when cacheKey changes)
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        setEnemyFactionData(cached.factionData);
        setMemberProfiles(cached.profiles);
        setCachedAt(cached.fetchedAt);
      }
    } catch (e) {
      sessionStorage.removeItem(cacheKey);
    }
  }, [cacheKey]);

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

  // Called when navigating to the targets tab — uses cache if available
  const handleLoadTargets = () => {
    if (!enemyFactionData) doFetchTargets();
  };

  // Called by the Refresh button — always bypasses cache
  const handleForceRefresh = () => {
    if (cacheKey) sessionStorage.removeItem(cacheKey);
    doFetchTargets();
  };

  const cardStyle = {
    backgroundColor: '#1e1e1e',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #333',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    marginBottom: '2rem'
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
    padding: '10px 20px',
    cursor: 'pointer',
    borderBottom: activeSubTab === tab ? '2px solid #e74c3c' : '2px solid transparent',
    color: activeSubTab === tab ? '#e74c3c' : '#888',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    display: 'inline-block'
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800' }}>
          <a href={`https://www.torn.com/factions.php?step=profile&ID=${factionData.ID}`} target="_blank" rel="noopener noreferrer" className="text-link" style={{ color: 'inherit' }}>{factionData.name}</a> <span style={{ color: '#666', fontSize: '1.5rem' }}>[{factionData.tag}]</span>
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
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
          <div style={navItemStyle('overview')} onClick={() => setActiveSubTab('overview')}>War Overview</div>
          <div style={navItemStyle('targets')} onClick={() => {
            setActiveSubTab('targets');
            handleLoadTargets();
          }}>Enemy Targets</div>
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
              />
            ))
          ) : (
            <div style={{ ...cardStyle, border: '1px solid #2ecc71', background: 'linear-gradient(145deg, #1e1e1e, #1a2c20)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ marginTop: 0, color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem' }}>
                    🕊️ Peace Time
                  </h3>
                  <p style={{ margin: '4px 0', fontSize: '1.1rem', color: '#aaa' }}>Your faction is not currently in a ranked war.</p>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: '#3498db' }}>General Information</h3>
              <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Leader</div><div style={valueStyle}>{factionData.leader !== 0 ? <a href={`https://www.torn.com/profiles.php?XID=${factionData.leader}`} target="_blank" rel="noopener noreferrer" className="text-link" style={{ color: 'inherit' }}>{factionData.leader_name} [{factionData.leader}]</a> : 'Unknown'}</div></div>
              <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Co-Leader</div><div style={valueStyle}>{factionData['co-leader'] !== 0 ? <a href={`https://www.torn.com/profiles.php?XID=${factionData['co-leader']}`} target="_blank" rel="noopener noreferrer" className="text-link" style={{ color: 'inherit' }}>{factionData.co_leader_name} [{factionData['co-leader']}]</a> : 'Unknown'}</div></div>
              <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Age</div><div style={valueStyle}>{factionData.age || 'N/A'} days</div></div>
              <div style={{ marginBottom: '0' }}><div style={labelStyle}>Members</div><div style={valueStyle}>{Object.keys(factionData.members || {}).length}</div></div>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'targets' && isInWar && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: cachedAt ? '0.5rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <h3 style={{ margin: 0, color: '#e74c3c', fontSize: '1.5rem' }}>🎯 Target Selection</h3>
              <div 
                onClick={() => setCompareMode(!compareMode)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  backgroundColor: '#333',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  transition: 'all 0.2s',
                  border: `1px solid ${compareMode ? '#e74c3c' : '#444'}`
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
              </div>
            </div>
            <button 
              onClick={handleForceRefresh} 
              disabled={isLoadingTargets} 
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
          </div>
          {cachedAt && !isLoadingTargets && (
            <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '1.5rem' }}>
              ✅ Cached — last fetched {new Date(cachedAt).toLocaleTimeString()}. Click Refresh to update.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(enemyFactionData.members)
                .map(([id, member]) => ({ id, ...member }))
                .sort((a, b) => {
                  const aOkay = a.status.state === 'Okay' ? 0 : 1;
                  const bOkay = b.status.state === 'Okay' ? 0 : 1;
                  if (aOkay !== bOkay) return aOkay - bOkay;
                  return a.level - b.level;
                })
                .map((member) => {
                  const isOkay = member.status.state === 'Okay';
                  const statusColor = isOkay ? '#2ecc71' : member.status.state === 'Hospital' ? '#e74c3c' : member.status.state === 'Jail' ? '#f39c12' : '#3498db';
                  const profile = memberProfiles[member.id] || {};
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
                  return (
                    <a 
                      key={member.id} 
                      href={`https://www.torn.com/profiles.php?XID=${member.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="dashboard-card-link"
                      style={{ borderRadius: '8px' }}
                    >
                      <div style={{ padding: '16px', backgroundColor: '#222', borderRadius: '8px', borderLeft: `6px solid ${statusColor}` }}>
                        {/* Main stats row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                          {/* Name + Status */}
                          <div>
                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {member.name}
                            </span>
                            <span style={{ color: '#666', fontSize: '0.85rem', marginLeft: '6px' }}>[{member.id}]</span>
                            <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px' }}>
                              Lvl {member.level} • Last: {member.last_action?.relative || 'Unknown'}
                            </div>
                            <div style={{ marginTop: '4px' }}>
                              <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '0.9rem' }}>{member.status.state}</span>
                              <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '6px' }}>{member.status.description?.replace(/<[^>]+>/g, '')}</span>
                            </div>
                          </div>
                          {/* Days Playing */}
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
                          {/* Attack / Defend record */}
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
                          {/* Win Rate */}
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

                        {/* Activity strip */}
                        {hasProfile && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                            {[
                              { 
                                label: '🔪 Crimes', 
                                value: criminalOffenses, 
                                color: '#e67e22',
                                own: userData.personalstats?.criminaloffenses || 0
                              },
                              { 
                                label: '💊 Drugs', 
                                value: drugsUsed, 
                                color: '#9b59b6',
                                own: userData.personalstats?.drugsused || 0
                              },
                              { 
                                label: '⚡ Refills', 
                                value: totalRefills, 
                                color: '#3498db',
                                own: (userData.personalstats?.refills || 0) + (userData.personalstats?.nerverefills || 0) + (userData.personalstats?.tokenrefills || 0)
                              },
                              { 
                                label: '💉 Boosters', 
                                value: boostersUsed, 
                                color: '#2ecc71',
                                own: userData.personalstats?.boostersused || 0
                              },
                            ].map(({ label, value, color, own }) => {
                              const diff = value - own;
                              const diffStr = diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
                              const diffColor = diff > 0 ? '#e74c3c' : diff < 0 ? '#2ecc71' : '#888';

                              return (
                                <span key={label} style={{
                                  backgroundColor: '#1a1a1a',
                                  border: `1px solid ${color}44`,
                                  color: '#ccc',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}>
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
                })
              }
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>No targets found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FactionWar;
