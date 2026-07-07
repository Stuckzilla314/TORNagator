import React, { useState, useEffect, useCallback, useRef } from 'react';
import { isCapacitor } from './utils';

const CACHE_KEY = 'tornagator_bazaar_marketplace_cache';
const VISITED_KEY = 'tornagator_bazaar_visited';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const fmt = (n) => (n != null ? '$' + Number(n).toLocaleString() : 'N/A');

/**
 * Renders the Bazaar Search tab, allowing users to browse all Torn marketplace items,
 * search by name, and navigate to the cheapest available bazaar listing for any item.
 *
 * @param {Object} props
 * @param {Function} props.onOpenInTorn - Callback to open a URL in the TORN webview/tab.
 * @returns {React.JSX.Element}
 */
const BazaarSearch = ({ onOpenInTorn }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [lastFetched, setLastFetched] = useState(null);
  // Map of item_id -> 'loading' | null for the buy button per card
  const [buyingId, setBuyingId] = useState(null);
  const searchInputRef = useRef(null);

  // ── Fetch marketplace ──────────────────────────────────────────────────────

  const fetchMarketplace = useCallback(async (force = false) => {
    // Try cache first
    if (!force) {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, timestamp } = JSON.parse(raw);
          if (Date.now() - timestamp < CACHE_TTL_MS) {
            setItems(data);
            setLastFetched(timestamp);
            return;
          }
        }
      } catch (_) { /* ignore */ }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://weav3r.dev/api/marketplace');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json.items || [];
      const now = Date.now();
      setItems(data);
      setLastFetched(now);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: now }));
      } catch (_) { /* quota */ }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchMarketplace(false);
  }, [fetchMarketplace]);

  // ── Buy from Bazaar ────────────────────────────────────────────────────────

  const handleBuy = useCallback(async (item) => {
    if (!item.item_id || item.item_id < 0 || !item.total_bazaars) return;
    const itemId = item.item_id;
    setBuyingId(itemId);
    try {
      const res = await fetch(`https://weav3r.dev/api/marketplace/${itemId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const listings = json.listings || [];

      if (!listings.length) {
        alert('No bazaar listings found for this item.');
        return;
      }

      // ── Rotation logic (mirrors museum page) ──
      let visited = {};
      try { visited = JSON.parse(localStorage.getItem(VISITED_KEY) || '{}'); } catch (_) { visited = {}; }
      const now = Date.now();
      const TEN_MIN = 10 * 60 * 1000;

      const available = listings.filter(l => {
        if (!l.player_id) return false;
        const t = visited[`${itemId}_${l.player_id}`];
        return !t || (now - t) >= TEN_MIN;
      });

      let selected = null;
      if (available.length > 0) {
        selected = available[0];
      } else {
        // All visited — reset for this item
        listings.forEach(l => {
          if (l.player_id) delete visited[`${itemId}_${l.player_id}`];
        });
        selected = listings[0];
      }

      if (!selected?.player_id) {
        alert('Could not find a seller ID in bazaar listings.');
        return;
      }

      // Mark as visited, clean stale entries
      visited[`${itemId}_${selected.player_id}`] = now;
      for (const k in visited) {
        if (now - visited[k] > TEN_MIN) delete visited[k];
      }
      try { localStorage.setItem(VISITED_KEY, JSON.stringify(visited)); } catch (_) { /* quota */ }

      const url = `https://www.torn.com/bazaar.php?userId=${selected.player_id}#/`;
      if (onOpenInTorn) {
        onOpenInTorn(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      alert('Failed to fetch bazaar listings: ' + err.message);
    } finally {
      setBuyingId(null);
    }
  }, [onOpenInTorn]);

  // ── Filtered items ─────────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(it => it.item_name?.toLowerCase().includes(q));
  }, [items, search]);

  // ── Styles ─────────────────────────────────────────────────────────────────

  const inputStyle = {
    padding: '10px 14px',
    backgroundColor: '#1c1c1e',
    color: 'white',
    border: '1px solid #2c2c2e',
    borderRadius: '8px',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  };

  const badgeStyle = (color, bg) => ({
    fontSize: '0.65rem',
    color,
    fontWeight: 'bold',
    backgroundColor: bg,
    padding: '2px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>

      {/* ── Header ── */}
      {isCapacitor ? (
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{
              margin: 0, fontSize: '1.4rem', fontWeight: '800',
              background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              Bazaar Search
            </h2>
            <button
              onClick={() => fetchMarketplace(true)}
              disabled={loading}
              style={{
                background: 'transparent',
                border: `1px solid ${loading ? '#222' : '#444'}`,
                borderRadius: '20px',
                padding: '6px 14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: loading ? '#666' : '#3498db',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontWeight: '700', fontSize: '0.75rem', letterSpacing: '1px',
                transition: 'all 0.3s ease', opacity: loading ? 0.6 : 1
              }}
            >
              <span>{loading ? 'SYNCING...' : 'SYNC'}</span>
              <span>🔄</span>
            </button>
          </div>
          {lastFetched && (
            <span style={{ fontSize: '0.65rem', color: '#666' }}>
              Last Sync: {new Date(lastFetched).toLocaleTimeString()}
            </span>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>Bazaar Search</h2>
            {lastFetched && (
              <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: '4px' }}>
                Last Sync: {new Date(lastFetched).toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={() => fetchMarketplace(true)}
            disabled={loading}
            style={{
              background: 'transparent',
              border: `1px solid ${loading ? '#222' : '#444'}`,
              borderRadius: '20px', padding: '4px 12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: loading ? '#666' : '#3498db',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontWeight: '600', fontSize: '0.75rem', letterSpacing: '1px',
              transition: 'all 0.3s ease', opacity: loading ? 0.6 : 1
            }}
          >
            <span>{loading ? 'SYNCING...' : 'SYNC'}</span>
            <span>🔄</span>
          </button>
        </div>
      )}

      {/* ── Search bar ── */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
          aria-label="Search bazaar items"
        />
      </div>

      {/* ── Count badge ── */}
      {!loading && !error && (
        <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: '10px' }}>
          {filtered.length.toLocaleString()} item{filtered.length !== 1 ? 's' : ''} shown
          {search && ` for "${search}"`}
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div style={{
          background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)',
          borderRadius: '10px', padding: '16px', marginBottom: '12px',
          color: '#e74c3c', fontSize: '0.85rem'
        }}>
          ⚠️ Failed to load marketplace: {error}
          <button
            onClick={() => fetchMarketplace(true)}
            style={{
              marginLeft: '12px', background: 'transparent',
              border: '1px solid #e74c3c', borderRadius: '12px',
              padding: '3px 10px', color: '#e74c3c',
              cursor: 'pointer', fontSize: '0.75rem'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && items.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              background: 'linear-gradient(145deg, #1e1e1e, #161616)',
              border: '1px solid #2d2d2d', borderRadius: '12px',
              padding: '14px', height: '96px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          ))}
        </div>
      )}

      {/* ── Item cards ── */}
      {!loading || items.length > 0 ? (
        isCapacitor ? (
          /* ─ Mobile cards ─ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(item => {
              const canBuy = item.item_id > 0 && item.total_bazaars > 0 && item.lowest_price != null;
              const isLoading = buyingId === item.item_id;
              return (
                <div
                  key={item.item_id}
                  style={{
                    background: 'linear-gradient(145deg, #1e1e1e 0%, #131313 100%)',
                    border: '1px solid #2d2d2d',
                    borderRadius: '12px',
                    padding: '14px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    position: 'relative'
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.item_id > 0 && (
                      <img
                        src={`https://www.torn.com/images/items/${item.item_id}/large.png`}
                        alt={item.item_name}
                        style={{ width: '38px', height: '38px', objectFit: 'contain', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.item_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={badgeStyle('#3498db', 'rgba(52,152,219,0.15)')}>ID: {item.item_id}</span>
                        <span style={badgeStyle(
                          item.total_bazaars > 0 ? '#2ecc71' : '#888',
                          item.total_bazaars > 0 ? 'rgba(46,204,113,0.12)' : 'transparent'
                        )}>
                          {item.total_bazaars > 0 ? `${item.total_bazaars.toLocaleString()} bazaars` : 'No bazaars'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px', borderTop: '1px solid #282828',
                    borderBottom: '1px solid #282828', padding: '8px 0'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Market</div>
                      <div style={{ fontSize: '0.78rem', color: '#f39c12', fontWeight: 'bold', marginTop: '1px' }}>
                        {fmt(item.market_price)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Baz Avg</div>
                      <div style={{ fontSize: '0.78rem', color: item.bazaar_average ? '#3498db' : '#555', fontWeight: 'bold', marginTop: '1px' }}>
                        {fmt(item.bazaar_average)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Lowest</div>
                      <div style={{ fontSize: '0.78rem', color: item.lowest_price ? '#2ecc71' : '#555', fontWeight: 'bold', marginTop: '1px' }}>
                        {fmt(item.lowest_price)}
                      </div>
                    </div>
                  </div>

                  {/* Buy button */}
                  <button
                    onClick={() => canBuy && !isLoading && handleBuy(item)}
                    disabled={!canBuy || isLoading}
                    style={{
                      width: '100%',
                      padding: '9px',
                      borderRadius: '8px',
                      border: 'none',
                      background: canBuy
                        ? (isLoading ? 'rgba(52,152,219,0.2)' : 'linear-gradient(135deg, rgba(52,152,219,0.25) 0%, rgba(41,128,185,0.15) 100%)')
                        : 'rgba(50,50,50,0.5)',
                      color: canBuy ? '#3498db' : '#555',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: canBuy && !isLoading ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      transition: 'all 0.2s ease',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: canBuy ? 'rgba(52,152,219,0.3)' : '#333',
                    }}
                    aria-label={`Buy ${item.item_name} from bazaar`}
                  >
                    {isLoading ? (
                      <>⏳ Finding seller…</>
                    ) : canBuy ? (
                      <>🛒 Buy from Bazaar</>
                    ) : (
                      <>🚫 No Listings</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─ Desktop table ─ */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Item', 'Market Price', 'Bazaar Avg', 'Lowest Price', 'Bazaars', ''].map(h => (
                    <th key={h} style={{
                      textAlign: h === '' ? 'center' : 'left',
                      padding: '12px 15px',
                      backgroundColor: '#252525', color: '#888',
                      fontSize: '0.75rem', fontWeight: 'bold',
                      textTransform: 'uppercase', borderBottom: '2px solid #333',
                      whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const canBuy = item.item_id > 0 && item.total_bazaars > 0 && item.lowest_price != null;
                  const isLoading = buyingId === item.item_id;
                  return (
                    <tr key={item.item_id} style={{ borderBottom: '1px solid #1e1e1e' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '11px 15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {item.item_id > 0 && (
                            <img
                              src={`https://www.torn.com/images/items/${item.item_id}/large.png`}
                              alt={item.item_name}
                              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: '600', color: '#e0e0e0' }}>{item.item_name}</div>
                            <div style={{ fontSize: '0.65rem', color: '#555' }}>ID: {item.item_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 15px', color: '#f39c12', fontWeight: 'bold' }}>{fmt(item.market_price)}</td>
                      <td style={{ padding: '11px 15px', color: item.bazaar_average ? '#3498db' : '#444' }}>{fmt(item.bazaar_average)}</td>
                      <td style={{ padding: '11px 15px', color: item.lowest_price ? '#2ecc71' : '#444', fontWeight: item.lowest_price ? 'bold' : 'normal' }}>{fmt(item.lowest_price)}</td>
                      <td style={{ padding: '11px 15px', color: item.total_bazaars > 0 ? '#aaa' : '#444' }}>
                        {item.total_bazaars > 0 ? item.total_bazaars.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '11px 15px', textAlign: 'center' }}>
                        <button
                          onClick={() => canBuy && !isLoading && handleBuy(item)}
                          disabled={!canBuy || isLoading}
                          style={{
                            padding: '5px 14px',
                            borderRadius: '14px',
                            border: `1px solid ${canBuy ? 'rgba(52,152,219,0.4)' : '#333'}`,
                            background: canBuy ? 'rgba(52,152,219,0.12)' : 'transparent',
                            color: canBuy ? '#3498db' : '#555',
                            fontWeight: 'bold', fontSize: '0.75rem',
                            cursor: canBuy && !isLoading ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                          aria-label={`Buy ${item.item_name} from bazaar`}
                        >
                          {isLoading ? '⏳' : canBuy ? '🛒 Buy' : '—'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {/* ── Empty state ── */}
      {!loading && !error && filtered.length === 0 && items.length > 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>
          No items match "{search}"
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default BazaarSearch;
