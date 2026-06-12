import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfigJson = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

async function run() {
  console.log("=== FETCHING PUBLIC RANKINGS FROM FIRESTORE ===");
  const rankingsSnap = await getDocs(collection(db, 'rankings'));
  console.log(`Total rankings found: ${rankingsSnap.size}`);
  
  const docs = rankingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  
  // Sort by totalPoints desc
  docs.sort((a,b) => b.totalPoints - a.totalPoints);
  
  console.log("\nTop 40 in Rankings (Cumulative):");
  docs.slice(0, 40).forEach((d, index) => {
    console.log(`${index + 1}. betName: "${d.betName}" | totalPoints: ${d.totalPoints} | key/safeId: "${d.id}" | contestsCount: ${d.contestsCount} | sellerCode: "${d.sellerCode}"`);
  });

  console.log("\nScanning for potential duplicates or anomalies (similar names):");
  // Check for participants with similar base names
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const nameI = docs[i].betName.toUpperCase();
      const nameJ = docs[j].betName.toUpperCase();
      
      // If one name is a substring of the other or very close
      if (nameI.includes(nameJ) || nameJ.includes(nameI)) {
        console.log(` - Potential split/duplicate: "${docs[i].betName}" (${docs[i].totalPoints} pts) vs "${docs[j].betName}" (${docs[j].totalPoints} pts)`);
      }
    }
  }
}

run().then(() => {
  process.exit(0);
}).catch(err => {
  console.error("Query failed:", err);
  process.exit(1);
});
