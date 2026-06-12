import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch, serverTimestamp, query, where } from 'firebase/firestore';
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
  let normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  if (normalized === "CLAUDINEIFERRAZ") return "CLAUDINEI FERRAZ";
  
  return normalized;
}

const officialC4List = [
  { name: "RODO MIRTO", points: 88, sellerCode: "MAXX", numbers: [2,5,6,9,10,12,19,21,22,24] },
  { name: "RUSSO", points: 86, sellerCode: "ACME", numbers: [5,6,7,9,10,18,19,22,23,24] },
  { name: "PAULA MARQUEZIM - CCT", points: 86, sellerCode: "RENTAL", numbers: [2,6,10,12,15,18,19,23,24,25] },
  { name: "MARCELO VERSAL", points: 83, sellerCode: "ACME", numbers: [2,5,7,9,10,11,16,18,19,21] },
  { name: "GRÊMIO", points: 82, sellerCode: "ALADO", numbers: [2,3,6,10,12,14,19,22,24,25] },
  { name: "ALLAN SPORTBRAS", points: 78, sellerCode: "ALADO", numbers: [1,3,5,8,10,12,14,19,22,25] },
  { name: "CARLOS ARAUJO", points: 77, sellerCode: "ALADO", numbers: [2,3,4,5,6,17,18,19,20,21] },
  { name: "EVANICE CORREIA", points: 67, sellerCode: "ACME", numbers: [2,5,7,8,9,14,15,23,24,25] },
  { name: "A.A.R - BEMA", points: 67, sellerCode: "BEMA", numbers: [2,5,6,9,13,14,15,20,21,24] },
  { name: "TIME MAXX", points: 66, sellerCode: "MAXX", numbers: [5,7,10,14,15,17,19,22,23,24] },
  { name: "MALU", points: 66, sellerCode: "ACME", numbers: [4,9,10,12,13,15,19,20,24,25] },
  { name: "PAULO PORTUGUAL", points: 65, sellerCode: "ALADO", numbers: [1,5,15,18,19,20,21,23,24,25] },
  { name: "ARCE GUSTAVO LOUVEIRA", points: 65, sellerCode: "ACME", numbers: [3,4,5,9,14,19,20,21,23,24] },
  { name: "ZÉ BRITO", points: 64, sellerCode: "ATACADÃO", numbers: [4,5,6,8,12,15,19,20,24,25] },
  { name: "FRENTISTA VELHO", points: 64, sellerCode: "ACME", numbers: [1,3,5,8,10,11,18,21,24,25] },
  { name: "S.D.S. CLUBE 5", points: 63, sellerCode: "ATACADÃO", numbers: [2,5,7,8,11,14,20,21,23,24] },
  { name: "P.P.R", points: 63, sellerCode: "MAXX", numbers: [3,5,6,9,11,13,17,20,23,25] },
  { name: "J.I.M.", points: 63, sellerCode: "BAR DO BOLA", numbers: [2,5,8,9,11,14,19,20,24,25] },
  { name: "BOLA", points: 63, sellerCode: "BAR DO BOLA", numbers: [2,3,4,5,10,16,19,20,21,25] },
  { name: "MOROSA RC", points: 62, sellerCode: "MAXX", numbers: [1,3,5,11,13,14,15,19,20,24] },
  { name: "IGOR MIOTHI", points: 62, sellerCode: "ALADO", numbers: [2,8,10,13,14,15,16,19,24,25] },
  { name: "GUSTAVO DINNER", points: 62, sellerCode: "ADEGA", numbers: [4,9,10,13,14,17,18,20,23,24] },
  { name: "ROBERTO MANUEL", points: 61, sellerCode: "ACME", numbers: [3,8,9,10,13,15,16,17,19,23] },
  { name: "ZÉ PAULO - ESPETINHO", points: 60, sellerCode: "RENTAL", numbers: [2,3,5,8,10,11,15,17,20,24] },
  { name: "TABATA", points: 60, sellerCode: "ACME", numbers: [1,4,11,12,14,17,20,21,24,25] },
  { name: "PEGASUS", points: 60, sellerCode: "ALADO", numbers: [2,4,5,7,12,15,18,22,24,25] },
  { name: "PEDRO SANTOS", points: 60, sellerCode: "ALADO", numbers: [3,5,8,10,13,14,17,19,22,25] },
  { name: "DOLLY", points: 60, sellerCode: "ATACADÃO", numbers: [2,9,10,13,15,16,20,21,22,24] },
  { name: "SALES DE SALES", points: 59, sellerCode: "ACME", numbers: [1,2,3,5,8,12,16,17,18,24] },
  { name: "ASTRA", points: 59, sellerCode: "RENTAL", numbers: [2,5,8,9,11,13,14,15,18,25] },
  { name: "AMÉRICO CAMPOS", points: 57, sellerCode: "ACME", numbers: [1,5,11,12,13,14,18,19,20,22] },
  { name: "ARISTO NETO", points: 46, sellerCode: "BEMA", numbers: [2,6,7,9,10,12,15,20,23,24] },
  { name: "LETE", points: 45, sellerCode: "ALADO", numbers: [5,8,10,13,15,17,19,20,23,24] },
  { name: "DI GERSON ATD", points: 44, sellerCode: "MAXX", numbers: [2,3,8,11,13,15,19,23,24,25] },
  { name: "CLAUDINEI FERRAZ", points: 44, sellerCode: "ALADO", numbers: [1,3,5,8,10,13,15,17,23,25] },
  { name: "VEM 10", points: 43, sellerCode: "MAXX", numbers: [2,3,7,9,12,13,14,19,21,25] },
  { name: "PÉPE SAMUCA", points: 43, sellerCode: "RENTAL", numbers: [2,6,11,13,14,18,19,23,24,25] },
  { name: "MIZUNO", points: 43, sellerCode: "RENTAL", numbers: [1,8,11,15,18,19,20,23,24,25] },
  { name: "ITAJÁ - MARCELO", points: 43, sellerCode: "BAR DO BOLA", numbers: [2,3,7,8,12,14,15,19,24,25] },
  { name: "ANJO", points: 43, sellerCode: "BEMA", numbers: [3,6,11,14,15,19,20,21,23,24] },
  { name: "AMIGOS LOTOFACIL", points: 43, sellerCode: "ADEGA", numbers: [3,5,6,10,12,15,18,19,20,21] },
  { name: "ADRIANO MARIANO", points: 43, sellerCode: "RENTAL", numbers: [1,2,3,5,11,13,15,19,23,25] },
  { name: "VILLA 34", points: 42, sellerCode: "ADEGA", numbers: [3,5,6,9,11,12,13,21,24,25] },
  { name: "PAULO CRUZ", points: 42, sellerCode: "ALADO", numbers: [2,4,7,10,13,15,17,20,23,25] },
  { name: "PANDA", points: 42, sellerCode: "ACME", numbers: [1,2,3,7,9,12,19,21,24,25] },
  { name: "JAMAL", points: 42, sellerCode: "ACME", numbers: [2,5,7,9,10,14,17,19,20,24] },
  { name: "FOFÃO", points: 42, sellerCode: "ALADO", numbers: [7,8,9,12,14,15,18,19,21,22] },
  { name: "ZECA MAGAL", points: 41, sellerCode: "ACME", numbers: [1,2,3,5,9,10,14,16,20,24] },
  { name: "XT.SAHARA", points: 41, sellerCode: "ALADO", numbers: [2,6,10,12,14,18,20,22,24,25] },
  { name: "VIVI", points: 41, sellerCode: "ADEGA", numbers: [2,4,6,9,10,12,13,18,19,20] },
  { name: "MIRTOLA CAMPOS", points: 41, sellerCode: "ACME", numbers: [1,3,4,8,11,13,14,19,20,23] },
  { name: "LOPINHO", points: 41, sellerCode: "ACME", numbers: [1,2,4,5,6,9,12,18,19,24] },
  { name: "JULIANO RIOS", points: 41, sellerCode: "ACME", numbers: [1,2,4,7,8,9,10,13,15,22] },
  { name: "J.J R.J", points: 41, sellerCode: "RENTAL", numbers: [2,3,11,13,14,15,16,18,24,25] },
  { name: "FAZ O L", points: 41, sellerCode: "ALADO", numbers: [1,2,5,10,11,13,20,22,23,25] },
  { name: "CARLOS CUSTÓDIO", points: 41, sellerCode: "ACME", numbers: [1,2,3,7,8,9,10,20,21,22] },
  { name: "BETO SILVESTRE", points: 41, sellerCode: "MAXX", numbers: [2,4,6,7,9,10,13,15,20,23] },
  { name: "TRAVESSO", points: 40, sellerCode: "ADEGA", numbers: [1,2,7,9,12,13,14,19,20,24] },
  { name: "NALDO FONSECA", points: 40, sellerCode: "ATACADÃO", numbers: [7,8,10,14,16,19,20,21,22,24] },
  { name: "GOMES", points: 40, sellerCode: "ACME", numbers: [2,5,9,14,15,17,20,22,23,24] },
  { name: "COROLLA", points: 40, sellerCode: "RENTAL", numbers: [2,8,11,13,14,17,19,21,23,24] },
  { name: "CHICÃO", points: 40, sellerCode: "BEMA", numbers: [4,5,7,9,12,15,20,23,24,25] },
  { name: "CARMITA", points: 40, sellerCode: "ALADO", numbers: [1,2,7,8,13,14,19,20,21,22] },
  { name: "C200", points: 40, sellerCode: "ACME", numbers: [2,3,9,10,13,15,21,22,24,25] },
  { name: "SHOOPE", points: 39, sellerCode: "MAXX", numbers: [1,6,10,13,15,17,18,19,22,24] },
  { name: "SAMUEL PAULISTA", points: 39, sellerCode: "BEMA", numbers: [6,7,12,13,18,21,22,23,24,25] },
  { name: "REI DO BOI", points: 39, sellerCode: "MAXX", numbers: [1,3,6,7,9,11,13,18,22,24] },
  { name: "GUSTAVO SILVA", points: 39, sellerCode: "RENTAL", numbers: [2,4,5,9,11,15,17,18,21,22] },
  { name: "GOIANO - POA", points: 39, sellerCode: "ACME", numbers: [1,2,4,7,10,11,14,17,20,23] },
  { name: "GAPARINNY", points: 39, sellerCode: "ACME", numbers: [1,8,9,10,11,16,17,20,22,24] },
  { name: "FLÁVIO CAVALINHO", points: 39, sellerCode: "RENTAL", numbers: [1,4,5,6,10,12,13,15,21,25] },
  { name: "ALEXANDRE SOCORRO VT", points: 39, sellerCode: "RENTAL", numbers: [3,4,9,10,14,15,16,22,24,25] },
  { name: "1DASUL", points: 39, sellerCode: "ACME", numbers: [1,3,5,8,10,14,15,21,22,24] },
  { name: "VELHO AMIGO", points: 38, sellerCode: "RENTAL", numbers: [1,9,11,13,17,18,20,21,24,25] },
  { name: "RICH888", points: 38, sellerCode: "ALADO", numbers: [1,3,4,5,6,8,10,11,12,20] },
  { name: "EQUIPE ZR", points: 38, sellerCode: "ACME", numbers: [4,7,8,11,13,16,17,19,20,23] },
  { name: "DOUGLAS DIMARCO", points: 38, sellerCode: "ATACADÃO", numbers: [2,3,5,11,12,13,16,19,23,25] },
  { name: "DIOGO SIMEI", points: 38, sellerCode: "MAXX", numbers: [3,6,7,9,12,16,17,19,24,25] },
  { name: "CASEMIRO", points: 38, sellerCode: "ACME", numbers: [2,9,10,11,16,17,19,20,21,24] },
  { name: "ALEXANDRE PADARIA", points: 38, sellerCode: "RENTAL", numbers: [3,6,7,10,12,14,15,19,20,24] },
  { name: "ADA", points: 38, sellerCode: "MAXX", numbers: [1,2,4,12,13,14,17,18,24,25] },
  { name: "TARCÍSIO MULA", points: 37, sellerCode: "ACME", numbers: [5,6,7,8,15,16,18,19,20,21] },
  { name: "PAULO PORTUGAL", points: 37, sellerCode: "ALADO", numbers: [1,3,5,7,12,19,21,22,23,25] },
  { name: "NICOLAS NIKO", points: 37, sellerCode: "ACME", numbers: [2,6,7,9,11,14,15,16,17,22] },
  { name: "LUIZ JUIZ", points: 37, sellerCode: "ACME", numbers: [1,3,5,12,13,14,20,21,22,25] },
  { name: "LEONEL FERNANDO PERFE", points: 37, sellerCode: "ADEGA", numbers: [1,3,12,13,16,17,19,20,21,24] },
  { name: "LATÃO", points: 37, sellerCode: "ACME", numbers: [2,3,7,11,17,19,20,22,23,24] },
  { name: "CATUABA", points: 37, sellerCode: "ADEGA", numbers: [1,3,5,7,9,12,14,15,16,18] },
  { name: "CAIQUE FLECHA", points: 37, sellerCode: "ADEGA", numbers: [3,4,6,9,11,16,18,19,21,24] },
  { name: "ROMIRLEY", points: 36, sellerCode: "ALADO", numbers: [1,2,3,7,9,13,15,19,24,25] },
  { name: "MINEIRO", points: 36, sellerCode: "BAR DO BOLA", numbers: [1,4,5,6,13,17,19,20,22,23] },
  { name: "IMORTAL", points: 36, sellerCode: "ALADO", numbers: [2,3,8,13,15,16,17,19,20,25] },
  { name: "DOM PEDRO NEGRONY", points: 36, sellerCode: "ADEGA", numbers: [1,9,10,12,13,14,18,19,20,22] },
  { name: "BENTO", points: 35, sellerCode: "ACME", numbers: [2,4,7,9,10,12,15,20,24,25] },
  { name: "HUGO", points: 34, sellerCode: "MAXX", numbers: [1,4,8,9,10,13,15,16,17,20] },
  { name: "COBRE", points: 33, sellerCode: "ADEGA", numbers: [1,2,5,11,15,16,17,19,20,24] },
  { name: "BIEL", points: 33, sellerCode: "ACME", numbers: [1,2,5,12,16,17,18,19,23,25] },
  { name: "AUERA MIRANDA", points: 33, sellerCode: "ACME", numbers: [2,4,7,11,15,17,21,22,24,25] },
  { name: "W-ROMA", points: 24, sellerCode: "RENTAL", numbers: [2,6,8,9,10,11,15,19,24,25] },
  { name: "VICK / MARCELL", points: 24, sellerCode: "BEMA", numbers: [2,3,6,8,9,12,14,15,19,24] }
];

async function run() {
  console.log("=== STARTING GENERAL RECALCULATION ===");

  // 1. Get closed contests
  const contestsSnap = await getDocs(collection(db, 'contests'));
  const closedContests = contestsSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as any))
    .filter(c => c.status === 'encerrado')
    .sort((a,b) => a.number - b.number);
    
  console.log(`Found ${closedContests.length} closed contests`);

  const participantTotals: { [key: string]: any } = {};

  // Populate base points (from contest 4 backwards)
  officialC4List.forEach(p => {
    const key = getNormalizedParticipantKey(p.name);
    participantTotals[key] = {
      betName: p.name,
      sellerCode: p.sellerCode,
      totalPoints: p.points,
      ownerId: "",
      numbers: p.numbers,
      contestsCount: 4
    };
  });

  const activeContests = closedContests.filter(c => c.number >= 5);

  const betsSnap = await getDocs(collection(db, 'bets'));
  const allBets = betsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

  for (const contest of activeContests) {
    const contestBets = allBets.filter(b => b.contestId === contest.id && b.status === 'validado');
    console.log(`Processing Contest #${contest.number}: Found ${contestBets.length} validated bets`);

    const contestBestScores: { [key: string]: any } = {};
    for (const b of contestBets) {
      const hits = b.hits || [0, 0, 0];
      const totalHits = hits.reduce((x, y) => x + y, 0);
      const rawName = (b.betName || b.userName || 'PARTICIPANTE').trim();
      const key = getNormalizedParticipantKey(rawName);
      
      if (!key) continue;

      if (!contestBestScores[key] || totalHits > contestBestScores[key].score) {
        contestBestScores[key] = {
          betName: rawName,
          sellerCode: (b.sellerCode || '').trim().toUpperCase(),
          score: totalHits,
          userId: b.userId || '',
          numbers: b.numbers || []
        };
      }
    }

    for (const [key, data] of Object.entries(contestBestScores)) {
      if (!participantTotals[key]) {
        participantTotals[key] = {
          betName: data.betName,
          sellerCode: data.sellerCode,
          totalPoints: 0,
          ownerId: data.userId,
          numbers: data.numbers,
          contestsCount: 0
        };
      }
      participantTotals[key].totalPoints += data.score;
      participantTotals[key].contestsCount += 1;
      participantTotals[key].numbers = data.numbers;
      participantTotals[key].sellerCode = data.sellerCode;
      participantTotals[key].betName = data.betName;
      if (data.userId) {
        participantTotals[key].ownerId = data.userId;
      }
    }
  }

  // Double check our RODO MIRTO points
  const rmKey = getNormalizedParticipantKey("RODO MIRTO");
  if (participantTotals[rmKey]) {
    console.log(`DEBUG: RODO MIRTO total computed is ${participantTotals[rmKey].totalPoints} points over ${participantTotals[rmKey].contestsCount} contests`);
  }

  // 2. Clear current rankings collection and write new ones
  const rankingsSnap = await getDocs(collection(db, 'rankings'));
  console.log(`Current items in rankings: ${rankingsSnap.size}`);

  let deleteBatch = writeBatch(db);
  let count = 0;
  for (const rankDoc of rankingsSnap.docs) {
    deleteBatch.delete(doc(db, 'rankings', rankDoc.id));
    count++;
    if (count === 500) {
      await deleteBatch.commit();
      deleteBatch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) {
    await deleteBatch.commit();
  }
  console.log("Successfully wiped previous rankings.");

  // Write new rankings
  let writeBatchObj = writeBatch(db);
  count = 0;
  const sorted = Object.values(participantTotals).sort((a: any, b: any) => b.totalPoints - a.totalPoints);
  
  let position = 0;
  let lastTotal = -1;

  for (const data of sorted) {
    const key = data.betName;
    if (!key) continue;

    if (data.totalPoints !== lastTotal) {
      position++;
      lastTotal = data.totalPoints;
    }

    const safeId = getNormalizedParticipantKey(key);
    writeBatchObj.set(doc(db, 'rankings', safeId), {
      ...data,
      position,
      lastUpdated: serverTimestamp()
    });
    count++;

    if (count === 500) {
      await writeBatchObj.commit();
      writeBatchObj = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) {
    await writeBatchObj.commit();
  }

  console.log(`Successfully wrote ${sorted.length} rankings docs!`);
}

run().then(() => {
  console.log("=== FINISHED RECALCULATING ===");
  process.exit(0);
}).catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
