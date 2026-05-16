import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, getDocs, limit, Timestamp, startAfter, doc, getDoc, onSnapshot } from "firebase/firestore";

const COUNTRY_MAP = {
  "Mexico": [1125, 258, 260, 432, 159, 426, 110, 229, 26, 640, 8, 259, 111, 177, 50, 1429, 175, 178, 231, 1499, 230, 63, 11, 20, 31, 99, 107, 108, 399, 409],
  "Cayman Islands": [617, 1482, 618, 620, 626, 614, 623, 613, 622, 621, 624, 619, 615, 612, 616, 625],
  "Canada": [263, 206, 205, 196, 1361, 201, 197, 328, 262, 1484, 253, 402, 645, 410, 252, 413, 1348, 1483, 1504, 261],
  "Hawaii": [264, 265, 243, 419, 241, 240, 242, 420, 421, 430, 1502, 1485, 1486],
  "United Kingdom": [267, 266, 206, 268, 196, 197, 220, 198, 201, 203, 1246, 219, 205, 218, 439, 221, 641, 217, 431, 438, 416, 397, 408, 411, 415, 418, 1501],
  "Argentina": [1488, 269, 199, 1466, 204, 196, 391, 333, 1487, 198, 255, 257, 270, 203, 271, 256, 407, 1503],
  "Switzerland": [272, 198, 1490, 199, 203, 436, 222, 201, 224, 204, 398, 196, 223, 273, 361, 435, 1489, 1491],
  "Japan": [277, 1493, 1492, 1333, 437, 206, 204, 200, 198, 233, 203, 197, 237, 239, 205, 279, 294, 334, 278, 427, 434, 235, 395, 236, 238, 234, 429, 433, 1249],
  "China": [197, 199, 204, 274, 200, 201, 275, 248, 335, 244, 247, 249, 326, 246, 245, 400, 250, 251, 276, 1462, 1494, 1498],
  "UAE": [385, 384, 1264, 1495, 412, 414, 1496, 382, 386, 381, 387, 388],
  "South Africa": [282, 1497, 281, 203, 199, 201, 406, 200, 4, 225, 280, 651, 228, 227, 332, 206, 654, 226, 358, 652, 653, 1500]
};

const TRAVEL_TIMES = {
  "Mexico": 18,
  "Cayman Islands": 25,
  "Canada": 29,
  "Hawaii": 94,
  "United Kingdom": 111,
  "Argentina": 117,
  "Switzerland": 123,
  "Japan": 158,
  "China": 169,
  "UAE": 201,
  "South Africa": 208
};

const YATA_COUNTRY_CODES = {
  "Mexico": "mex",
  "Cayman Islands": "cay",
  "Canada": "can",
  "Hawaii": "haw",
  "United Kingdom": "uni",
  "Argentina": "arg",
  "Switzerland": "swi",
  "Japan": "jap",
  "China": "chi",
  "UAE": "uae",
  "South Africa": "sou"
};

// Flatten the IDs from our map into a Set for O(1) lookups during background recording
const TRACKED_ITEM_IDS = new Set(Object.values(COUNTRY_MAP).flat());

const OverseasStock = ({ itemsData, userData, cargoCapacity = 5, autoSyncStock, onManualSync, filter, setFilter }) => {
  const [yataData, setYataData] = useState(null);
  const [loadingYata, setLoadingYata] = useState(false);
  const [timeScale, setTimeScale] = useState(24); // Default to 24h to save space
  const [loadingHistoricalData, setLoadingHistoricalData] = useState(false);
  const [selectedItemForGraph, setSelectedItemForGraph] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'bagProfit', direction: 'desc' });

  // Memoized stocks lookup map for O(1) item lookups
  const stocksLookup = React.useMemo(() => {
    if (!yataData?.stocks) return {};
    const map = {};
    Object.entries(YATA_COUNTRY_CODES).forEach(([country, code]) => {
      if (yataData.stocks[code]?.stocks) {
        yataData.stocks[code].stocks.forEach(s => {
          map[`${country}_${s.id}`] = {
            quantity: s.quantity,
            cost: s.cost,
            update: yataData.stocks[code].update
          };
        });
      }
    });
    return map;
  }, [yataData]);

  // Load cached stock data on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('tornagator_yata_cache');
      if (cached) {
        setYataData(JSON.parse(cached));
      }
    } catch (e) { console.warn("Yata cache restoration failed:", e); }
  }, []);

  const fetchStockData = useCallback(async () => {
    setLoadingYata(true);
    try {
      const snap = await getDoc(doc(db, "stock_metadata", "snapshot"));
      if (snap.exists()) {
        const data = { stocks: snap.data().stocks || {} };
        setYataData(data);
        sessionStorage.setItem('tornagator_yata_cache', JSON.stringify(data));
      }
    } catch (err) {
      if (err.code === 'unavailable' || err.message.includes('offline')) {
        console.warn("Firestore: Client is offline, using cached data if available.");
      } else {
        console.error("Firestore fetch error:", err);
      }
    } finally {
      setLoadingYata(false);
    }
  }, []);

  const handleManualSync = useCallback(() => {
    fetchStockData();
    if (onManualSync) {
      onManualSync();
    }
  }, [fetchStockData, onManualSync]);

  useEffect(() => {
    let unsubscribe = null;

    if (!autoSyncStock) {
      // If auto-sync is off, we do NOT fetch on mount/refresh anymore.
      // Data will only be loaded from cache or manual refresh.
      return;
    }

    setLoadingYata(true);
    unsubscribe = onSnapshot(doc(db, "stock_metadata", "snapshot"),
      (snap) => {
        if (snap.exists()) {
          const data = { stocks: snap.data().stocks || {} };
          setYataData(data);
          sessionStorage.setItem('tornagator_yata_cache', JSON.stringify(data));
        }
        setLoadingYata(false);
      },
      (err) => {
        if (err.code === 'unavailable' || err.message.includes('offline')) {
          console.warn("Firestore: Snapshot unavailable while offline.");
        } else {
          console.error("Firestore snapshot error:", err);
        }
        setLoadingYata(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [autoSyncStock]);

  // State for historical data, now managed locally
  const [fullHistory, setFullHistory] = useState([]);
  const [graphError, setGraphError] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedItemForGraph) {
        setFullHistory([]);
        return;
      }

      setLoadingHistoricalData(true);
      setGraphError(null);
      const nowMs = Date.now();
      // Always fetch the maximum possible range (7 days) to allow local sliding
      const maxWindowHours = 168; 
      const windowStart = Math.floor((nowMs - (maxWindowHours * 60 * 60 * 1000)) / 1000);

      try {
        const seedQuery = query(
          collection(db, "stock_history"),
          where("itemId", "==", Number(selectedItemForGraph.id)),
          where("country", "==", selectedItemForGraph.country),
          where("timestamp", "<", windowStart),
          orderBy("timestamp", "desc"),
          limit(1)
        );

        const windowQuery = query(
          collection(db, "stock_history"),
          where("itemId", "==", Number(selectedItemForGraph.id)),
          where("country", "==", selectedItemForGraph.country),
          where("timestamp", ">=", windowStart),
          orderBy("timestamp", "asc")
        );

        const [seedSnap, windowSnap] = await Promise.all([
          getDocs(seedQuery),
          getDocs(windowQuery)
        ]);

        let history = windowSnap.docs.map(doc => ({
          timestamp: doc.data().timestamp * 1000,
          stock: doc.data().stock
        }));

        if (!seedSnap.empty) {
          const seedData = seedSnap.docs[0].data();
          history = [
            {
              timestamp: windowStart * 1000,
              stock: seedData.stock,
              isSeed: true
            },
            ...history
          ];
        }

        if (history.length === 0 && selectedItemForGraph.stockQuantity !== undefined) {
          history = [
            {
              timestamp: windowStart * 1000,
              stock: selectedItemForGraph.stockQuantity,
              isFallback: true
            }
          ];
        }

        setFullHistory(history);
      } catch (err) {
        console.error("Firestore Query Error:", err.message, err);
        if (err.message?.includes('index')) {
          setGraphError("Database index is building or missing. Check the browser console for the direct creation link.");
        } else {
          setGraphError(`Error: ${err.message}`);
        }
      } finally {
        setLoadingHistoricalData(false);
      }
    };

    loadHistory();
  }, [selectedItemForGraph]);

  // Locally filter and prepare data for the graph based on the current timeScale
  const historicalData = React.useMemo(() => {
    if (fullHistory.length === 0) return [];
    
    const nowMs = Date.now();
    const windowStartMs = nowMs - (timeScale * 60 * 60 * 1000);
    
    // 1. Find the points within the visible window
    let visiblePoints = fullHistory.filter(p => p.timestamp >= windowStartMs);
    
    // 2. To ensure a continuous line from the left edge, find the last point 
    // BEFORE the window start and "drag" its value to the window start time.
    const lastPointBefore = [...fullHistory].reverse().find(p => p.timestamp < windowStartMs);
    
    let displayHistory = [...visiblePoints];
    
    if (lastPointBefore) {
      displayHistory.unshift({
        timestamp: windowStartMs,
        stock: lastPointBefore.stock,
        isWindowEdge: true
      });
    } else if (displayHistory.length > 0 && displayHistory[0].timestamp > windowStartMs) {
      // If no points before, but first point is after window start, 
      // drag first point back to start (fallback)
      displayHistory.unshift({
        timestamp: windowStartMs,
        stock: displayHistory[0].stock,
        isWindowEdge: true
      });
    }

    // 3. Append a point for "Now" so the line draws all the way to the right edge
    if (displayHistory.length > 0) {
      displayHistory.push({
        timestamp: nowMs,
        stock: displayHistory[displayHistory.length - 1].stock,
        isCurrent: true
      });
    }

    return displayHistory;
  }, [fullHistory, timeScale]);


  const headerStyle = {
    textAlign: 'left',
    padding: '15px',
    backgroundColor: '#252525',
    color: '#888',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    borderBottom: '2px solid #333',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  };

  const cellStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #2a2a2a'
  };

  const getOwnedCount = (itemId) => {
    if (!userData?.inventory || !Array.isArray(userData.inventory)) return 0;
    const item = userData.inventory.find(i => i.id === itemId);
    return item?.amount ?? 0;
  };

  const getStockInfo = useCallback((country, itemId) => {
    return stocksLookup[`${country}_${itemId}`] || null;
  }, [stocksLookup]);

  const processedItems = React.useMemo(() => {
    if (!itemsData) return [];
    
    return Object.entries(COUNTRY_MAP).flatMap(([country, ids]) =>
      ids.map(id => {
        const item = itemsData[id] || {};
        const stockInfo = getStockInfo(country, id);
        const owned = getOwnedCount(id);

        const effectiveBuyPrice = stockInfo?.cost || item.buy_price || 0;
        const profitPerItem = (item.market_value || 0) - effectiveBuyPrice;
        const bagProfit = profitPerItem * cargoCapacity;
        const stockQuantity = stockInfo?.quantity || 0;

        const baseTime = TRAVEL_TIMES[country] || 0;
        let modifier = 1.0;
        const travelMethod = userData?.travel?.method;
        if (travelMethod === 'Business') modifier = 0.3;
        else if (travelMethod === 'Private') modifier = 0.5;
        else if (travelMethod === 'Airstrip') modifier = 0.7;

        const totalRoundTripMinutes = Math.round(baseTime * 2 * modifier);
        const roundTripHours = totalRoundTripMinutes / 60;
        const bagProfitPerHour = roundTripHours > 0 ? bagProfit / roundTripHours : 0;

        const h = Math.floor(totalRoundTripMinutes / 60);
        const m = totalRoundTripMinutes % 60;
        const roundTripDisplay = h > 0 ? `${h}h ${m}m` : `${m}m`;

        return {
          ...item,
          id,
          country,
          owned,
          buy_price: effectiveBuyPrice,
          bagProfit,
          bagProfitPerHour,
          roundTripDisplay,
          profitPerItem,
          stockQuantity,
          stockInfo
        };
      }).filter(item => !!item.name)
    ).filter(item => filter === 'All' || item.country === filter);
  }, [itemsData, stocksLookup, userData, cargoCapacity, filter, getOwnedCount, getStockInfo]);

  const sortedItems = React.useMemo(() => {
    return [...processedItems].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedItems, sortConfig]);

  // Flatten mapping into items with pre-calculated values for sorting
  if (!itemsData) return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>Item data has not been loaded yet.</p>
      <button
        onClick={handleManualSync}
        style={{
          background: 'transparent',
          border: '1px solid #3498db',
          padding: '10px 28px',
          borderRadius: '30px',
          cursor: 'pointer',
          color: '#3498db',
          fontWeight: '600',
          fontSize: '0.85rem',
          letterSpacing: '2px',
          transition: 'all 0.3s ease',
          boxShadow: '0 0 15px rgba(52, 152, 219, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(52, 152, 219, 0.1)';
        }}
      >
        INITIALIZE CATALOG 🔄
      </button>
    </div>
  );

  const requestSort = (key) => {
    let direction = (key === 'name' || key === 'country') ? 'asc' : 'desc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleRowClick = (item) => {
    const totalCost = item.buy_price * cargoCapacity;
    const cashOnHand = userData?.money_onhand || 0;

    if (cashOnHand < totalCost) {
      const confirmed = window.confirm(`⚠️ Low on Cash! \n\nTo buy ${cargoCapacity}x ${item.name}, you need $${totalCost.toLocaleString()}.\nYou only have $${cashOnHand.toLocaleString()} on hand.\n\nDo you want to go to the Travel Agency anyway?`);
      if (!confirmed) return;
    }

    window.open('https://www.torn.com/travelagency.php', '_blank');
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return <span style={{ color: '#444', marginLeft: '8px', fontSize: '0.7rem' }}>↕</span>;
    return sortConfig.direction === 'asc' ?
      <span style={{ color: '#3498db', marginLeft: '8px', fontSize: '0.7rem' }}>▲</span> :
      <span style={{ color: '#3498db', marginLeft: '8px', fontSize: '0.7rem' }}>▼</span>;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>Overseas Item Catalog</h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={handleManualSync}
              disabled={loadingYata}
              style={{
                background: 'transparent',
                border: `1px solid ${loadingYata ? '#222' : '#444'}`,
                borderRadius: '20px',
                padding: '4px 12px',
                cursor: loadingYata ? 'not-allowed' : 'pointer',
                color: loadingYata ? '#666' : '#3498db',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '600',
                fontSize: '0.75rem',
                letterSpacing: '1px',
                transition: 'all 0.3s ease',
                opacity: loadingYata ? 0.6 : 1
              }}
              title="Refresh Stock & Inventory"
            >
              <span style={{ marginTop: '1px' }}>{loadingYata ? 'SYNCING...' : 'SYNC'}</span>
              <span style={{ fontSize: '0.9rem' }}>🔄</span>
            </button>
            {yataData?.stocks && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: '5px' }}>
                  Last Sync: {new Date(Object.values(yataData.stocks)[0]?.update * 1000).toLocaleTimeString()}
                </span>
                {!navigator.onLine && (
                  <span style={{ fontSize: '0.6rem', color: '#f39c12', fontWeight: 'bold' }}>
                    [OFFLINE MODE]
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '8px 15px', backgroundColor: '#333', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
        >
          <option value="All">All Countries</option>
          {Object.keys(COUNTRY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ backgroundColor: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e0e0e0' }}>
          <thead>
            <tr>
              <th style={headerStyle} onClick={() => requestSort('name')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Item Name {renderSortIndicator('name')}
                </div>
              </th>
              <th style={headerStyle} onClick={() => requestSort('country')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Country {renderSortIndicator('country')}
                </div>
              </th>
              <th style={headerStyle} onClick={() => requestSort('owned')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  Owned {renderSortIndicator('owned')}
                </div>
              </th>
              <th style={headerStyle} onClick={() => requestSort('buy_price')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Buy Price {renderSortIndicator('buy_price')}
                </div>
              </th>
              <th style={headerStyle} onClick={() => requestSort('market_value')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Market Value {renderSortIndicator('market_value')}
                </div>
              </th>
              <th style={headerStyle} onClick={() => requestSort('bagProfit')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Bag Profit {renderSortIndicator('bagProfit')}
                </div>
              </th>
              <th style={headerStyle} onClick={() => requestSort('bagProfitPerHour')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Profit/hr {renderSortIndicator('bagProfitPerHour')}
                </div>
              </th>
              <th style={headerStyle} onClick={() => requestSort('stockQuantity')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  Stock {renderSortIndicator('stockQuantity')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(item => {
              const stockInfo = item.stockInfo;
              const buyableQuantity = stockInfo ? Math.min(stockInfo.quantity, cargoCapacity) : 0;

              return (
                <tr
                  key={`${item.country}-${item.id}`}
                  onClick={() => handleRowClick(item)}
                  style={{
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#252525';
                    e.currentTarget.style.transform = 'scale(1.002)';
                    e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(52, 152, 219, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={`https://www.torn.com/images/items/${item.id}/large.png`}
                        alt={item.name}
                        style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                      />
                      <span style={{ fontWeight: '500' }}>{item.name}</span>
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: '#3498db', fontSize: '0.85rem' }}>{item.country}</span>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                      RT: {item.roundTripDisplay}
                    </div>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>
                    {(item.owned || 0).toLocaleString()}
                  </td>
                  <td style={{ ...cellStyle, color: '#2ecc71', fontWeight: 'bold' }}>
                    <div>${(item.buy_price || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'normal', marginTop: '2px' }}>
                      (${(item.buy_price * cargoCapacity).toLocaleString()})
                    </div>
                  </td>
                  <td style={{ ...cellStyle, color: '#f39c12' }}>
                    ${(item.market_value || 0).toLocaleString()}
                  </td>
                  <td style={{ ...cellStyle, color: item.profitPerItem > 0 ? '#2ecc71' : '#e0e0e0' }}>
                    <div style={{ fontWeight: 'bold' }}>
                      ${item.bagProfit.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                      ${item.profitPerItem.toLocaleString()} ea
                    </div>
                  </td>
                  <td style={{ ...cellStyle, color: item.bagProfitPerHour > 0 ? '#2ecc71' : '#e0e0e0', fontWeight: 'bold' }}>
                    ${Math.round(item.bagProfitPerHour).toLocaleString()}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    {loadingYata ? (
                      <span style={{ color: '#666' }}>...</span>
                    ) : stockInfo ? (
                      <div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemForGraph(item);
                          }}
                          style={{
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            color: stockInfo.quantity === 0 ? '#ff4444' : (stockInfo.quantity < cargoCapacity ? '#f39c12' : '#2ecc71'),
                            textDecoration: 'underline',
                            padding: '4px'
                          }}
                          title="Click to view stock history"
                        >
                          {stockInfo.quantity.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                          Total: ${(item.buy_price * buyableQuantity).toLocaleString()} ({buyableQuantity})
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#444' }}>No Data</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sortedItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          No items found for this selection.
        </div>
      )}

      {/* Stock History Popup Overlay */}
      {selectedItemForGraph && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setSelectedItemForGraph(null)}>
          <div style={{
            backgroundColor: '#1e1e1e',
            padding: '30px',
            borderRadius: '12px',
            border: '1px solid #333',
            maxWidth: '800px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedItemForGraph(null)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '1.5rem',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, color: '#3498db', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Stock History: {selectedItemForGraph.name}</span>
              {(() => {
                // Simple restock prediction logic
                if (historicalData.length < 2) return null;
                
                const restocks = [];
                for (let i = 1; i < historicalData.length; i++) {
                  // A restock is when stock goes from 0 to > 0
                  if (historicalData[i-1].stock === 0 && historicalData[i].stock > 0) {
                    restocks.push(historicalData[i].timestamp);
                  }
                }

                if (restocks.length < 2) return null;

                const intervals = [];
                for (let i = 1; i < restocks.length; i++) {
                  intervals.push(restocks[i] - restocks[i-1]);
                }

                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                const lastRestock = restocks[restocks.length - 1];
                const nextExpected = lastRestock + avgInterval;
                const timeLeft = nextExpected - Date.now();

                if (timeLeft < 0) return <span style={{ fontSize: '0.8rem', color: '#f39c12' }}>Restock Overdue ⏳</span>;

                const minutes = Math.floor(timeLeft / 60000);
                const hours = Math.floor(minutes / 60);
                const displayTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

                return (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#2ecc71' }}>Expected Restock: ~{displayTime}</div>
                    <div style={{ fontSize: '0.6rem', color: '#666' }}>Based on {restocks.length} events</div>
                  </div>
                );
              })()}
            </h3>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>Country: {selectedItemForGraph.country}</p>

            {loadingHistoricalData ? (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Loading historical data...
              </div>
            ) : graphError ? (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4444', textAlign: 'center' }}>{graphError}</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={historicalData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={[Date.now() - (timeScale * 60 * 60 * 1000), Date.now()]}
                    stroke="#888"
                    tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis 
                    stroke="#888" 
                    domain={['auto', 'auto']} 
                    tickFormatter={(tick) => tick?.toLocaleString() || '0'}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}
                    labelFormatter={(label) => `Time: ${new Date(label).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`}
                    formatter={(value) => [`Stock: ${value.toLocaleString()}`, '']}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="stock"
                    stroke="#3498db"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Time Scale Slider */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <label htmlFor="timeScaleSlider" style={{ display: 'block', marginBottom: '10px', color: '#bbb' }}>
                Time Window: {timeScale} hours
              </label>
              <input
                type="range"
                id="timeScaleSlider"
                min="1"
                max="168"
                step="1"
                value={timeScale}
                onChange={(e) => setTimeScale(parseInt(e.target.value))}
                style={{ width: '80%', accentColor: '#3498db' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedItemForGraph(null)}
                style={{
                  padding: '8px 25px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#555', textAlign: 'center' }}>
        Prices shown are base buy prices from the TORN Items database. Actual overseas stock quantities require visiting the country or community-driven data.
      </p>
    </div>
  );
};

export default OverseasStock;