import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { db, getDoc, getDocs } from './firebase';
import { collection, addDoc, query, where, orderBy, limit, Timestamp, startAfter, doc, onSnapshot } from "firebase/firestore";
import { IconWarning } from './Icons';
import { isCapacitor } from './utils';


/**
 * A mapping of country names to their respective item IDs available in the foreign item market.
 * Used to categorize and filter items by country.
 *
 * @type {Object<string, number[]>}
 */
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

/**
 * Approximate travel times (in minutes) from Torn City to each destination using standard transport.
 * Used to calculate potential profit per minute (PPM).
 *
 * @type {Object<string, number>}
 */
const TRAVEL_TIMES = {
  "Mexico": 26,
  "Cayman Islands": 35,
  "Canada": 41,
  "Hawaii": 134,
  "United Kingdom": 159,
  "Argentina": 167,
  "Switzerland": 175,
  "Japan": 225,
  "China": 242,
  "UAE": 271,
  "South Africa": 297
};

/**
 * Three-letter country codes used by the YATA API.
 * Maps Torn country names to their YATA equivalents.
 *
 * @type {Object<string, string>}
 */
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

/**
 * A flattened set of all tracked foreign item IDs for O(1) lookup during data processing.
 *
 * @type {Set<number>}
 */
const TRACKED_ITEM_IDS = new Set(Object.values(COUNTRY_MAP).flat());

/**
 * Renders the Overseas Stock section, showing current foreign item availability,
 * potential profit, and historical restock data.
 *
 * @param {Object} props - The component props.
 * @param {Object} props.itemsData - Static metadata for all Torn items (names, prices, etc.).
 * @param {Object} props.userData - The current user's profile and travel state.
 * @param {number} [props.cargoCapacity=5] - The number of items the user can carry back.
 * @param {boolean} props.autoSyncStock - Whether the app is currently auto-syncing stock data.
 * @param {Function} props.onManualSync - Callback to manually trigger a stock data sync.
 * @param {string} props.filter - The currently selected country filter.
 * @param {Function} props.setFilter - Callback to change the country filter.
 * @param {Function} props.onOpenInTorn - Callback to open a specific link in the Torn game view.
 * @returns {React.JSX.Element} The rendered Overseas Stock component.
 */
const OverseasStock = ({ itemsData, userData, cargoCapacity = 5, autoSyncStock, onManualSync, filter, setFilter, onOpenInTorn }) => {
  const [yataData, setYataData] = useState(null);
  const [loadingYata, setLoadingYata] = useState(false);
  const [timeScale, setTimeScale] = useState(24); // Default to 24h to save space
  const [loadingHistoricalData, setLoadingHistoricalData] = useState(false);
  const [selectedItemForGraph, setSelectedItemForGraph] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'bagProfit', direction: 'desc' });
  const [maxRoundTripMinutes, setMaxRoundTripMinutes] = useState('');
  const [maxBagCost, setMaxBagCost] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lowCashItem, setLowCashItem] = useState(null);
  const [showTotalProfit, setShowTotalProfit] = useState(false);

  const toggleShowTotalProfit = () => {
    setShowTotalProfit(prev => {
      const next = !prev;
      setSortConfig(config => {
        if (config.key === 'bagProfit' && !next) {
          return { ...config, key: 'profitPerItem' };
        } else if (config.key === 'profitPerItem' && next) {
          return { ...config, key: 'bagProfit' };
        }
        return config;
      });
      return next;
    });
  };

  // Handle native Android hardware back button and swipe-to-dismiss
  useEffect(() => {
    const modalOpen = !!selectedItemForGraph || !!lowCashItem;
    if (!modalOpen) return;

    let listenerHandle = null;

    if (isCapacitor) {
      let isSubscribed = true;
      import('@capacitor/app').then(({ App }) => {
        if (!isSubscribed) return;
        App.addListener('backButton', () => {
          setSelectedItemForGraph(null);
          setLowCashItem(null);
        }).then(handle => {
          listenerHandle = handle;
        });
      }).catch(err => {
        console.warn("Failed to load @capacitor/app:", err);
      });

      return () => {
        isSubscribed = false;
        if (listenerHandle) {
          listenerHandle.remove();
        }
      };
    } else {
      window.history.pushState({ modalOpen: true }, '');

      const handlePopState = () => {
        setSelectedItemForGraph(null);
        setLowCashItem(null);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (window.history.state?.modalOpen) {
          window.history.back();
        }
      };
    }
  }, [selectedItemForGraph, lowCashItem]);

  const proceedToTravel = useCallback((item) => {
    if (onOpenInTorn) {
      onOpenInTorn('https://www.torn.com/travelagency.php', item.country);
    } else {
      window.open('https://www.torn.com/travelagency.php', '_blank');
    }
  }, [onOpenInTorn]);
  // Overrides stock quantities with the freshest value seen from Firestore history fetches.
  // Keyed as 'country_itemId' -> { quantity, timestamp }
  const [historyStockOverrides, setHistoryStockOverrides] = useState(() => {
    try {
      const cached = sessionStorage.getItem('tornagator_stock_overrides');
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  });

  // Compute available categories dynamically based on the tracked items
  const availableCategories = React.useMemo(() => {
    if (!itemsData) return [];
    const types = new Set();
    Object.values(COUNTRY_MAP).flat().forEach(id => {
      if (itemsData[id]?.type) types.add(itemsData[id].type);
    });
    return Array.from(types).sort();
  }, [itemsData]);

  // Memoized stocks lookup map for O(1) item lookups
  // Merges overrides from the most recent history fetches so the Stock column
  // always reflects the latest Firestore data, not just the YATA snapshot.
  const stocksLookup = React.useMemo(() => {
    const map = {};
    if (yataData?.stocks) {
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
    }
    // Apply overrides from history fetches (higher priority than stale snapshot)
    Object.entries(historyStockOverrides).forEach(([key, override]) => {
      if (map[key]) {
        map[key] = { ...map[key], quantity: override.quantity };
      } else {
        map[key] = { quantity: override.quantity, cost: 0, update: 0 };
      }
    });
    return map;
  }, [yataData, historyStockOverrides]);

  // Load cached stock data on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('tornagator_yata_cache');
      if (cached) {
        setYataData(JSON.parse(cached));
      }
    } catch (e) { console.warn("Yata cache restoration failed:", e); }
  }, []);

  // Persist history overrides to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem('tornagator_stock_overrides', JSON.stringify(historyStockOverrides));
    } catch (e) { console.warn("Stock overrides cache write failed:", e); }
  }, [historyStockOverrides]);

  const fetchStockData = useCallback(async () => {
    setLoadingYata(true);
    try {
      const snap = await getDoc(doc(db, "stock_metadata", "snapshot"));
      if (snap.exists()) {
        const snapData = snap.data();
        const data = {
          stocks: snapData.stocks || {},
          lastUpdated: snapData.lastUpdated ? (typeof snapData.lastUpdated.toMillis === 'function' ? snapData.lastUpdated.toMillis() : snapData.lastUpdated) : null
        };
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

  // Synchronize market stock on a 5-minute tick ( :00, :05, :10... )
  useEffect(() => {
    if (!autoSyncStock) return;

    // Initial fetch if cache is empty or on mount
    if (!yataData) {
      fetchStockData();
    }

    const checkMarketSync = () => {
      const now = new Date();
      // Check if we are exactly on a 5-minute mark (within a 5s window to account for drift)
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      if (minutes % 5 === 0 && seconds < 30) {
        // Only fetch once per 5-minute block
        const lastSync = parseInt(sessionStorage.getItem('last_market_sync_minute') || '-1');
        if (lastSync !== minutes) {
          fetchStockData();
          sessionStorage.setItem('last_market_sync_minute', minutes.toString());
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkMarketSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkMarketSync();
      }
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoSyncStock, fetchStockData, yataData]);

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

        // Patch the latest known stock back into the table's Stock column
        if (history.length > 0) {
          const latestPoint = history[history.length - 1];
          const key = `${selectedItemForGraph.country}_${selectedItemForGraph.id}`;
          setHistoryStockOverrides(prev => ({
            ...prev,
            [key]: { quantity: latestPoint.stock, timestamp: latestPoint.timestamp }
          }));
        }
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

    let baseHistory = [...visiblePoints];

    if (lastPointBefore) {
      baseHistory.unshift({
        timestamp: windowStartMs,
        stock: lastPointBefore.stock,
        isWindowEdge: true
      });
    } else if (baseHistory.length > 0 && baseHistory[0].timestamp > windowStartMs) {
      // If no points before, but first point is after window start, 
      // drag first point back to start (fallback)
      baseHistory.unshift({
        timestamp: windowStartMs,
        stock: baseHistory[0].stock,
        isWindowEdge: true
      });
    }

    let displayHistory = [];
    for (let i = 0; i < baseHistory.length; i++) {
      if (i > 0) {
        const prev = baseHistory[i - 1];
        const curr = baseHistory[i];
        const gap = curr.timestamp - prev.timestamp;

        // If there is a gap > 5 minutes and the stock changed,
        // it means the stock stayed the same until the last 5-minute interval.
        // We inject a point 5 minutes before the change to keep it flat,
        // allowing a smooth curve in the last 5 minutes.
        if (gap > 5 * 60 * 1000 && curr.stock !== prev.stock) {
          displayHistory.push({
            timestamp: curr.timestamp - 5 * 60 * 1000,
            stock: prev.stock,
            isInterpolatedEdge: true
          });
        }
      }
      displayHistory.push(baseHistory[i]);
    }

    // 3. Append a point for "Now" so the line draws all the way to the right edge
    if (displayHistory.length > 0) {
      const lastHistoryPoint = displayHistory[displayHistory.length - 1];
      const lastKnownStock = lastHistoryPoint.stock;

      // Get the freshest possible live stock from yataData
      let liveStock = undefined;
      let liveTs = 0;
      if (yataData?.stocks) {
        const countryCode = YATA_COUNTRY_CODES[selectedItemForGraph.country];
        if (countryCode && yataData.stocks[countryCode]) {
          const stockList = yataData.stocks[countryCode].stocks;
          const sInfo = stockList?.find(s => Number(s.id) === Number(selectedItemForGraph.id));
          if (sInfo) {
            liveStock = sInfo.quantity;
            liveTs = yataData.stocks[countryCode].update * 1000;
          }
        }
      }

      // If we couldn't find it in yataData, fallback to selectedItemForGraph
      if (liveStock === undefined && selectedItemForGraph.stockInfo) {
        liveStock = selectedItemForGraph.stockQuantity;
        liveTs = selectedItemForGraph.stockInfo.update * 1000;
      }

      // Only trust the live stock if its update timestamp is >= our last history point.
      // This prevents a stale frontend cache from causing a spike up to an old value.
      const currentStock = (liveStock !== undefined && liveTs >= lastHistoryPoint.timestamp)
        ? liveStock
        : lastKnownStock;

      if (lastKnownStock !== currentStock) {
        // Create a 5-minute edge to represent the interval instead of an instant 1s drop
        const gap = nowMs - lastHistoryPoint.timestamp;
        if (gap > 5 * 60 * 1000) {
          displayHistory.push({
            timestamp: nowMs - 5 * 60 * 1000,
            stock: lastKnownStock,
            isInterpolatedEdge: true
          });
        }
      }

      displayHistory.push({
        timestamp: nowMs,
        stock: currentStock,
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
          totalRoundTripMinutes,
          profitPerItem,
          stockQuantity,
          stockInfo
        };
      }).filter(item => !!item.name)
    ).filter(item => {
      if (filter !== 'All' && item.country !== filter) return false;
      if (categoryFilter !== 'All' && item.type !== categoryFilter) return false;
      if (maxRoundTripMinutes !== '' && item.totalRoundTripMinutes > Number(maxRoundTripMinutes)) return false;
      if (maxBagCost !== '' && (item.buy_price * cargoCapacity) > Number(maxBagCost)) return false;
      return true;
    });
  }, [itemsData, stocksLookup, userData, cargoCapacity, filter, categoryFilter, getOwnedCount, getStockInfo, maxRoundTripMinutes, maxBagCost]);

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
      setLowCashItem(item);
    } else {
      proceedToTravel(item);
    }
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return <span style={{ color: '#444', marginLeft: '8px', fontSize: '0.7rem' }}>↕</span>;
    return sortConfig.direction === 'asc' ?
      <span style={{ color: '#3498db', marginLeft: '8px', fontSize: '0.7rem' }}>▲</span> :
      <span style={{ color: '#3498db', marginLeft: '8px', fontSize: '0.7rem' }}>▼</span>;
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', animation: 'fadeIn 0.5s ease-in' }}>
      {isCapacitor ? (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Overseas Catalog</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <button
                onClick={handleManualSync}
                disabled={loadingYata}
                style={{
                  background: 'transparent',
                  border: `1px solid ${loadingYata ? '#222' : '#444'}`,
                  borderRadius: '20px',
                  padding: '6px 14px',
                  cursor: loadingYata ? 'not-allowed' : 'pointer',
                  color: loadingYata ? '#666' : '#3498db',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '700',
                  fontSize: '0.75rem',
                  letterSpacing: '1px',
                  transition: 'all 0.3s ease',
                  opacity: loadingYata ? 0.6 : 1
                }}
                title="Refresh Stock & Inventory"
              >
                <span>{loadingYata ? 'SYNCING...' : 'SYNC'}</span>
                <span>🔄</span>
              </button>
            </div>
          </div>
          
          {yataData?.stocks && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#666' }}>
                Last Sync: {
                  yataData.lastUpdated
                    ? new Date(yataData.lastUpdated).toLocaleTimeString()
                    : (() => {
                      let maxUpdate = 0;
                      Object.values(yataData.stocks).forEach(c => {
                        if (c?.update > maxUpdate) maxUpdate = c.update;
                      });
                      return maxUpdate ? new Date(maxUpdate * 1000).toLocaleTimeString() : 'Unknown';
                    })()
                }
              </span>
              {!navigator.onLine && (
                <span style={{ fontSize: '0.65rem', color: '#f39c12', fontWeight: 'bold' }}>
                  [OFFLINE MODE]
                </span>
              )}
            </div>
          )}

          {/* Mobile Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
            <select
              aria-label="Filter by country"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ padding: '10px 12px', backgroundColor: '#1c1c1e', color: 'white', border: '1px solid #2c2c2e', borderRadius: '8px', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="All">All Countries</option>
              {Object.keys(COUNTRY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              aria-label="Filter by item category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '10px 12px', backgroundColor: '#1c1c1e', color: 'white', border: '1px solid #2c2c2e', borderRadius: '8px', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="All">All Categories</option>
              {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input
              aria-label="Filter by maximum bag cost"
              type="number"
              placeholder="Max Bag Cost ($)"
              value={maxBagCost}
              onChange={(e) => setMaxBagCost(e.target.value)}
              style={{ padding: '10px 12px', backgroundColor: '#1c1c1e', color: 'white', border: '1px solid #2c2c2e', borderRadius: '8px', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            <input
              aria-label="Filter by maximum round trip time in minutes"
              type="number"
              placeholder="Max RT (mins)"
              value={maxRoundTripMinutes}
              onChange={(e) => setMaxRoundTripMinutes(e.target.value)}
              style={{ padding: '10px 12px', backgroundColor: '#1c1c1e', color: 'white', border: '1px solid #2c2c2e', borderRadius: '8px', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            <select
              aria-label="Sort by field"
              value={sortConfig.key}
              onChange={(e) => setSortConfig(prev => ({ ...prev, key: e.target.value }))}
              style={{ padding: '10px 12px', backgroundColor: '#1c1c1e', color: 'white', border: '1px solid #2c2c2e', borderRadius: '8px', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="bagProfit">Sort: Bag Profit</option>
              <option value="profitPerItem">Sort: Profit (ea)</option>
              <option value="bagProfitPerHour">Sort: Profit/hr</option>
              <option value="buy_price">Sort: Buy Price</option>
              <option value="stockQuantity">Sort: Stock</option>
              <option value="name">Sort: Item Name</option>
              <option value="owned">Sort: Owned</option>
            </select>
            <select
              aria-label="Sort direction"
              value={sortConfig.direction}
              onChange={(e) => setSortConfig(prev => ({ ...prev, direction: e.target.value }))}
              style={{ padding: '10px 12px', backgroundColor: '#1c1c1e', color: 'white', border: '1px solid #2c2c2e', borderRadius: '8px', fontSize: '0.8rem', outline: 'none' }}
            >
              <option value="desc">Order: Descending</option>
              <option value="asc">Order: Ascending</option>
            </select>
          </div>
        </div>
      ) : (
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
                    Last Sync: {
                      yataData.lastUpdated
                        ? new Date(yataData.lastUpdated).toLocaleTimeString()
                        : (() => {
                          let maxUpdate = 0;
                          Object.values(yataData.stocks).forEach(c => {
                            if (c?.update > maxUpdate) maxUpdate = c.update;
                          });
                          return maxUpdate ? new Date(maxUpdate * 1000).toLocaleTimeString() : 'Unknown';
                        })()
                    }
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              aria-label="Filter by country"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ padding: '8px 15px', backgroundColor: '#333', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
            >
              <option value="All">All Countries</option>
              {Object.keys(COUNTRY_MAP).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              aria-label="Filter by item category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '8px 15px', backgroundColor: '#333', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
            >
              <option value="All">All Categories</option>
              {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input
              aria-label="Filter by maximum bag cost"
              type="number"
              placeholder="Max Bag Cost ($)"
              value={maxBagCost}
              onChange={(e) => setMaxBagCost(e.target.value)}
              style={{ padding: '8px 15px', backgroundColor: '#333', color: 'white', border: '1px solid #444', borderRadius: '4px', width: '150px' }}
            />
            <input
              aria-label="Filter by maximum round trip time in minutes"
              type="number"
              placeholder="Max RT (mins)"
              value={maxRoundTripMinutes}
              onChange={(e) => setMaxRoundTripMinutes(e.target.value)}
              style={{ padding: '8px 15px', backgroundColor: '#333', color: 'white', border: '1px solid #444', borderRadius: '4px', width: '130px' }}
            />
          </div>
        </div>
      )}

      {isCapacitor ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedItems.map(item => {
            const stockInfo = item.stockInfo;
            const totalCost = item.buy_price * cargoCapacity;

            return (
              <div
                key={`${item.country}-${item.id}`}
                onClick={() => handleRowClick(item)}
                style={{
                  background: 'linear-gradient(145deg, #1e1e1e 0%, #131313 100%)',
                  border: '1px solid #2d2d2d',
                  borderRadius: '12px',
                  padding: '14px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'border-color 0.2s',
                  position: 'relative'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={`https://www.torn.com/images/items/${item.id}/large.png`}
                    alt={item.name}
                    style={{ width: '38px', height: '38px', objectFit: 'contain' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', color: '#3498db', fontWeight: 'bold', backgroundColor: 'rgba(52, 152, 219, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                        {item.country}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#888' }}>
                        RT: {item.roundTripDisplay}
                      </span>
                      {item.owned > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#2ecc71', fontWeight: 'bold', backgroundColor: 'rgba(46, 204, 113, 0.15)', padding: '2px 5px', borderRadius: '4px' }}>
                          Owned: {item.owned.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid #282828', borderBottom: '1px solid #282828', padding: '8px 0' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Cost (ea / bag)</div>
                    <div style={{ fontSize: '0.8rem', color: '#2ecc71', fontWeight: 'bold', marginTop: '1px' }}>
                      ${item.buy_price.toLocaleString()} <span style={{ color: '#666', fontWeight: 'normal', fontSize: '0.7rem' }}>(${totalCost.toLocaleString()})</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Market Value</div>
                    <div style={{ fontSize: '0.8rem', color: '#f39c12', fontWeight: 'bold', marginTop: '1px' }}>
                      ${item.market_value.toLocaleString()}
                    </div>
                  </div>
                  <div onClick={(e) => { e.stopPropagation(); toggleShowTotalProfit(); }} style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      {showTotalProfit ? 'Bag Profit' : 'Profit (ea)'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: item.profitPerItem > 0 ? '#2ecc71' : '#e0e0e0', fontWeight: 'bold', marginTop: '1px' }}>
                      {showTotalProfit ? (
                        `$${item.bagProfit.toLocaleString()}`
                      ) : (
                        `$${item.profitPerItem.toLocaleString()} ea`
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Profit / hr</div>
                    <div style={{ fontSize: '0.8rem', color: item.bagProfitPerHour > 0 ? '#2ecc71' : '#e0e0e0', fontWeight: 'bold', marginTop: '1px' }}>
                      ${Math.round(item.bagProfitPerHour).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#555' }}>
                    Tap card to travel
                  </span>
                  
                  {loadingYata ? (
                    <span style={{ color: '#555', fontSize: '0.75rem' }}>Syncing...</span>
                  ) : stockInfo ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemForGraph(item);
                      }}
                      style={{
                        background: stockInfo.quantity === 0 ? 'rgba(231, 76, 60, 0.15)' : (stockInfo.quantity < cargoCapacity ? 'rgba(243, 156, 18, 0.15)' : 'rgba(46, 204, 113, 0.15)'),
                        border: `1px solid ${stockInfo.quantity === 0 ? '#e74c3c' : (stockInfo.quantity < cargoCapacity ? '#f39c12' : '#2ecc71')}`,
                        borderRadius: '20px',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        color: stockInfo.quantity === 0 ? '#e74c3c' : (stockInfo.quantity < cargoCapacity ? '#f39c12' : '#2ecc71'),
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      title="Click to view stock history"
                    >
                      <span>Stock: {stockInfo.quantity.toLocaleString()}</span>
                      <span style={{ fontSize: '0.65rem' }}>📈</span>
                    </button>
                  ) : (
                    <span style={{ color: '#444', fontSize: '0.75rem', fontWeight: 'bold' }}>No Stock Data</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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
                <th style={headerStyle} onClick={() => requestSort(showTotalProfit ? 'bagProfit' : 'profitPerItem')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {showTotalProfit ? 'Bag Profit' : 'Profit (ea)'} {renderSortIndicator(showTotalProfit ? 'bagProfit' : 'profitPerItem')}
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
                      <div
                        style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px', cursor: 'help', whiteSpace: 'pre-line' }}
                        title={`Arrive Time: ${new Date(Date.now() + (item.totalRoundTripMinutes / 2) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\nReturn Time: ${new Date(Date.now() + item.totalRoundTripMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      >
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
                    <td 
                      style={{ ...cellStyle, color: item.profitPerItem > 0 ? '#2ecc71' : '#e0e0e0', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShowTotalProfit();
                      }}
                    >
                      {showTotalProfit ? (
                        <div style={{ fontWeight: 'bold' }}>
                          ${item.bagProfit.toLocaleString()}
                        </div>
                      ) : (
                        <div style={{ fontWeight: 'bold' }}>
                          ${item.profitPerItem.toLocaleString()} ea
                        </div>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sortedItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#666', border: '1px dashed #444', borderRadius: '12px', marginTop: '2rem', backgroundColor: '#1a1a1a' }}>
          <IconWarning size={48} color="#555" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 1rem 0', color: '#aaa' }}>No items found for this selection</h3>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>Try adjusting your filters to see more results.</p>
          <button
            onClick={() => {
              setFilter('All');
              setCategoryFilter('All');
              setMaxBagCost('');
              setMaxRoundTripMinutes('');
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#3498db',
              border: '1px solid #3498db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              fontSize: '0.9rem'
            }}
            onMouseEnter={e => {
              e.target.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
            }}
            onMouseLeave={e => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Low Cash Warning Modal Overlay */}
      {lowCashItem && (() => {
        const totalCost = lowCashItem.buy_price * cargoCapacity;
        const cashOnHand = userData?.money_onhand || 0;
        const shortAmount = totalCost - cashOnHand;

        return (
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
            zIndex: 3000,
            padding: '20px',
            backdropFilter: 'blur(6px)'
          }} onClick={() => setLowCashItem(null)}>
            <div style={{
              background: 'linear-gradient(145deg, #2a1616 0%, #150a0a 100%)',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #e74c3c',
              maxWidth: '480px',
              width: '100%',
              position: 'relative',
              boxShadow: '0 15px 35px rgba(231, 76, 60, 0.25)',
              animation: 'fadeIn 0.25s ease-out',
              color: '#e0e0e0',
              textAlign: 'center'
            }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setLowCashItem(null)}
                aria-label="Close alert"
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#aaa',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  zIndex: 10
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#aaa';
                }}
              >
                ×
              </button>
              
              <div style={{
                fontSize: '3rem',
                marginBottom: '15px',
                display: 'inline-block'
              }}>
                ⚠️
              </div>

              <h3 style={{
                marginTop: 0,
                color: '#e74c3c',
                fontSize: '1.4rem',
                fontWeight: '800',
                letterSpacing: '0.5px',
                marginBottom: '20px'
              }}>
                Low on Cash!
              </h3>

              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '25px',
                border: '1px solid #333',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', borderBottom: '1px solid #2a2a2a', paddingBottom: '15px' }}>
                  <img
                    src={`https://www.torn.com/images/items/${lowCashItem.id}/large.png`}
                    alt={lowCashItem.name}
                    style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#fff' }}>{lowCashItem.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>Target: {lowCashItem.country}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ color: '#aaa' }}>Required for {cargoCapacity}x:</span>
                  <span style={{ fontWeight: 'bold', color: '#fff' }}>${totalCost.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ color: '#aaa' }}>Cash on Hand:</span>
                  <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>${cashOnHand.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2a2a2a', paddingTop: '10px', marginTop: '10px', fontSize: '0.95rem' }}>
                  <span style={{ color: '#aaa', fontWeight: 'bold' }}>Short of:</span>
                  <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>-${shortAmount.toLocaleString()}</span>
                </div>
              </div>

              <p style={{ color: '#bbb', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.5' }}>
                You do not have enough money on hand to buy the maximum capacity of this item. Do you want to go to the Travel Agency anyway?
              </p>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  onClick={() => setLowCashItem(null)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    backgroundColor: 'transparent',
                    color: '#aaa',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                    fontSize: '0.9rem'
                  }}
                  onMouseEnter={e => {
                    e.target.style.borderColor = '#666';
                    e.target.style.color = '#fff';
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.02)';
                  }}
                  onMouseLeave={e => {
                    e.target.style.borderColor = '#444';
                    e.target.style.color = '#aaa';
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setLowCashItem(null);
                    proceedToTravel(lowCashItem);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    backgroundColor: '#e74c3c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)'
                  }}
                  onMouseEnter={e => {
                    e.target.style.backgroundColor = '#c0392b';
                    e.target.style.boxShadow = '0 6px 16px rgba(231, 76, 60, 0.4)';
                  }}
                  onMouseLeave={e => {
                    e.target.style.backgroundColor = '#e74c3c';
                    e.target.style.boxShadow = '0 4px 12px rgba(231, 76, 60, 0.3)';
                  }}
                >
                  Go Anyway
                </button>
              </div>

            </div>
          </div>
        );
      })()}

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
          padding: isCapacitor ? '10px' : '20px',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setSelectedItemForGraph(null)}>
          <div style={{
            backgroundColor: '#1e1e1e',
            padding: isCapacitor ? '16px' : '30px',
            borderRadius: '12px',
            border: '1px solid #333',
            maxWidth: '800px',
            width: isCapacitor ? '95%' : '100%',
            position: 'relative',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s ease-out',
            boxSizing: 'border-box'
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedItemForGraph(null)}
              aria-label="Close graph"
              style={{
                position: 'absolute',
                top: isCapacitor ? '10px' : '15px',
                right: isCapacitor ? '10px' : '15px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#aaa',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#aaa';
              }}
            >
              ×
            </button>
            <h3 style={{
              marginTop: 0,
              color: '#3498db',
              display: 'flex',
              flexDirection: isCapacitor ? 'column' : 'row',
              justifyContent: isCapacitor ? 'flex-start' : 'space-between',
              alignItems: isCapacitor ? 'flex-start' : 'center',
              gap: isCapacitor ? '8px' : '0px',
              paddingRight: isCapacitor ? '20px' : '0px'
            }}>
              <span style={{ fontSize: isCapacitor ? '1.1rem' : '1.3rem' }}>Stock History: {selectedItemForGraph.name}</span>
              {(() => {
                // Tick-Aligned Median-Based Probabilistic Model (TA-MBPM)
                // Always use full 7-day history for maximum prediction accuracy
                if (fullHistory.length < 2) return null;

                const restocks = [];
                const sellOuts = [];
                for (let i = 1; i < fullHistory.length; i++) {
                  // Detect Restock
                  if (fullHistory[i - 1].stock === 0 && fullHistory[i].stock > 0) {
                    restocks.push(fullHistory[i].timestamp);
                  }
                  // Detect Sell-out
                  if (fullHistory[i - 1].stock > 0 && fullHistory[i].stock === 0) {
                    sellOuts.push(fullHistory[i].timestamp);
                  }
                }

                const liveStockQuantity = historicalData.length > 0 
                  ? historicalData[historicalData.length - 1].stock 
                  : (selectedItemForGraph.stockQuantity || 0);

const selloutToRestockIntervals = [];
                for (let i = 0; i < sellOuts.length; i++) {
                  const sTime = sellOuts[i];
                  const nextR = restocks.find(r => r > sTime);
                  if (nextR) {
                    selloutToRestockIntervals.push(nextR - sTime);
                  }
                }

                const restockToRestockIntervals = [];
                for (let i = 1; i < restocks.length; i++) {
                  restockToRestockIntervals.push(restocks[i] - restocks[i - 1]);
                }

                let intervals = selloutToRestockIntervals;
                if (intervals.length < 3) {
                  intervals = restockToRestockIntervals;
                }

                if (intervals.length < 3) {
                  if (liveStockQuantity === 0) {
                    return <div style={{ textAlign: isCapacitor ? 'left' : 'right', fontSize: '0.7rem', color: '#666' }}>Gathering data...</div>;
                  }
                  return null;
                }

                const sorted = [...intervals].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                const p10 = sorted[Math.floor(sorted.length * 0.1)];
                const p90 = sorted[Math.floor(sorted.length * 0.9)];

                const lastRestock = restocks[restocks.length - 1];
                const now = Date.now();

                // Find when the stock went to 0 in the current out-of-stock period
                let wentToZeroTimestamp = null;
                if (liveStockQuantity === 0) {
                  for (let i = fullHistory.length - 1; i >= 0; i--) {
                    if (fullHistory[i].stock === 0) {
                      wentToZeroTimestamp = fullHistory[i].timestamp;
                    } else {
                      break;
                    }
                  }
                }

                let rawExpected;
                if (liveStockQuantity === 0 && wentToZeroTimestamp) {
                  rawExpected = wentToZeroTimestamp + p10;
                } else {
                  // --- Adaptive Cycle Analysis (ACA) ---
                  // Adjust prediction based on the velocity of the last sell-out
                  let acaAdjustment = 1.0;
                  const lastSellOut = [...sellOuts].reverse().find(s => s >= lastRestock);
                  if (lastSellOut) {
                    const sellDurationMins = (lastSellOut - lastRestock) / 60000;
                    if (sellDurationMins < 30) acaAdjustment = 0.5; // High velocity -> Fast restock
                    else if (sellDurationMins < 60) acaAdjustment = 1.0; // Normal velocity
                    else acaAdjustment = 1.5; // Low velocity -> Slower restock
                  }

                  // Use restock-to-restock intervals for in-stock cycle duration prediction
                  const r2rSorted = [...restockToRestockIntervals].sort((a, b) => a - b);
                  const r2rMedian = r2rSorted.length > 0 ? r2rSorted[Math.floor(r2rSorted.length / 2)] : median;
                  const adjustedMedian = r2rMedian * acaAdjustment;
                  rawExpected = lastRestock + adjustedMedian;
                  // --------------------------------------
                }




                // --- Tick Alignment Logic ---
                // Snap the raw prediction to the next 5-minute tick (:00, :05, :10, :15, ...)
                const expectedDate = new Date(rawExpected);
                const minutes = expectedDate.getMinutes();
                const snappedMinutes = Math.ceil(minutes / 5) * 5;
                expectedDate.setMinutes(snappedMinutes);
                expectedDate.setSeconds(0);
                expectedDate.setMilliseconds(0);
                let snappedExpected = expectedDate.getTime();

                // Proactive Tick Shifting: If we have a confirmed 0-stock data point 
                // AFTER our expected tick, we know that tick was missed. 
                // Shift forward to the next viable 5-minute tick.
                const latestZeroPoint = [...historicalData].reverse().find(d => d.stock === 0);
                if (latestZeroPoint && latestZeroPoint.timestamp >= snappedExpected) {
                  // Shift to the first 5m tick AFTER the latest confirmed zero
                  const nextTickDate = new Date(latestZeroPoint.timestamp);
                  const nextMins = nextTickDate.getMinutes();
                  const nextSnappedMins = Math.ceil((nextMins + 1) / 5) * 5;
                  nextTickDate.setMinutes(nextSnappedMins);
                  nextTickDate.setSeconds(0);
                  nextTickDate.setMilliseconds(0);
                  snappedExpected = nextTickDate.getTime();
                  expectedDate.setTime(snappedExpected); // Update date object for display
                }
                // --------------------------------------



                let statusText = "";
                let statusColor = "#3498db";
                const timeLeft = snappedExpected - now;

                const timeDisplay = expectedDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

                if (liveStockQuantity > 0) {
                  statusText = `Stock Available ${liveStockQuantity} ✅\nNext cycle: @ ${timeDisplay}`;
                  statusColor = "#2ecc71";
                } else if (timeLeft < 0) {
                  const overdueMins = Math.round(Math.abs(timeLeft) / 60000);
                  statusText = `Restock Overdue ⏳\nMissed tick: @ ${timeDisplay} (${overdueMins}m ago)`;
                  statusColor = "#e74c3c";
                } else if (timeLeft <= 300000) { // Within 5 mins of the tick
                  statusText = `Restock Imminent 🔥\nTarget: @ ${timeDisplay}`;
                  statusColor = "#f1c40f";
                } else {
                  const minsLeft = Math.round(timeLeft / 60000);
                  statusText = `Restock in ~${minsLeft}m\nTarget: @ ${timeDisplay}`;
                  statusColor = "#3498db";
                }

                const confidence = restocks.length > 20 ? 'High' : (restocks.length > 10 ? 'Medium' : 'Low');
                const confidenceColor = confidence === 'High' ? '#2ecc71' : (confidence === 'Medium' ? '#f39c12' : '#e74c3c');

                return (
                  <div style={{ textAlign: isCapacitor ? 'left' : 'right' }}>
                    <div style={{ fontSize: isCapacitor ? '0.75rem' : '0.85rem', color: statusColor, fontWeight: 'bold', whiteSpace: 'pre-line' }}>{statusText}</div>
                    <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '2px' }}>
                      Window: {Math.round(p10 / 60000)}m - {Math.round(p90 / 60000)}m
                    </div>
                    <div style={{ fontSize: '0.55rem', color: '#555' }}>
                      <span style={{ color: confidenceColor }}>●</span> {confidence} Confidence ({restocks.length} events)
                    </div>
                  </div>
                );
              })()}
            </h3>
            <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '15px', marginTop: '-5px' }}>Country: {selectedItemForGraph.country}</p>

            {loadingHistoricalData ? (
              <div style={{ height: isCapacitor ? '200px' : '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Loading historical data...
              </div>
            ) : graphError ? (
              <div style={{ height: isCapacitor ? '200px' : '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4444', textAlign: 'center' }}>{graphError}</div>
            ) : (
              <ResponsiveContainer width="100%" height={isCapacitor ? 200 : 300}>
                <LineChart
                  data={historicalData}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 5,
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
                    style={{ fontSize: '0.65rem' }}
                  />
                  <YAxis
                    stroke="#888"
                    domain={['auto', 'auto']}
                    tickFormatter={(tick) => tick?.toLocaleString() || '0'}
                    style={{ fontSize: '0.65rem' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff', fontSize: '0.75rem' }}
                    labelFormatter={(label) => `Time: ${new Date(label).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`}
                    formatter={(value) => [`Stock: ${value.toLocaleString()}`, '']}
                  />
                  <Line
                    type="monotone"
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
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <label htmlFor="timeScaleSlider" style={{ display: 'block', marginBottom: '6px', color: '#bbb', fontSize: '0.75rem' }}>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setSelectedItemForGraph(null)}
                style={{
                  padding: '6px 20px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
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

// ⚡ Bolt: Wrapped with React.memo() to prevent expensive chart and table re-renders when parent state updates but stock props remain unchanged
export default React.memo(OverseasStock);