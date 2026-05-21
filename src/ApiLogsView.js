import React, { useState, useEffect } from 'react';
import { getApiLogs, getApiCounters, clearLogs, resetLifetimeCounters, subscribeToLogs } from './apiLogger';

const ApiLogsView = () => {
  const [logs, setLogs] = useState(getApiLogs());
  const [counters, setCounters] = useState(getApiCounters());
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    // Subscribe to logs updates
    const unsubscribe = subscribeToLogs(() => {
      setLogs(getApiLogs());
      setCounters(getApiCounters());
    });
    return unsubscribe;
  }, []);

  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to clear the session console logs? This won't reset lifetime stats.")) {
      clearLogs();
    }
  };

  const handleResetLifetime = () => {
    if (window.confirm("Are you sure you want to reset all lifetime API call counters?")) {
      resetLifetimeCounters();
    }
  };

  // Helper to format timestamps nicely
  const formatTime = (dateObj) => {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    const pad = (num) => String(num).padStart(2, '0');
    const hrs = pad(date.getHours());
    const mins = pad(date.getMinutes());
    const secs = pad(date.getSeconds());
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hrs}:${mins}:${secs}.${ms}`;
  };

  // Filter logs based on search term, service, and status
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.errorMsg && log.errorMsg.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesService = serviceFilter === 'ALL' || log.type === serviceFilter;
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesService && matchesStatus;
  });

  // Calculate latency colors
  const getLatencyColor = (ms) => {
    if (!ms && ms !== 0) return '#666';
    if (ms < 200) return '#2ecc71'; // Green for fast
    if (ms < 1000) return '#f39c12'; // Yellow for moderate
    return '#e74c3c'; // Red for slow
  };

  return (
    <div className="api-logs-container" style={{ animation: 'fadeIn 0.5s ease-in', color: '#e0e0e0', width: '100%' }}>
      {/* Injected styling for premium UI effects */}
      <style>{`
        .api-logs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .api-card {
          background: linear-gradient(145deg, #1b1e24 0%, #111317 100%);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #222;
          box-shadow: 0 4px 15px rgba(0,0,0,0.4);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .api-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
        }
        .api-card-torn::before { background: #3498db; }
        .api-card-yata::before { background: #2ecc71; }
        .api-card-firebase::before { background: #f39c12; }
        
        .api-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.5);
          border-color: #333;
        }
        .api-card-torn:hover { border-color: rgba(52, 152, 219, 0.4); }
        .api-card-yata:hover { border-color: rgba(46, 204, 113, 0.4); }
        .api-card-firebase:hover { border-color: rgba(243, 156, 18, 0.4); }

        .api-card-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #888;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .api-card-number {
          font-size: 2.2rem;
          font-weight: 800;
          color: #fff;
          margin: 10px 0;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .api-card-unit {
          font-size: 0.8rem;
          font-weight: 500;
          color: #666;
        }
        .api-card-stats {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #222;
          padding-top: 12px;
          margin-top: 12px;
          font-size: 0.8rem;
        }
        .console-container {
          background-color: #111317;
          border: 1px solid #222;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .console-header {
          background-color: #171a21;
          padding: 16px 20px;
          border-bottom: 1px solid #222;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }
        .console-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .console-input {
          padding: 8px 14px;
          background: #1e222b;
          border: 1px solid #2d323f;
          border-radius: 6px;
          color: #fff;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .console-input:focus {
          border-color: #3498db;
        }
        .console-select {
          padding: 8px 12px;
          background: #1e222b;
          border: 1px solid #2d323f;
          border-radius: 6px;
          color: #fff;
          font-size: 0.85rem;
          outline: none;
          cursor: pointer;
        }
        .console-btn {
          background: transparent;
          border: 1px solid #444;
          border-radius: 6px;
          padding: 8px 14px;
          color: #888;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .console-btn-danger:hover {
          border-color: #e74c3c;
          color: #e74c3c;
          background: rgba(231, 76, 60, 0.05);
        }
        .console-btn-primary:hover {
          border-color: #3498db;
          color: #3498db;
          background: rgba(52, 152, 219, 0.05);
        }
        .console-table-wrapper {
          max-height: 480px;
          overflow-y: auto;
        }
        .console-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Consolas', 'Courier New', Courier, monospace;
          font-size: 0.82rem;
          text-align: left;
        }
        .console-th {
          background-color: #171a21;
          color: #555;
          padding: 10px 15px;
          border-bottom: 2px solid #222;
          font-weight: bold;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .console-tr {
          border-bottom: 1px solid #1a1c23;
          transition: background-color 0.15s;
        }
        .console-tr:hover {
          background-color: #171a21;
        }
        .console-td {
          padding: 10px 15px;
          vertical-align: top;
          word-break: break-all;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: bold;
          text-transform: uppercase;
        }
        .badge-torn { background-color: rgba(52, 152, 219, 0.15); color: #3498db; border: 1px solid rgba(52, 152, 219, 0.2); }
        .badge-yata { background-color: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.2); }
        .badge-firebase { background-color: rgba(243, 156, 18, 0.15); color: #f39c12; border: 1px solid rgba(243, 156, 18, 0.2); }
        
        .badge-success { background-color: rgba(46, 204, 113, 0.1); color: #2ecc71; }
        .badge-error { background-color: rgba(231, 76, 60, 0.1); color: #e74c3c; }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }
        .pulse-blue { background-color: #3498db; animation: pulse-blue-anim 2s infinite; }
        .pulse-green { background-color: #2ecc71; animation: pulse-green-anim 2s infinite; }
        .pulse-orange { background-color: #f39c12; animation: pulse-orange-anim 2s infinite; }

        @keyframes pulse-blue-anim {
          0% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.6); }
          70% { box-shadow: 0 0 0 6px rgba(52, 152, 219, 0); }
          100% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
        }
        @keyframes pulse-green-anim {
          0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.6); }
          70% { box-shadow: 0 0 0 6px rgba(46, 204, 113, 0); }
          100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
        }
        @keyframes pulse-orange-anim {
          0% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.6); }
          70% { box-shadow: 0 0 0 6px rgba(243, 156, 18, 0); }
          100% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0); }
        }
      `}</style>

      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '1.6rem', color: '#fff' }}>API Monitor Console</h2>
        <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>
          Real-time diagnostics and analysis of external requests dispatched by the application interface.
        </p>
      </div>

      {/* Counters Grid */}
      <div className="api-logs-grid">
        {/* TORN Card */}
        <div className="api-card api-card-torn">
          <div className="api-card-title">
            <span>TORN API</span>
            <span className="pulse-dot pulse-blue"></span>
          </div>
          <div className="api-card-number">
            {counters.session.TORN}
            <span className="api-card-unit">Session Calls</span>
          </div>
          <div className="api-card-stats">
            <span style={{ color: '#666' }}>Lifetime cumulative:</span>
            <span style={{ fontWeight: 'bold', color: '#3498db' }}>{counters.lifetime.TORN.toLocaleString()}</span>
          </div>
        </div>

        {/* YATA Card */}
        <div className="api-card api-card-yata">
          <div className="api-card-title">
            <span>YATA API</span>
            <span className="pulse-dot pulse-green"></span>
          </div>
          <div className="api-card-number">
            {counters.session.YATA}
            <span className="api-card-unit">Session Calls</span>
          </div>
          <div className="api-card-stats">
            <span style={{ color: '#666' }}>Lifetime cumulative:</span>
            <span style={{ fontWeight: 'bold', color: '#2ecc71' }}>{counters.lifetime.YATA.toLocaleString()}</span>
          </div>
        </div>

        {/* Firebase Card */}
        <div className="api-card api-card-firebase">
          <div className="api-card-title">
            <span>Firebase Queries</span>
            <span className="pulse-dot pulse-orange"></span>
          </div>
          <div className="api-card-number">
            {counters.session.Firebase}
            <span className="api-card-unit">Session Queries</span>
          </div>
          <div className="api-card-stats">
            <span style={{ color: '#666' }}>Lifetime cumulative:</span>
            <span style={{ fontWeight: 'bold', color: '#f39c12' }}>{counters.lifetime.Firebase.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Developer Log Console */}
      <div className="console-container">
        <div className="console-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Diagnostics Console
            </span>
            <span style={{
              background: '#222',
              color: '#888',
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600'
            }}>
              {filteredLogs.length} logged
            </span>
          </div>
          <div className="console-controls">
            <input 
              type="text" 
              placeholder="Filter endpoint/error..." 
              className="console-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '180px' }}
            />
            <select 
              className="console-select"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              <option value="ALL">All Services</option>
              <option value="TORN">TORN API</option>
              <option value="YATA">YATA API</option>
              <option value="Firebase">Firebase</option>
            </select>
            <select 
              className="console-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="ERROR">Error</option>
            </select>
            <button className="console-btn console-btn-primary" onClick={handleClearLogs} title="Clear screen">
              CLEAR
            </button>
            <button className="console-btn console-btn-danger" onClick={handleResetLifetime} title="Reset Lifetime counters">
              RESET STATS
            </button>
          </div>
        </div>

        <div className="console-table-wrapper">
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#555', fontStyle: 'italic', fontSize: '0.85rem' }}>
              -- No matching requests logged in this session --
            </div>
          ) : (
            <table className="console-table">
              <thead>
                <tr>
                  <th className="console-th" style={{ width: '120px' }}>Timestamp</th>
                  <th className="console-th" style={{ width: '100px' }}>Service</th>
                  <th className="console-th">Endpoint / Request Action</th>
                  <th className="console-th" style={{ width: '90px' }}>Status</th>
                  <th className="console-th" style={{ width: '80px', textAlign: 'right' }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="console-tr">
                    <td className="console-td" style={{ color: '#68707f', whiteSpace: 'nowrap' }}>
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="console-td">
                      <span className={`badge badge-${log.type.toLowerCase()}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="console-td" style={{ color: log.status === 'ERROR' ? '#ff6b6b' : '#c5c9db', lineHeight: '1.4' }}>
                      <div style={{ wordBreak: 'break-all' }}>{log.action}</div>
                      {log.status === 'ERROR' && log.errorMsg && (
                        <div style={{ 
                          marginTop: '6px', 
                          padding: '6px 10px', 
                          background: 'rgba(231, 76, 60, 0.1)', 
                          borderLeft: '2px solid #e74c3c',
                          color: '#e74c3c',
                          fontFamily: 'sans-serif',
                          fontSize: '0.78rem',
                          borderRadius: '0 4px 4px 0'
                        }}>
                          {log.errorMsg}
                        </div>
                      )}
                    </td>
                    <td className="console-td">
                      <span className={`badge badge-${log.status.toLowerCase()}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="console-td" style={{ textAlign: 'right', fontWeight: 'bold', color: getLatencyColor(log.duration), whiteSpace: 'nowrap' }}>
                      {log.duration !== undefined ? `${log.duration}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiLogsView;
