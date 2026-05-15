import React from 'react';
import { useBarTimer } from './useBarTimer';
import { useTravelTimer } from './useTravelTimer';

const UserDashboard = ({ userData, onLogout }) => {
  // Helper to decode HTML entities like &#039;
  const decodeHtml = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const statusColor = userData.status?.color === 'blue' ? '#3498db' : 
                      userData.status?.color === 'red' ? '#e74c3c' : '#2ecc71';

  const cardStyle = {
    backgroundColor: '#1e1e1e',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #333',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
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

  const StatBar = ({ label, current, max, color, timeRemaining, link }) => {
    const content = (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '0.85rem', 
            fontWeight: 'bold', 
            color: '#bbb', 
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.2s ease'
          }}>
            {label}
            {link && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>↗</span>}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#fff' }}>
            {current || 0} / {max || 0}
            {timeRemaining && <span style={{ color: '#888', marginLeft: '8px', fontSize: '0.75rem' }}>{timeRemaining}</span>}
          </span>
        </div>
        <div style={{ width: '100%', height: '10px', backgroundColor: '#333', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${Math.min(100, ((current || 0) / (max || 1)) * 100)}%`, 
            height: '100%', 
            backgroundColor: color,
            transition: 'width 0.6s cubic-bezier(0.1, 0.7, 1.0, 0.1)',
            boxShadow: `0 0 10px ${color}44`
          }} />
        </div>
      </>
    );

    if (link) {
      return (
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ 
            flex: '1 1 200px', 
            textDecoration: 'none', 
            color: 'inherit',
            display: 'block',
            cursor: 'pointer',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            const labelSpan = e.currentTarget.querySelector('span');
            if (labelSpan) labelSpan.style.color = color;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            const labelSpan = e.currentTarget.querySelector('span');
            if (labelSpan) labelSpan.style.color = '#bbb';
          }}
        >
          {content}
        </a>
      );
    }

    return (
      <div style={{ flex: '1 1 200px' }}>
        {content}
      </div>
    );
  };

  const isTraveling = userData.status?.state === 'Traveling';
  const isHospitalized = userData.status?.state === 'Hospital';
  const isJailed = userData.status?.state === 'Jail';

  const landingUntil = userData.travel?.timestamp || userData.status?.until;
  const travelTimeLeft = useTravelTimer(landingUntil);

  const statusUntil = userData.status?.until;
  const statusTimeLeft = useTravelTimer((isHospitalized || isJailed) ? statusUntil : 0);

  const formatReleaseTime = (ts) => ts > 0 
    ? new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const landingTime = formatReleaseTime(landingUntil);
  const releaseTime = formatReleaseTime(statusUntil);

  const lifeTime = useBarTimer(userData.life);
  const energyTime = useBarTimer(userData.energy);
  const nerveTime = useBarTimer(userData.nerve);
  const happyTime = useBarTimer(userData.happy);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800' }}>
            {userData.name} <a 
              href={`https://www.torn.com/profiles.php?XID=${userData.player_id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#666', fontSize: '1.5rem', textDecoration: 'none' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#3498db'}
              onMouseOut={(e) => e.currentTarget.style.color = '#666'}
            >[{userData.player_id}]</a>
          </h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ backgroundColor: '#333', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem' }}>
              Level {userData.level}
            </span>
            <span style={{ color: statusColor, fontWeight: 'bold' }}>
              ● {userData.status?.description}
            </span>
            <a 
              href="https://www.torn.com/index.php" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                marginLeft: '10px', 
                fontSize: '0.8rem', 
                color: '#888', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid #444',
                padding: '2px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#3498db';
                e.currentTarget.style.color = '#3498db';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#444';
                e.currentTarget.style.color = '#888';
              }}
            >
              TORN Home ↗
            </a>
          </div>
        </div>
        <button 
          onClick={onLogout} 
          style={{ padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Logout
        </button>
      </header>

      {/* Status Bars Section */}
      <div style={{ ...cardStyle, marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <StatBar 
          label="Life" 
          current={userData.life?.current} 
          max={userData.life?.maximum} 
          color="#2ecc71" 
          timeRemaining={lifeTime} 
          link="https://www.torn.com/hospital.php"
        />
        <StatBar 
          label="Energy" 
          current={userData.energy?.current} 
          max={userData.energy?.maximum} 
          color="#f1c40f" 
          timeRemaining={energyTime} 
          link="https://www.torn.com/gym.php"
        />
        <StatBar 
          label="Nerve" 
          current={userData.nerve?.current} 
          max={userData.nerve?.maximum} 
          color="#e74c3c" 
          timeRemaining={nerveTime} 
          link="https://www.torn.com/crimes.php"
        />
        <StatBar 
          label="Happy" 
          current={userData.happy?.current} 
          max={userData.happy?.maximum} 
          color="#3498db" 
          timeRemaining={happyTime} 
          link="https://www.torn.com/properties.php"
        />
      </div>

      {/* Travel Information Section */}
      {isTraveling && (
        <a 
          href="https://www.torn.com/index.php" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            textDecoration: 'none', 
            color: 'inherit', 
            display: 'block',
            transition: 'transform 0.2s ease, filter 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          <div style={{ ...cardStyle, marginBottom: '2rem', border: '1px solid #3498db', background: 'linear-gradient(145deg, #1e1e1e, #1a2a3a)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginTop: 0, color: '#3498db', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  ✈️ Travel Manifest
                </h3>
                <p style={{ margin: '4px 0', fontSize: '1.1rem' }}>{userData.status?.description}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={labelStyle}>Time Remaining</div>
                <div style={{ ...valueStyle, fontSize: '1.8rem', color: '#3498db' }}>
                  {travelTimeLeft || 'Arriving soon...'}
                </div>
                {landingTime && (
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>
                    Estimated landing at {landingTime}
                  </div>
                )}
              </div>
            </div>
          </div>
        </a>
      )}

      {/* Hospital Information Section */}
      {isHospitalized && (
        <a 
          href="https://www.torn.com/hospital.php" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            textDecoration: 'none', 
            color: 'inherit', 
            display: 'block',
            transition: 'transform 0.2s ease, filter 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          <div style={{ ...cardStyle, marginBottom: '2rem', border: '1px solid #e74c3c', background: 'linear-gradient(145deg, #1e1e1e, #2c1a1a)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginTop: 0, color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🏥 Medical Report
                </h3>
                <p style={{ margin: '4px 0', fontSize: '1.1rem' }}>{userData.status?.description}</p>
                {userData.status?.details && <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#aaa' }}>{userData.status.details}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={labelStyle}>Recovery Time</div>
                <div style={{ ...valueStyle, fontSize: '1.8rem', color: '#e74c3c' }}>
                  {statusTimeLeft || 'Discharging...'}
                </div>
                {releaseTime && (
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>
                    Estimated discharge at {releaseTime}
                  </div>
                )}
              </div>
            </div>
          </div>
        </a>
      )}

      {/* Jail Information Section */}
      {isJailed && (
        <a 
          href="https://www.torn.com/jailview.php" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            textDecoration: 'none', 
            color: 'inherit', 
            display: 'block',
            transition: 'transform 0.2s ease, filter 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          <div style={{ ...cardStyle, marginBottom: '2rem', border: '1px solid #f39c12', background: 'linear-gradient(145deg, #1e1e1e, #2c241a)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginTop: 0, color: '#f39c12', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  ⚖️ Incarceration Status
                </h3>
                <p style={{ margin: '4px 0', fontSize: '1.1rem' }}>{userData.status?.description}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={labelStyle}>Time Until Release</div>
                <div style={{ ...valueStyle, fontSize: '1.8rem', color: '#f39c12' }}>
                  {statusTimeLeft || 'Processing...'}
                </div>
                {releaseTime && (
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>
                    Estimated release at {releaseTime}
                  </div>
                )}
              </div>
            </div>
          </div>
        </a>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Information Cards */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: '#3498db' }}>General Information</h3>
          <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Rank</div><div style={valueStyle}>{userData.rank}</div></div>
          <div style={{ marginBottom: '12px' }}>
            <div style={labelStyle}>Property</div>
            <div style={valueStyle}>
              <a 
                href="https://www.torn.com/properties.php" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseOver={(e) => e.currentTarget.style.color = '#3498db'}
                onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}
              >
                {userData.property}
              </a>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}><div style={labelStyle}>Age / Signup</div><div style={valueStyle}>{userData.age} days (Signed up {userData.signup?.split(' ')[0]})</div></div>
          <div style={{ marginBottom: '0' }}><div style={labelStyle}>Last Action</div><div style={valueStyle}>{userData.last_action?.relative}</div></div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: '#3498db' }}>Occupation & Social</h3>
          <div style={{ marginBottom: '12px' }}>
            <div style={labelStyle}>Job</div>
            <div style={valueStyle}>
              <a 
                href={userData.job?.company_id ? "https://www.torn.com/companies.php" : "https://www.torn.com/job.php"} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseOver={(e) => e.currentTarget.style.color = '#3498db'}
                onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}
              >
                {userData.job?.position} at {decodeHtml(userData.job?.company_name || 'None')}
              </a>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={labelStyle}>Faction</div>
            <div style={valueStyle}>
              <a 
                href={`https://www.torn.com/factions.php?step=profile&ID=${userData.faction?.faction_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseOver={(e) => e.currentTarget.style.color = '#3498db'}
                onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}
              >
                {userData.faction?.faction_name} [{userData.faction?.faction_tag}]
              </a>
            </div>
          </div>
          <div style={{ marginBottom: '0' }}>
            <div style={labelStyle}>Marital Status</div>
            <div style={valueStyle}>
              {userData.married?.spouse_id ? (
                <a 
                  href={`https://www.torn.com/profiles.php?XID=${userData.married?.spouse_id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#3498db'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}
                >
                  {userData.married?.spouse_name}
                </a>
              ) : userData.married?.spouse_name || 'Single'}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: '#3498db' }}>Achievements</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: '1rem' }}>
            <div><div style={labelStyle}>Awards</div><div style={{ ...valueStyle, fontSize: '1.5rem' }}>{userData.awards}</div></div>
            <div><div style={labelStyle}>Karma</div><div style={{ ...valueStyle, fontSize: '1.5rem' }}>{userData.karma}</div></div>
            <div><div style={labelStyle}>Friends</div><div style={{ ...valueStyle, fontSize: '1.5rem' }}>{userData.friends}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;