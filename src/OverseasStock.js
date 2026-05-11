import React, { useState } from 'react';

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

const OverseasStock = ({ itemsData }) => {
  const [filter, setFilter] = useState('All');

  const cardStyle = {
    backgroundColor: '#1e1e1e',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  };

  // Flatten the mapping into a list of items with country info
  const overseasItems = Object.entries(COUNTRY_MAP).flatMap(([country, ids]) => 
    ids.map(id => ({
      ...itemsData[id],
      id,
      country
    })).filter(item => !!item.name)
  ).filter(item => filter === 'All' || item.country === filter);

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {overseasItems.map(item => (
          <div key={item.id} style={cardStyle}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              backgroundColor: '#111', 
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              <img 
                src={`https://www.torn.com/images/items/${item.id}/large.png`} 
                alt={item.name} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{item.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#3498db' }}>{item.country}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>Buy Price</div>
              <div style={{ fontWeight: 'bold', color: '#2ecc71' }}>
                ${item.buy_price?.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
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