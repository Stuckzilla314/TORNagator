import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    const fetchYataStock = async () => {
      setLoadingYata(true);
      try {
        const response = await fetch('https://yata.yt/api/v1/travel/export/');
        const data = await response.json();
        setYataData(data);
      } catch (err) {
        console.error("Failed to fetch YATA stock data:", err);
      } finally {
        setLoadingYata(false);
      }
    };
    fetchYataStock();
  }, []);

  const headerStyle = {
    textAlign: 'left',
    padding: '15px',
    backgroundColor: '#252525',
    color: '#888',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    borderBottom: '2px solid #333'
  };

  const cellStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #2a2a2a'
  };

  // Flatten the mapping into a list of items with country info
  if (!itemsData) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading items...</div>;

  const overseasItems = Object.entries(COUNTRY_MAP).flatMap(([country, ids]) => 
    ids.map(id => ({
      ...(itemsData[id] || {}),
      id,
      country
    })).filter(item => !!item.name)
  ).filter(item => filter === 'All' || item.country === filter);

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
      lastUpdate: yataData.stocks[code].update
    };
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
              <th style={headerStyle}>Item Name</th>
              <th style={headerStyle}>Country</th>
              <th style={{ ...headerStyle, textAlign: 'center' }}>Owned</th>
              <th style={headerStyle}>Buy Price</th>
              <th style={headerStyle}>Market Price</th>
              <th style={{ ...headerStyle, textAlign: 'center' }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {overseasItems.map(item => {
              const stockInfo = getStockInfo(item.country, item.id);
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
                </td>
                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>
                  {(getOwnedCount(item.id) || 0).toLocaleString()}
                </td>
                <td style={{ ...cellStyle, color: '#2ecc71', fontWeight: 'bold' }}>
                  ${(item.buy_price || 0).toLocaleString()}
                </td>
                <td style={{ ...cellStyle, color: '#f39c12' }}>
                  ${(item.market_value || 0).toLocaleString()}
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  {loadingYata ? (
                    <span style={{ color: '#666' }}>...</span>
                  ) : stockInfo ? (
                    <>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: stockInfo.quantity === 0 ? '#ff4444' : (stockInfo.quantity < cargoCapacity ? '#f39c12' : '#2ecc71')
                      }}>
                        {stockInfo.quantity.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                        Total: ${(item.buy_price * buyableQuantity).toLocaleString()} ({buyableQuantity})
                      </div>
                    </>
                  ) : (
                    <span style={{ color: '#444' }}>No Data</span>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {overseasItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          No items found for this selection.
        </div>
      )}
      
      <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#555', textAlign: 'center' }}>
        Prices shown are base buy prices from the TORN Items database. Actual overseas stock quantities require visiting the country or community-driven data.
      </p>
    </div>
  );
};

export default OverseasStock;