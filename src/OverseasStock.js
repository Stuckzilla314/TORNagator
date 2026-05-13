import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';

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

const OverseasStock = ({ itemsData, userData, cargoCapacity = 5 }) => {
  const [filter, setFilter] = useState('All');
  const [yataData, setYataData] = useState(null);
  const [loadingYata, setLoadingYata] = useState(false);
  const [timeScale, setTimeScale] = useState(48); // New state for time scale in hours
  const [loadingHistoricalData, setLoadingHistoricalData] = useState(false);
  const [selectedItemForGraph, setSelectedItemForGraph] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'bagProfit', direction: 'desc' });

  useEffect(() => {
    const fetchYataStock = async () => {
      setLoadingYata(true);
      try {
        const response = await fetch('https://yata.yt/api/v1/travel/export/');
        const data = await response.json();
        setYataData(data);

        // Record real stock levels into local storage history whenever we get a fresh fetch
        if (data && data.stocks) {
          const now = Date.now();
          const cutOff = now - (48 * 60 * 60 * 1000); // 48h limit

          Object.entries(YATA_COUNTRY_CODES).forEach(([countryName, countryCode]) => {
            const countryInfo = data.stocks[countryCode];
            if (countryInfo && countryInfo.stocks) {
              const updateTs = countryInfo.update * 1000; // Convert YATA seconds to MS
              countryInfo.stocks.forEach(s => {
                const key = `tornagator_stock_history_${s.id}_${countryName}`;
                let history = JSON.parse(localStorage.getItem(key) || '[]');
                if (history.length === 0 || history[history.length - 1].timestamp < updateTs) {
                  history.push({ timestamp: updateTs, stock: s.quantity });
                  history = history.filter(p => p.timestamp >= cutOff);
                  localStorage.setItem(key, JSON.stringify(history));
                }
              });
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch YATA stock data:", err);
      } finally {
        setLoadingYata(false);
      }
    };

    fetchYataStock();
    // Refresh the table data every minute
    const interval = setInterval(fetchYataStock, 60000);
    return () => clearInterval(interval);
  }, []);

  // State for historical data, now managed locally
  const [historicalData, setHistoricalData] = useState([]);

  // Helper to manage local storage for historical data
  const getLocalStorageKey = useCallback((item) => `tornagator_stock_history_${item.id}_${item.country}`, []);

  const loadHistoricalData = useCallback((item) => {
    const key = getLocalStorageKey(item);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }, [getLocalStorageKey]);

  const saveHistoricalData = useCallback((item, history) => {
    const key = getLocalStorageKey(item);
    localStorage.setItem(key, JSON.stringify(history));
  }, [getLocalStorageKey]);

  useEffect(() => {
    if (selectedItemForGraph) {
      setLoadingHistoricalData(true);
      const currentHistory = loadHistoricalData(selectedItemForGraph);
      setHistoricalData(currentHistory);
      setLoadingHistoricalData(false);
    } else {
      setHistoricalData([]);
    }
  }, [selectedItemForGraph, yataData, loadHistoricalData]);

  // Filter history points based on the timeScale slider
  const windowStart = Date.now() - (timeScale * 60 * 60 * 1000);
  const realHistory = historicalData.filter(point => point.timestamp >= windowStart);

  // If we have data, pad the start of the window with 0 to satisfy the "line at zero" requirement
  const filteredHistory = realHistory.length > 0 
    ? [{ timestamp: windowStart, stock: 0 }, ...realHistory]
    : [{ timestamp: windowStart, stock: 0 }, { timestamp: Date.now(), stock: 0 }];


  const headerStyle = {
    textAlign: 'left',
    padding: '15px',
    backgroundColor: '#252525',
    color: '#888',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    borderBottom: '2px solid #333',
    cursor: 'pointer'
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

  const getStockInfo = (country, itemId) => {
    if (!yataData?.stocks) return null;
    const code = YATA_COUNTRY_CODES[country];
    if (!code || !yataData.stocks[code]) return null;
    
    const stockList = yataData.stocks[code].stocks || [];
    const itemStock = stockList.find(s => s.id === itemId);
    
    return {
      quantity: itemStock ? itemStock.quantity : 0,
      cost: itemStock ? itemStock.cost : 0,
      lastUpdate: yataData.stocks[code].update
    };
  };
  
  // Flatten mapping into items with pre-calculated values for sorting
  if (!itemsData) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading items...</div>;

  const processedItems = Object.entries(COUNTRY_MAP).flatMap(([country, ids]) => 
    ids.map(id => {
      const item = itemsData[id] || {};
      const stockInfo = getStockInfo(country, id);
      const owned = getOwnedCount(id);
      
      // Use YATA's 'cost' as the effective buy price for overseas items, 
      // falling back to the TORN base buy_price if YATA data isn't available yet.
      const effectiveBuyPrice = stockInfo?.cost || item.buy_price || 0;
      
      const profitPerItem = (item.market_value || 0) - effectiveBuyPrice;
      const bagProfit = profitPerItem * cargoCapacity;
      const stockQuantity = stockInfo?.quantity || 0;

      // Calculate travel time in hours (round trip)
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
        buy_price: effectiveBuyPrice, // Override with country-specific price
        bagProfit,
        bagProfitPerHour,
        roundTripDisplay,
        profitPerItem,
        stockQuantity,
        stockInfo
      };
    }).filter(item => !!item.name)
  ).filter(item => filter === 'All' || item.country === filter);

  const sortedItems = [...processedItems].sort((a, b) => {
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

  const requestSort = (key) => {
    let direction = (key === 'name' || key === 'country') ? 'asc' : 'desc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
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
        <h2 style={{ margin: 0 }}>Overseas Item Catalog</h2>
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
              <th style={headerStyle} onClick={() => requestSort('name')}>Item Name {renderSortIndicator('name')}</th>
              <th style={headerStyle} onClick={() => requestSort('country')}>Country {renderSortIndicator('country')}</th>
              <th style={{ ...headerStyle, textAlign: 'center' }} onClick={() => requestSort('owned')}>Owned {renderSortIndicator('owned')}</th>
              <th style={headerStyle} onClick={() => requestSort('buy_price')}>Buy Price {renderSortIndicator('buy_price')}</th>
              <th style={headerStyle} onClick={() => requestSort('market_value')}>Market Value {renderSortIndicator('market_value')}</th>
              <th style={headerStyle} onClick={() => requestSort('bagProfit')}>Bag Profit {renderSortIndicator('bagProfit')}</th>
              <th style={headerStyle} onClick={() => requestSort('bagProfitPerHour')}>Profit/hr {renderSortIndicator('bagProfitPerHour')}</th>
              <th style={{ ...headerStyle, textAlign: 'center' }} onClick={() => requestSort('stockQuantity')}>Stock {renderSortIndicator('stockQuantity')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(item => {
              const stockInfo = item.stockInfo;
              const buyableQuantity = stockInfo ? Math.min(stockInfo.quantity, cargoCapacity) : 0;
              
              return (
                <tr key={`${item.country}-${item.id}`} style={{ transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#252525'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
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
                    <div onClick={() => setSelectedItemForGraph(item)} style={{ cursor: 'pointer' }}>
                      <div 
                        onClick={() => setSelectedItemForGraph(item)}
                        style={{ 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          color: stockInfo.quantity === 0 ? '#ff4444' : (stockInfo.quantity < cargoCapacity ? '#f39c12' : '#2ecc71'),
                          textDecoration: 'underline'
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
            )})}
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
            <h3 style={{ marginTop: 0, color: '#3498db' }}>Stock History: {selectedItemForGraph.name}</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>Country: {selectedItemForGraph.country}</p>
            
            {loadingHistoricalData ? (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Loading historical data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={filteredHistory}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#888" 
                    tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis stroke="#888" />
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
                max="48"
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