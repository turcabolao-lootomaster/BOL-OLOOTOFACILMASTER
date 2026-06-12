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

function getNormalizedParticipantKey(name: string): string {
  if (!name) return '';
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  console.log("=== DETAIL ANALYSIS of CONTESTS 5 & 6 ===");
  
  // Get all contests
  const contestsSnap = await getDocs(collection(db, 'contests'));
  const contests = contestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  const closedContests = contests
    .filter(c => c.status === 'encerrado')
    .sort((a, b) => a.number - b.number);
    
  console.log(`\nClosed contests found: ${closedContests.length}`);
  closedContests.forEach(c => {
    console.log(`\nContest #${c.number} (ID: ${c.id}):`);
    c.draws.forEach((d: any, index: number) => {
      console.log(`  - Draw ${index+1} (${d.status}): results = [${d.results ? d.results.join(',') : ''}]`);
    });
  });

  // Let's analyze bets for and scores for each closed contest >= 5
  const activeContestsNum = closedContests.filter(c => c.number >= 5);
  for (const c of activeContestsNum) {
    console.log(`\n================================`);
    console.log(`DETAIL FOR CONTEST #${c.number} (ID: ${c.id})`);
    console.log(`================================`);
    
    const betsSnap = await getDocs(collection(db, 'bets'));
    const allBets = betsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const contestBets = allBets.filter(b => b.contestId === c.id && b.status === 'validado');
    
    console.log(`Total validated bets in Contest #${c.number}: ${contestBets.length}`);
    
    // Let's print out some specific participants or top scorers
    const participantBest: any = {};
    for (const b of contestBets) {
      const hits = b.hits || [0,0,0];
      const totalHits = hits.reduce((x: number, y: number) => x + y, 0);
      const rawName = (b.betName || b.userName || 'PARTICIPANTE').trim();
      const key = getNormalizedParticipantKey(rawName);
      
      if (!participantBest[key] || totalHits > participantBest[key].score) {
        participantBest[key] = {
          rawName,
          key,
          score: totalHits,
          hits,
          numbers: b.numbers,
          betId: b.id
        };
      }
    }
    
    console.log("\nParsed Best Scores for Contest " + c.number + " sorted descending:");
    const sorted = Object.values(participantBest).sort((a: any, b: any) => b.score - a.score);
    sorted.forEach((item: any, idx) => {
      console.log(`  [${idx+1}] name: "${item.rawName}" | key: "${item.key}" | score: ${item.score} | hits: [${item.hits.join(',')}]`);
    });
  }
}

run().then(() => {
  process.exit(0);
}).catch(err => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
