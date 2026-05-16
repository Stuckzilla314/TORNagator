import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

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
  "Mexico": "mex", "Cayman Islands": "cay", "Canada": "can", "Hawaii": "haw",
  "United Kingdom": "uni", "Argentina": "arg", "Switzerland": "swi",
  "Japan": "jap", "China": "chi", "UAE": "uae", "South Africa": "sou"
};

const TRACKED_ITEM_IDS = new Set(Object.values(COUNTRY_MAP).flat());

async function run() {
  // Validate environment variables
  const requiredEnv = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];
  
  const missing = requiredEnv.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Error: Missing required environment variables: ${missing.join(', ')}`);
    console.error("Make sure you have added these as Secrets in your GitHub repository.");
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Starting stock sync...");
  const yataRes = await fetch('https://yata.yt/api/v1/travel/export/');
  if (!yataRes.ok) {
    const text = await yataRes.text();
    console.error(`YATA API Error (${yataRes.status}): ${text.slice(0, 200)}`);
    process.exit(1);
  }
  const data = await yataRes.json();
  
  // Fetch the latest state summary (1 read instead of 220+)
  const stateRef = doc(db, "stock_metadata", "summary");
  const stateSnap = await getDoc(stateRef);
  const stateData = stateSnap.exists() ? stateSnap.data() : {};
  const lastState = stateData.items || {};
  let lastCleanup = 0;
  if (stateData.lastCleanup) {
    lastCleanup = typeof stateData.lastCleanup.toMillis === 'function' ? stateData.lastCleanup.toMillis() : stateData.lastCleanup;
  }

  let itemNames = {};
  if (process.env.TORN_API_KEY) {
    console.log("Fetching item names from TORN API...");
    const tornRes = await fetch(`https://api.torn.com/torn/?selections=items&key=${process.env.TORN_API_KEY}`);
    if (!tornRes.ok) {
      const text = await tornRes.text();
      console.error(`TORN API Error (${tornRes.status}): ${text.slice(0, 200)}`);
      // We can continue with partial data if TORN is down
    } else {
      try {
        const tornData = await tornRes.json();
        if (tornData.items) itemNames = tornData.items;
      } catch (e) {
        const text = await tornRes.text();
        console.error("Failed to parse TORN JSON. Response starts with:", text.slice(0, 100));
      }
    }
  }

  const newState = { ...lastState };
  const tasks = [];
  
  // We will build a snapshot for the frontend to read in 1 go
  const snapshotStocks = {};

  // Handle cases where YATA returns data at root, under .stocks, or under .data
  const rawStocks = data.stocks || data.data || data;

  for (const [countryName, countryCode] of Object.entries(YATA_COUNTRY_CODES)) {
    const countryInfo = rawStocks[countryCode] || rawStocks[countryName];
    if (!countryInfo?.stocks) continue;

    for (const s of countryInfo.stocks) {
      const numericId = Number(s.id);
      if (!TRACKED_ITEM_IDS.has(numericId)) continue;

      const itemKey = `${countryCode}_${numericId}`;
      
      // Prepare snapshot data for frontend
      if (!snapshotStocks[countryCode]) {
        snapshotStocks[countryCode] = { stocks: [], update: countryInfo.update };
      }
      snapshotStocks[countryCode].stocks.push({ id: numericId, quantity: s.quantity, cost: s.cost });

      // Only write to history if quantity changed
      if (lastState[itemKey] !== s.quantity) {
        tasks.push((async () => {
          await addDoc(collection(db, "stock_history"), {
            itemId: numericId,
            itemName: itemNames[numericId]?.name || "Unknown",
            country: countryName,
            stock: s.quantity,
            cost: s.cost,
            timestamp: countryInfo.update,
            createdAt: Timestamp.now()
          });
          console.log(`[HISTORY] ${countryName}: ${itemNames[numericId]?.name || numericId} updated`);
        })());
        newState[itemKey] = s.quantity;
      }
    }
  }

  await Promise.all(tasks);

  let newLastCleanup = lastCleanup;
  const nowMs = Date.now();

  if (nowMs - lastCleanup > 24 * 60 * 60 * 1000) {
    console.log("Running 24-hour cleanup cycle...");
    try {
      // Cleanup records older than 48 hours to stay within Firestore free tier limits
      const cutoff = Math.floor(nowMs / 1000) - (48 * 60 * 60);
      const qCleanup = query(collection(db, "stock_history"), where("timestamp", "<", cutoff));
      const cleanupSnap = await getDocs(qCleanup);
      
      if (!cleanupSnap.empty) {
        const deleteTasks = cleanupSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteTasks);
        console.log(`[CLEANUP] Deleted ${cleanupSnap.size} records older than 48 hours.`);
      } else {
        console.log(`[CLEANUP] No records older than 48 hours to delete.`);
      }
      newLastCleanup = nowMs;
    } catch (err) {
      console.error("[CLEANUP] Failed:", err);
    }
  }

  // Update the summary state and frontend snapshot (2 writes)
  await Promise.all([
    setDoc(stateRef, { 
      items: newState, 
      lastUpdated: Timestamp.now(),
      lastCleanup: typeof newLastCleanup === 'number' ? Timestamp.fromMillis(newLastCleanup) : newLastCleanup
    }),
    setDoc(doc(db, "stock_metadata", "snapshot"), { 
      stocks: snapshotStocks, 
      lastUpdated: Timestamp.now() 
    })
  ]);
  
  console.log("State and Snapshot updated.");
  console.log("Sync finished.");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});