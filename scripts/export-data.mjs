import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'tornagator',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

async function exportData() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Fetching all stock history data...");
  const q = query(collection(db, "stock_history"), orderBy("timestamp", "asc"));
  const snap = await getDocs(q);

  const data = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const outputPath = path.join(process.cwd(), 'stock_history_export.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Successfully exported ${data.length} records to ${outputPath}`);
  process.exit(0);
}

exportData().catch(err => {
  console.error(err);
  process.exit(1);
});
