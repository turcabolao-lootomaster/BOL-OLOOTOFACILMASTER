import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfigJson = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const adminApp = initializeApp({
  projectId: firebaseConfigJson.projectId,
});

const db = getFirestore(adminApp, firebaseConfigJson.firestoreDatabaseId || '(default)');

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
  console.log("=== DB RECONCILIATION REPORT ===");
  
  // 1. Fetch all contests
  const contestsSnap = await db.collection('contests').get();
  const contests = contestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  console.log(`\nTotal Contests: ${contests.length}`);
  
  const closedContests = contests
    .filter(c => c.status === 'encerrado')
    .sort((a,b) => a.number - b.number);
    
  console.log("Closed contests:");
  closedContests.forEach(c => {
    console.log(` - Contest #${c.number} (ID: ${c.id})`);
  });
  
  // 2. Query bets for contest >= 5
  const activeContestsNum = closedContests.filter(c => c.number >= 5);
  for (const c of activeContestsNum) {
    console.log(`\n--- CONTEST #${c.number} (ID: ${c.id}) ---`);
    const betsSnap = await db.collection('bets')
      .where('contestId', '==', c.id)
      .where('status', '==', 'validado')
      .get();
      
    console.log(`Total validated bets in Contest #${c.number}: ${betsSnap.size}`);
    
    // Group and find details
    const contestBestScores: any = {};
    for (const doc of betsSnap.docs) {
      const b = doc.data();
      const hits = b.hits || [0,0,0];
      const totalHits = hits.reduce((x: number, y: number) => x + y, 0);
      const rawName = (b.betName || b.userName || 'PARTICIPANTE').trim();
      const key = getNormalizedParticipantKey(rawName);
      
      if (!contestBestScores[key] || totalHits > contestBestScores[key].score) {
        contestBestScores[key] = {
          rawName,
          key,
          score: totalHits,
          hits,
          numbers: b.numbers,
          betId: doc.id
        };
      }
    }
    
    // Print top 10 best scores
    const sortedScores = Object.values(contestBestScores)
      .sort((a: any, b: any) => b.score - a.score);
      
    console.log("Top scorers parsed in this contest:");
    sortedScores.slice(0, 10).forEach((s: any) => {
      console.log(`   - ${s.rawName} (key: "${s.key}"): ${s.score} pts [${s.hits.join(',')}] (Bet: ${s.betId})`);
    });
  }
}

run().then(() => {
  console.log("\n=== REPORT COMPLETED ===");
  process.exit(0);
}).catch(err => {
  console.error("Diagnostic script failing:", err);
  process.exit(1);
});
