import React from 'react';

const FactionWar = ({ factionData }) => {
  if (!factionData) {
    return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading Faction Data...</div>;
  }

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

  const rankedWars = factionData.ranked_wars || {};
  const activeWars = Object.values(rankedWars);
  const isInWar = activeWars.length > 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800' }}>
          <a href={`https://www.torn.com/factions.php?step=profile&ID=${factionData.ID}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{factionData.name}</a> <span style={{ color: '#666', fontSize: '1.5rem' }}>[{factionData.tag}]</span>
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

      {isInWar ? (
        activeWars.map((war, index) => {
          const factionsEntries = Object.entries(war.factions || {}).map(([id, f]) => ({ id, ...f }));

          const ourFactionInfo = factionsEntries.find(f => f.name === factionData.name) || {};
          const ourFactionScore = ourFactionInfo.score || 0;

          const enemyFactionInfo = factionsEntries.find(f => f.name !== factionData.name) || {};
          const enemyFactionId = enemyFactionInfo.id || '';
          const enemyFactionName = enemyFactionInfo.name || 'Unknown Faction';
          const enemyFactionScore = enemyFactionInfo.score || 0;

          const targetScore = war.war.target || 'N/A';

          return (
            <div key={index} style={{ ...cardStyle, border: '1px solid #e74c3c', background: 'linear-gradient(145deg, #1e1e1e, #2c1a1a)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ marginTop: 0, color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem' }}>
                    ⚔️ Active Ranked War
                  </h3>
                  <p style={{ margin: '4px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    vs <a href={`https://www.torn.com/factions.php?step=profile&ID=${enemyFactionId}`} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>{enemyFactionName}</a>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '2rem', textAlign: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ ...labelStyle, color: '#aaa' }}>
                      <a href={`https://www.torn.com/factions.php?step=profile&ID=${factionData.ID}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{factionData.name}</a>
                    </div>
                    <div style={{ ...valueStyle, fontSize: '2rem', color: '#3498db' }}>{ourFactionScore}</div>
                  </div>
                  <div style={{ alignSelf: 'center', fontSize: '1.5rem', color: '#666', fontWeight: 'bold' }}>-</div>
                  <div>
                    <div style={{ ...labelStyle, color: '#aaa' }}>
                      <a href={`https://www.torn.com/factions.php?step=profile&ID=${enemyFactionId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{enemyFactionName}</a>
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
        })
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
          <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Leader</div><div style={valueStyle}>{factionData.leader !== 0 ? <a href={`https://www.torn.com/profiles.php?XID=${factionData.leader}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db', textDecoration: 'none' }}>{factionData.leader_name} [{factionData.leader}]</a> : 'Unknown'}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Co-Leader</div><div style={valueStyle}>{factionData['co-leader'] !== 0 ? <a href={`https://www.torn.com/profiles.php?XID=${factionData['co-leader']}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db', textDecoration: 'none' }}>{factionData.co_leader_name} [{factionData['co-leader']}]</a> : 'Unknown'}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Age</div><div style={valueStyle}>{factionData.age || 'N/A'} days</div></div>
          <div style={{ marginBottom: '0' }}><div style={labelStyle}>Members</div><div style={valueStyle}>{Object.keys(factionData.members || {}).length}</div></div>
        </div>
      </div>
    </div>
  );
};

export default FactionWar;
