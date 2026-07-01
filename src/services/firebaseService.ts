/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDoc as firestoreGetDoc, 
  getDocs as firestoreGetDocs, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  query, 
  where, 
  onSnapshot as firestoreOnSnapshot,
  Timestamp,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
  getCountFromServer as firestoreGetCountFromServer
} from 'firebase/firestore';

// --- Client-Side Firestore Read Tracking ---
export function trackLocalReads(count: number) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem('reads_date');
    let currentReads = 0;
    
    if (storedDate === today) {
      currentReads = parseInt(localStorage.getItem('reads_count') || '0', 10);
    } else {
      localStorage.setItem('reads_date', today);
    }
    
    currentReads += count;
    localStorage.setItem('reads_count', currentReads.toString());
    
    // Notify application via custom window event
    window.dispatchEvent(new CustomEvent('firestore-reads-updated', { detail: currentReads }));
  } catch (e) {
    console.error('Error tracking reads:', e);
  }
}

export function getLocalReadsToday(): number {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem('reads_date');
    if (storedDate === today) {
      return parseInt(localStorage.getItem('reads_count') || '0', 10);
    }
  } catch (e) {}
  return 0;
}

// Intercept getDoc
async function getDoc(docRef: any): Promise<any> {
  trackLocalReads(1);
  return firestoreGetDoc(docRef);
}

// Intercept getDocs
async function getDocs(q: any): Promise<any> {
  const querySnapshot = await firestoreGetDocs(q);
  trackLocalReads(querySnapshot.size);
  return querySnapshot;
}

// Intercept getCountFromServer
async function getCountFromServer(q: any): Promise<any> {
  const snapshot = await firestoreGetCountFromServer(q);
  const count = snapshot.data().count;
  // Firestore counts 1 read per up to 1000 items in query count
  const reads = Math.max(1, Math.ceil(count / 1000));
  trackLocalReads(reads);
  return snapshot;
}

// Intercept onSnapshot
function onSnapshot(q: any, onNext: (snapshot: any) => void, onError?: (error: any) => void): any {
  let isFirstLoad = true;
  return firestoreOnSnapshot(q, (snapshot: any) => {
    const isQuerySnapshot = typeof snapshot.size === 'number' && Array.isArray(snapshot.docs);
    const size = isQuerySnapshot ? snapshot.size : 1;
    
    if (isFirstLoad) {
      trackLocalReads(size);
      isFirstLoad = false;
    } else {
      if (isQuerySnapshot) {
        const changesCount = snapshot.docChanges().filter((change: any) => change.type === 'added' || change.type === 'modified').length;
        if (changesCount > 0) {
          trackLocalReads(changesCount);
        }
      } else {
        trackLocalReads(1);
      }
    }
    onNext(snapshot);
  }, onError);
}
import { db, auth } from '../firebase';
import { User, Bet, Contest, Draw, UserRanking, Commission, ContestStatus, Seller, Settings, SellerRequest, PageViewStats } from '../types';
import { 
  getLocalStorageData, 
  setLocalStorageData, 
  mockSettings, 
  mockContests, 
  mockBets, 
  mockSellers, 
  mockUsers, 
  mockRankings, 
  mockSellerRequests,
  initializeDemoDatabase
} from './demoData';

export function isDemoMode(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('demo_mode') === 'true';
}

const demoListeners: { [topic: string]: Set<(data: any) => void> } = {};

export function registerDemoListener(topic: string, callback: (data: any) => void): () => void {
  if (!demoListeners[topic]) {
    demoListeners[topic] = new Set();
  }
  demoListeners[topic].add(callback);
  
  // Call immediately with current data
  const currentData = getDemoTopicData(topic);
  callback(currentData);
  
  return () => {
    demoListeners[topic].delete(callback);
  };
}

export function notifyDemoListeners(topic: string) {
  if (demoListeners[topic]) {
    const data = getDemoTopicData(topic);
    demoListeners[topic].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('Error in demo listener callback for topic:', topic, e);
      }
    });
  }
}

function getDemoTopicData(topic: string): any {
  if (topic === 'settings') {
    return getLocalStorageData('demo_settings', mockSettings);
  }
  if (topic === 'activeContest') {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    return contests.find(c => c.status === 'aberto') || contests[contests.length - 1] || null;
  }
  if (topic === 'allUsers') {
    return getLocalStorageData('demo_users', mockUsers);
  }
  if (topic === 'allSellers') {
    return getLocalStorageData('demo_sellers', mockSellers);
  }
  if (topic.startsWith('contestBets_')) {
    const contestId = topic.replace('contestBets_', '');
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    return bets.filter(b => b.contestId === contestId);
  }
  if (topic === 'ranking') {
    return getLocalStorageData('demo_rankings', mockRankings);
  }
  if (topic.startsWith('sellerSales_')) {
    const code = topic.replace('sellerSales_', '');
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    return bets.filter(b => b.sellerCode === code);
  }
  if (topic.startsWith('sellerData_')) {
    const userId = topic.replace('sellerData_', '');
    const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
    return sellers.find(s => s.userId === userId) || null;
  }
  return null;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Custom quota/limit exceeded check
  const errorMsg = errInfo.error.toLowerCase();
  if (errorMsg.includes('quota') || errorMsg.includes('limit exceeded') || errorMsg.includes('resource_exhausted')) {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-error', { detail: errInfo }));
      }
    } catch (e) {
      console.error('Failed to dispatch quota error event:', e);
    }
  }

  throw new Error(JSON.stringify(errInfo));
}

export function getNormalizedParticipantKey(name: string): string {
  if (!name) return '';
  let normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Removes accents
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '') // Keeps only A-Za-z0-9 and spaces
    .replace(/\s+/g, ' ') // Collapses multiple spaces to a single space
    .trim();

  // Custom corrections for typos in participant names
  if (normalized === "CLAUDINEIFERRAZ") return "CLAUDINEI FERRAZ";

  return normalized;
}

const baseFirebaseService = {
  // Seller Requests
  async createSellerRequest(requestData: Omit<SellerRequest, 'id' | 'status' | 'createdAt'>): Promise<void> {
    const docRef = doc(collection(db, 'sellerRequests'));
    await setDoc(docRef, {
      ...requestData,
      status: 'pendente',
      createdAt: serverTimestamp()
    });
  },

  async getAllSellerRequests(): Promise<SellerRequest[]> {
    const q = query(collection(db, 'sellerRequests'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SellerRequest));
  },

  async updateSellerRequestStatus(requestId: string, status: 'aprovado' | 'rejeitado'): Promise<void> {
    const docRef = doc(db, 'sellerRequests', requestId);
    await updateDoc(docRef, { status });
    
    // If approved, we don't automatically create the seller here 
    // to allow the admin to review/edit the code and commission in the UI
    // before final creation. But we'll handle the UI flow to make it easy.
  },

  async deleteSellerRequest(requestId: string): Promise<void> {
    await deleteDoc(doc(db, 'sellerRequests', requestId));
  },

  // Users
  async getUser(userId: string): Promise<User | null> {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async getAllUsers(): Promise<User[]> {
    const path = 'users';
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToAllUsers(callback: (users: User[]) => void) {
    const path = 'users';
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Contests
  subscribeToActiveContest(callback: (contest: Contest | null) => void) {
    const q = query(
      collection(db, 'contests'), 
      orderBy('number', 'desc'),
      limit(1)
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Contest);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contests');
    });
  },

  async getActiveContest(): Promise<Contest | null> {
    const path = 'contests';
    try {
      // First, try to find the newest "aberto" contest
      const qOpen = query(
        collection(db, 'contests'), 
        where('status', '==', 'aberto'),
        orderBy('number', 'desc'),
        limit(1)
      );
      const openSnapshot = await getDocs(qOpen);
      if (!openSnapshot.empty) {
        return { id: openSnapshot.docs[0].id, ...openSnapshot.docs[0].data() } as Contest;
      }

      // Fallback: just get the latest contest regardless of status
      const qLatest = query(
        collection(db, 'contests'), 
        orderBy('number', 'desc'),
        limit(1)
      );
      const latestSnapshot = await getDocs(qLatest);
      if (!latestSnapshot.empty) {
        return { id: latestSnapshot.docs[0].id, ...latestSnapshot.docs[0].data() } as Contest;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return null;
    }
  },

  async getAllContests(): Promise<Contest[]> {
    const path = 'contests';
    try {
      const q = query(
        collection(db, 'contests'), 
        orderBy('number', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contest));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async updateContestStartInfo(contestId: string, startDate: string, startTime: string): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      await updateDoc(doc(db, 'contests', contestId), { startDate, startTime });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateContestStatus(contestId: string, status: ContestStatus): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      const contestRef = doc(db, 'contests', contestId);
      const contestSnap = await getDoc(contestRef);
      const oldStatus = contestSnap.data()?.status;

      console.log(`Updating contest ${contestId} status from ${oldStatus} to ${status}`);
      await updateDoc(contestRef, { status });
      
      // When a contest is finalized, recalculate the general ranking and process seller bonuses
      if (status === 'encerrado' && oldStatus !== 'encerrado') {
        console.log('Contest finalized. Triggering ranking recalculation and bonus processing...');
        // Execute sequentially to ensure clear logs and process flow
        await this.recalculateGeneralRanking();
        await this.processSellerBonuses(contestId);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async processSellerBonuses(contestId: string): Promise<void> {
    console.log(`Processing seller bonuses for contest ${contestId}`);
    try {
      // Fetch all validated bets for this contest
      const betsQuery = query(
        collection(db, 'bets'), 
        where('contestId', '==', contestId), 
        where('status', '==', 'validado')
      );
      const betsSnap = await getDocs(betsQuery);
      const bets = betsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));

      if (bets.length === 0) {
        console.log('No validated bets found for bonus processing.');
        return;
      }

      // Find top winners (1st place) in this contest overall
      let maxPoints = -1;
      bets.forEach(b => {
        const total = (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0);
        if (total > maxPoints) maxPoints = total;
      });

      if (maxPoints <= 0) {
        console.log('No points accumulated in bets. Skipping bonuses.');
        return;
      }

      const winners = bets.filter(b => (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0) === maxPoints);
      console.log(`Found ${winners.length} winners with ${maxPoints} points. Each winner's seller gets a bonus share of R$ 100.`);
      
      // Bonus of R$ 100 divided among winning bets
      const bonusPerWinningBet = 100 / winners.length;
      const batch = writeBatch(db);

      for (const winner of winners) {
        if (winner.sellerCode) {
          const sellersQuery = query(collection(db, 'sellers'), where('code', '==', winner.sellerCode.toUpperCase()));
          const sellersSnap = await getDocs(sellersQuery);
          if (!sellersSnap.empty) {
            const sellerDoc = sellersSnap.docs[0];
            const sellerData = sellerDoc.data() as Seller;
            
            batch.update(doc(db, 'sellers', sellerDoc.id), {
              totalCommission: (sellerData.totalCommission || 0) + bonusPerWinningBet
            });

            // Create commission record for the bonus
            const commRef = doc(collection(db, 'commissions'));
            batch.set(commRef, {
              sellerId: sellerDoc.id,
              betId: winner.id,
              amount: bonusPerWinningBet,
              type: 'bonus_1st_place',
              paid: false,
              createdAt: serverTimestamp()
            });
          }
        }
      }
      await batch.commit();
      console.log('Seller bonuses processed successfully.');
    } catch (error) {
      console.error('Error processing seller bonuses:', error);
    }
  },

  // Bets
  async createBet(bet: Omit<Bet, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const path = 'bets';
    try {
      const docRef = await addDoc(collection(db, 'bets'), {
        ...bet,
        status: 'pendente',
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async getUserBets(userId: string): Promise<Bet[]> {
    const path = 'bets';
    try {
      const q = query(
        collection(db, 'bets'), 
        where('userId', '==', userId), 
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
        } as Bet;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getContestBets(contestId: string): Promise<Bet[]> {
    const path = 'bets';
    try {
      const q = query(
        collection(db, 'bets'), 
        where('contestId', '==', contestId),
        where('status', '==', 'validado')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToContestBets(contestId: string, callback: (bets: Bet[]) => void) {
    const q = query(
      collection(db, 'bets'), 
      where('contestId', '==', contestId),
      where('status', '==', 'validado')
    );
    return onSnapshot(q, (snapshot) => {
      const bets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
      callback(bets);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bets');
    });
  },

  async getContestTotalBets(contestId: string, status?: 'validado' | 'pendente' | 'rejeitado'): Promise<number> {
    const path = 'bets';
    try {
      let q;
      if (status) {
        q = query(
          collection(db, 'bets'), 
          where('contestId', '==', contestId),
          where('status', '==', status)
        );
      } else {
        q = query(
          collection(db, 'bets'), 
          where('contestId', '==', contestId)
        );
      }
      const countSnapshot = await getCountFromServer(q);
      return countSnapshot.data().count;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return 0;
    }
  },

  // Real-time listeners
  subscribeToRanking(callback: (ranking: UserRanking[]) => void, limitCount: number = 100) {
    if (!auth.currentUser) {
      return () => {};
    }
    const path = 'rankings';
    const q = query(
      collection(db, 'rankings'), 
      orderBy('totalPoints', 'desc'), 
      limit(limitCount)
    );
    
    let currentRank = 0;
    let lastScore = -1;
    return onSnapshot(q, (snapshot) => {
      currentRank = 0;
      lastScore = -1;
      const ranking: UserRanking[] = snapshot.docs.map((doc) => {
        const points = doc.data().totalPoints || 0;
        if (points !== lastScore) {
          currentRank++;
          lastScore = points;
        }
        return {
          userId: doc.id,
          userName: doc.data().betName || 'Participante',
          points: points,
          position: currentRank,
          sellerCode: doc.data().sellerCode,
          numbers: doc.data().numbers
        };
      });
      callback(ranking);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async getRanking(limitCount: number = 100): Promise<UserRanking[]> {
    const path = 'rankings';
    try {
      const q = query(
        collection(db, 'rankings'), 
        orderBy('totalPoints', 'desc'), 
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      let currentRank = 0;
      let lastScore = -1;
      return snapshot.docs.map((doc) => {
        const points = doc.data().totalPoints || 0;
        if (points !== lastScore) {
          currentRank++;
          lastScore = points;
        }
        return {
          userId: doc.id,
          userName: doc.data().betName || 'Participante',
          points: points,
          position: currentRank,
          sellerCode: doc.data().sellerCode,
          numbers: doc.data().numbers
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Admin Actions
  async validateBet(betId: string, status: 'validado' | 'rejeitado'): Promise<void> {
    const path = `bets/${betId}`;
    try {
      const docRef = doc(db, 'bets', betId);
      const betSnap = await getDoc(docRef);
      const betData = betSnap.data() as Bet;
      const oldStatus = betData.status;
      
      await updateDoc(docRef, { status });

      // If status changed to 'validado', update seller stats
      if (status === 'validado' && oldStatus !== 'validado') {
        const contestSnap = await getDoc(doc(db, 'contests', betData.contestId));
        const betPrice = contestSnap.exists() ? (contestSnap.data()?.betPrice || 10) : 10;

        if (betData.sellerCode) {
          const sellersQuery = query(collection(db, 'sellers'), where('code', '==', betData.sellerCode));
          const sellersSnap = await getDocs(sellersQuery);
          if (!sellersSnap.empty) {
            const sellerDoc = sellersSnap.docs[0];
            const sellerData = sellerDoc.data() as Seller;
            const commissionAmount = betPrice * (sellerData.commissionPct / 100);
            
            await updateDoc(doc(db, 'sellers', sellerDoc.id), {
              totalSales: (sellerData.totalSales || 0) + 1,
              totalCommission: (sellerData.totalCommission || 0) + commissionAmount
            });

            // Create commission record
            await addDoc(collection(db, 'commissions'), {
              sellerId: sellerDoc.id,
              betId: betId,
              amount: commissionAmount,
              type: 'sale',
              paid: false,
              createdAt: serverTimestamp()
            });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateBet(betId: string, data: Partial<Bet>): Promise<void> {
    const path = `bets/${betId}`;
    try {
      const docRef = doc(db, 'bets', betId);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteBet(betId: string): Promise<void> {
    const path = `bets/${betId}`;
    try {
      const docRef = doc(db, 'bets', betId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getBetsByStatus(status?: 'pendente' | 'validado' | 'rejeitado'): Promise<Bet[]> {
    const path = 'bets';
    try {
      let q = query(collection(db, 'bets'), orderBy('createdAt', 'desc'));
      if (status) {
        q = query(collection(db, 'bets'), where('status', '==', status), orderBy('createdAt', 'desc'));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
        } as Bet;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllPendingBets(): Promise<Bet[]> {
    const path = 'bets';
    try {
      const q = query(
        collection(db, 'bets'), 
        where('status', '==', 'pendente'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async createContest(
    number: number, 
    prizes?: Contest['prizes'], 
    publicLink?: string,
    betPrice?: number,
    prizeConfig?: Contest['prizeConfig'],
    startDate?: string,
    startTime?: string,
    displayPrizes?: Contest['displayPrizes']
  ): Promise<void> {
    const path = 'contests';
    try {
      // 1. Close any existing active or in-progress contests
      const activeQuery = query(collection(db, 'contests'), where('status', 'in', ['aberto', 'em_andamento']));
      const activeSnap = await getDocs(activeQuery);
      for (const contestDoc of activeSnap.docs) {
        await this.updateContestStatus(contestDoc.id, 'encerrado');
      }

      // 2. Create the new contest
      const newContestRef = await addDoc(collection(db, 'contests'), {
        number,
        status: 'aberto',
        draws: [
          { id: '1', number: 1, status: 'pendente', results: [] },
          { id: '2', number: 2, status: 'pendente', results: [] },
          { id: '3', number: 3, status: 'pendente', results: [] },
        ],
        prizes: prizes || {
          draw1: '10 PTS',
          draw2: '10 PTS',
          draw3: '10 PTS',
          rapidinha1: '1° LUGAR',
          rapidinha2: '2° LUGAR',
          rankeada: 'LOTOMASTER'
        },
        publicLink: publicLink || '',
        betPrice: betPrice || 10,
        prizeConfig: prizeConfig || {
          pctRapidinha: 0.10,
          pctChampion: 0.45,
          pctVice: 0.15,
          pctSeller: 0.15,
          pctAdmin: 0.10,
          pctReserve: 0.05
        },
        displayPrizes: displayPrizes || {},
        startDate: startDate || '',
        startTime: startTime || '',
        createdAt: serverTimestamp()
      });

      // 3. Handle repeated bets from the previous contest
      // Find the previous contest number
      const prevContestQuery = query(
        collection(db, 'contests'), 
        where('status', '==', 'encerrado'),
        orderBy('number', 'desc'),
        limit(1)
      );
      const prevContestSnap = await getDocs(prevContestQuery);
      
      if (!prevContestSnap.empty) {
        const prevContest = prevContestSnap.docs[0].data() as Contest;
        const prevContestId = prevContestSnap.docs[0].id;

        // Find bets to repeat
        const repeatQuery = query(
          collection(db, 'bets'), 
          where('contestId', '==', prevContestId),
          where('repeat', '==', true)
        );
        const repeatSnap = await getDocs(repeatQuery);

        for (const betDoc of repeatSnap.docs) {
          const betData = betDoc.data() as Bet;
          // Create new bet for new contest
          await addDoc(collection(db, 'bets'), {
            userId: betData.userId,
            userName: betData.userName,
            betName: betData.betName,
            numbers: betData.numbers,
            contestId: newContestRef.id,
            contestNumber: number,
            status: 'pendente', // New bets start as pending for validation
            repeat: true, // Keep repeating
            sellerCode: betData.sellerCode || '',
            sellerId: betData.sellerId || '',
            createdAt: serverTimestamp(),
            hits: [0, 0, 0]
          });
        }
      }

      // 4. Cleanup old bets (2 contests without participating)
      // This is a bit complex to do in a single pass, but we can check users
      await this.cleanupInactiveUsers(number);

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async cleanupInactiveUsers(currentContestNumber: number): Promise<void> {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data() as User;
        const userId = userDoc.id;

        // Find the last contest this user participated in
        const lastBetQuery = query(
          collection(db, 'bets'),
          where('userId', '==', userId),
          orderBy('contestNumber', 'desc'),
          limit(1)
        );
        const lastBetSnap = await getDocs(lastBetQuery);

        if (!lastBetSnap.empty) {
          const lastBet = lastBetSnap.docs[0].data() as Bet;
          if (currentContestNumber - lastBet.contestNumber > 2) {
            // User hasn't participated for 2 full contests. Delete their bets.
            const userBetsQuery = query(collection(db, 'bets'), where('userId', '==', userId));
            const userBetsSnap = await getDocs(userBetsQuery);
            for (const betDoc of userBetsSnap.docs) {
              await deleteDoc(doc(db, 'bets', betDoc.id));
            }
            console.log(`Deleted bets for inactive user: ${userId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up inactive users:', error);
    }
  },

  async toggleBetRepeat(betId: string, repeat: boolean): Promise<void> {
    const path = `bets/${betId}`;
    try {
      await updateDoc(doc(db, 'bets', betId), { repeat });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async resetAllContests(): Promise<void> {
    try {
      // 1. Delete all bets
      const betsSnap = await getDocs(collection(db, 'bets'));
      for (const betDoc of betsSnap.docs) {
        await deleteDoc(doc(db, 'bets', betDoc.id));
      }

      // 2. Delete all contests
      const contestsSnap = await getDocs(collection(db, 'contests'));
      for (const contestDoc of contestsSnap.docs) {
        await deleteDoc(doc(db, 'contests', contestDoc.id));
      }

      // 3. Reset all users' points
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const userDoc of usersSnap.docs) {
        await updateDoc(doc(db, 'users', userDoc.id), { totalPoints: 0 });
      }

      // 4. Reset all sellers' stats
      const sellersSnap = await getDocs(collection(db, 'sellers'));
      for (const sellerDoc of sellersSnap.docs) {
        await updateDoc(doc(db, 'sellers', sellerDoc.id), { 
          totalSales: 0, 
          totalCommission: 0 
        });
      }

      // 5. Delete all commissions
      const commissionsSnap = await getDocs(collection(db, 'commissions'));
      for (const commDoc of commissionsSnap.docs) {
        await deleteDoc(doc(db, 'commissions', commDoc.id));
      }

      // 6. Delete all rankings
      const rankingsSnap = await getDocs(collection(db, 'rankings'));
      for (const rankDoc of rankingsSnap.docs) {
        await deleteDoc(doc(db, 'rankings', rankDoc.id));
      }
    } catch (error) {
      console.error('Error resetting all contests:', error);
      throw error;
    }
  },

  async resetSellersFinancialStats(): Promise<void> {
    try {
      const sellersSnap = await getDocs(collection(db, 'sellers'));
      for (const sellerDoc of sellersSnap.docs) {
        await updateDoc(doc(db, 'sellers', sellerDoc.id), { 
          totalSales: 0, 
          totalCommission: 0 
        });
      }
    } catch (error) {
      console.error('Error resetting sellers stats:', error);
      throw error;
    }
  },

  async updateContestBasicInfo(contestId: string, number: number, betPrice: number): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      await updateDoc(doc(db, 'contests', contestId), {
        number,
        betPrice
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteContest(contestId: string): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      // Also delete all bets associated with this contest
      const betsQuery = query(collection(db, 'bets'), where('contestId', '==', contestId));
      const betsSnap = await getDocs(betsQuery);
      
      const batch = writeBatch(db);
      for (const betDoc of betsSnap.docs) {
        batch.delete(betDoc.ref);
      }
      batch.delete(doc(db, 'contests', contestId));
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async updateMaintenanceMode(active: boolean, message: string): Promise<void> {
    const path = 'settings/global';
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        maintenanceMode: active,
        maintenanceMessage: message,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  subscribeToSettings(callback: (settings: Settings) => void) {
    const docRef = doc(db, 'settings', 'global');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Settings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
  },

  // Seller functions
  subscribeToSellerSales(sellerCode: string, callback: (bets: Bet[]) => void) {
    const q = query(
      collection(db, 'bets'), 
      where('sellerCode', '==', sellerCode)
    );
    return onSnapshot(q, (snapshot) => {
      const bets = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
        } as Bet;
      }).sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });
      callback(bets);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bets');
    });
  },

  subscribeToSellerData(userId: string, callback: (seller: Seller | null) => void) {
    const q = query(collection(db, 'sellers'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Seller);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sellers');
    });
  },

  async getSellerRecentSales(sellerCode: string): Promise<Bet[]> {
    const path = 'bets';
    try {
      const q = query(
        collection(db, 'bets'), 
        where('sellerCode', '==', sellerCode)
      );
      const querySnapshot = await getDocs(q);
      const bets = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
        } as Bet;
      });
      
      // Sort in memory to avoid index requirements
      return bets.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllSellers(): Promise<Seller[]> {
    const path = 'sellers';
    try {
      const querySnapshot = await getDocs(collection(db, 'sellers'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToAllSellers(callback: (sellers: Seller[]) => void) {
    const path = 'sellers';
    const q = query(collection(db, 'sellers'));
    return onSnapshot(q, (snapshot) => {
      const sellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
      callback(sellers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async createSeller(seller: Omit<Seller, 'id' | 'totalSales' | 'totalCommission'>): Promise<string> {
    const path = 'sellers';
    try {
      const docRef = await addDoc(collection(db, 'sellers'), {
        ...seller,
        totalSales: 0,
        totalCommission: 0,
        blocked: false
      });
      
      // Update user role to 'vendedor', link the seller code and update whatsapp
      const userUpdate: any = { 
        role: 'vendedor',
        linkedSellerCode: seller.code.toUpperCase()
      };

      if (seller.whatsapp) {
        userUpdate.whatsapp = seller.whatsapp;
      }

      await updateDoc(doc(db, 'users', seller.userId), userUpdate);
      
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async updateSeller(sellerId: string, data: Partial<Seller>): Promise<void> {
    const path = `sellers/${sellerId}`;
    try {
      await updateDoc(doc(db, 'sellers', sellerId), data);

      // If updating whatsapp, also update user doc if userId is known
      if (data.whatsapp && data.userId) {
        await updateDoc(doc(db, 'users', data.userId), {
          whatsapp: data.whatsapp
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteSeller(sellerId: string, userId: string, resetRole: boolean = true): Promise<void> {
    const path = `sellers/${sellerId}`;
    try {
      await deleteDoc(doc(db, 'sellers', sellerId));
      if (resetRole) {
        // Only reset to cliente if explicitly requested (usually when deleting, but not when promoting)
        await updateDoc(doc(db, 'users', userId), { role: 'cliente' });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async toggleBlockSeller(sellerId: string, blocked: boolean): Promise<void> {
    const path = `sellers/${sellerId}`;
    try {
      await updateDoc(doc(db, 'sellers', sellerId), { blocked });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateUserRole(userId: string, role: User['role']): Promise<void> {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        // If it's a new anonymous user, ensure basic fields exist
        await setDoc(docRef, {
          id: userId,
          uid: userId,
          createdAt: serverTimestamp(),
          ...data
        });
      } else {
        await updateDoc(docRef, data);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async linkUserToSeller(userId: string, sellerCode: string): Promise<void> {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { linkedSellerCode: sellerCode.toUpperCase() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateContestPrizes(contestId: string, prizes: Contest['prizes']): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      const contestRef = doc(db, 'contests', contestId);
      await updateDoc(contestRef, { prizes });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateContestDisplayPrizes(contestId: string, displayPrizes: Contest['displayPrizes']): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      const contestRef = doc(db, 'contests', contestId);
      await updateDoc(contestRef, { displayPrizes });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateContestPublicLink(contestId: string, publicLink: string): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      const contestRef = doc(db, 'contests', contestId);
      await updateDoc(contestRef, { publicLink });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateContestBetPrice(contestId: string, betPrice: number): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      const contestRef = doc(db, 'contests', contestId);
      await updateDoc(contestRef, { betPrice });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateContestPrizeConfig(contestId: string, prizeConfig: Contest['prizeConfig']): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      const contestRef = doc(db, 'contests', contestId);
      await updateDoc(contestRef, { prizeConfig });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async checkBetNameAvailability(betName: string, userId: string, contestId?: string): Promise<{ available: boolean, message?: string }> {
    if (!betName) return { available: true };
    
    const normalizedNick = betName.trim().toUpperCase();
    if (!normalizedNick) return { available: true };

    const key = normalizedNick.replace(/[^a-zA-Z0-9_]/g, '');
    
    try {
      const reservationRef = doc(db, 'nick_reservations', key);
      const reservationSnap = await getDoc(reservationRef);
      
      if (reservationSnap.exists()) {
        const data = reservationSnap.data();
        if (data.ownerId && data.ownerId !== userId) {
          // Se um contestId foi fornecido (apostando), verifique se o nick já está em uso NESTE concurso
          if (contestId) {
            if (data.lastContestId === contestId) {
              return { 
                available: false, 
                message: `O nome "${normalizedNick}" já está sendo usado por outro participante NESTE CONCURSO. Por favor, escolha um nome diferente.` 
              };
            }
            // Se foi usado em um concurso anterior mas não neste, permite "reclamar" o nick
            return { available: true };
          }
          
          // Fallback se não houver contestId (ex: editando perfil no Dashboard)
          // Verifique o concurso ativo
          const activeContest = await this.getActiveContest();
          if (activeContest && data.lastContestId === activeContest.id) {
            return { 
              available: false, 
              message: `O nome "${normalizedNick}" já está sendo usado por outro participante no concurso atual. Por favor, escolha um nome diferente.` 
            };
          }
        }
      }
      return { available: true };
    } catch (error) {
      return { available: true };
    }
  },

  async reserveNick(betName: string, userId: string, contestId?: string): Promise<void> {
    if (!betName || !userId) return;
    
    const normalizedNick = betName.trim().toUpperCase();
    const key = normalizedNick.replace(/[^a-zA-Z0-9_]/g, '');
    
    try {
      const reservationRef = doc(db, 'nick_reservations', key);
      const reservationData: any = {
        nick: normalizedNick,
        ownerId: userId,
        lastUsed: serverTimestamp()
      };

      if (contestId) {
        reservationData.lastContestId = contestId;
      } else {
        const activeContest = await this.getActiveContest();
        if (activeContest) {
          reservationData.lastContestId = activeContest.id;
        }
      }
      
      await setDoc(reservationRef, reservationData, { merge: true });
    } catch (error) {
      console.error('Erro ao reservar nick:', error);
    }
  },

  async updateDrawResult(contestId: string, drawNumber: number, results: number[], caixaContest?: string, caixaDate?: string): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      const docRef = doc(db, 'contests', contestId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Contest;
        const updatedDraws = data.draws.map(d => 
          d.number === drawNumber ? { 
            ...d, 
            status: 'concluido', 
            results,
            ...(caixaContest ? { caixaContest } : {}),
            ...(caixaDate ? { caixaDate } : {})
          } : d
        );
        
        await updateDoc(docRef, { draws: updatedDraws });

        console.log(`Updated draw ${drawNumber} results in contest ${contestId}`);

        // Update hits for all bets in this contest in batches
        const betsQuery = query(collection(db, 'bets'), where('contestId', '==', contestId));
        const betsSnap = await getDocs(betsQuery);
        
        console.log(`Updating hits for ${betsSnap.size} bets...`);
        
        let batch = writeBatch(db);
        let count = 0;
        
        for (const betDoc of betsSnap.docs) {
          const betData = betDoc.data() as Bet;
          if (!betData.numbers || !Array.isArray(betData.numbers)) {
            console.warn(`Bet ${betDoc.id} has invalid numbers:`, betData.numbers);
            continue;
          }

          const hits = [...(betData.hits || [0, 0, 0])];
          
          // Calculate hits for this specific draw
          // Force numbers to be integers just in case
          const numResults = results.map(n => parseInt(n as any));
          const betNums = betData.numbers.map(n => parseInt(n as any));
          
          const drawHits = betNums.filter(n => numResults.includes(n)).length;
          hits[drawNumber - 1] = drawHits;
          
          batch.update(doc(db, 'bets', betDoc.id), { hits });
          count++;
          
          if (count === 500) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        
        if (count > 0) {
          await batch.commit();
        }
        console.log(`Successfully updated hits for ${betsSnap.size} bets.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async recalculateGeneralRanking(): Promise<void> {
    console.log('Starting recalculateGeneralRanking...');
    try {
      // 1. Get all closed contests
      const contestsSnap = await getDocs(collection(db, 'contests'));
      const closedContests = contestsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Contest))
        .filter(c => c.status === 'encerrado')
        .sort((a, b) => a.number - b.number);
      
      console.log(`Step 1: Found ${closedContests.length} closed contests to process`);
      
      const participantTotals: { 
        [key: string]: { 
          betName: string, 
          sellerCode: string, 
          totalPoints: number, 
          ownerId: string, 
          numbers: number[],
          contestsCount: number 
        } 
      } = {};

      // Certified official points and seller/numbers up to Contest #4 (as of May 22, 2026 PDF)
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

      // Populate base points from official list up to Contest 4
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

      // Filter and only calculate contests starting from #5 dynamically
      const activeContests = closedContests.filter(c => c.number >= 5);

      // Process contests sequentially to avoid overwhelming memory/network
      for (const contest of activeContests) {
        const contestId = contest.id;
        // Get all validated bets for this contest
        const betsQuery = query(
          collection(db, 'bets'), 
          where('contestId', '==', contestId), 
          where('status', '==', 'validado')
        );
        const betsSnap = await getDocs(betsQuery);
        
        console.log(`  Processing Contest #${contest.number}: Found ${betsSnap.size} validated bets`);

        // Group by participant (betName) and take the best score in this contest
        const contestBestScores: { [key: string]: { betName: string, sellerCode: string, score: number, userId: string, numbers: number[] } } = {};
        
        for (const betDoc of betsSnap.docs) {
          const betData = betDoc.data() as Bet;
          const hits = betData.hits || [0, 0, 0];
          const totalHits = hits.reduce((a, b) => a + b, 0);
          
          // Use normalized name for grouping to be safer
          const rawName = (betData.betName || betData.userName || 'PARTICIPANTE').trim();
          const key = getNormalizedParticipantKey(rawName);
          const sellerCode = (betData.sellerCode || '').trim().toUpperCase();
          
          if (!key) continue;

          if (!contestBestScores[key] || totalHits > contestBestScores[key].score) {
            contestBestScores[key] = { betName: rawName, sellerCode, score: totalHits, userId: betData.userId, numbers: betData.numbers };
          }
        }
        
        // Add the best score of this contest to the participant's total
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
          // Keep the latest numbers and seller code
          participantTotals[key].numbers = data.numbers;
          participantTotals[key].sellerCode = data.sellerCode;
          participantTotals[key].betName = data.betName;
          if (data.userId) {
            participantTotals[key].ownerId = data.userId;
          }
        }
      }

      console.log(`Step 2: Calculated totals for ${Object.keys(participantTotals).length} unique participants`);

      // 2. Clear current rankings collection and write new ones in batches
      const rankingsSnap = await getDocs(collection(db, 'rankings'));
      
      // Delete old rankings in batches of 500
      let batch = writeBatch(db);
      let count = 0;
      for (const rankDoc of rankingsSnap.docs) {
        batch.delete(doc(db, 'rankings', rankDoc.id));
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      console.log(`Step 3: Deleted ${rankingsSnap.size} old ranking records`);

      // Write new rankings in batches of 500
      batch = writeBatch(db);
      count = 0;
      const sortedParticipants = Object.values(participantTotals).sort((a, b) => b.totalPoints - a.totalPoints);
      
      let position = 0;
      let lastTotal = -1;
      
      for (const data of sortedParticipants) {
        const key = data.betName;
        if (!key) continue;

        // Calculate position with ties
        if (data.totalPoints !== lastTotal) {
          position++;
          lastTotal = data.totalPoints;
        }
        
        // Use normalized key for document ID safety
        const safeId = getNormalizedParticipantKey(key);
        
        batch.set(doc(db, 'rankings', safeId), {
          ...data,
          position,
          // totalPoints is already in data, and subscribeToRanking uses it
          lastUpdated: serverTimestamp()
        });
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      
      console.log('Step 4: Ranking recalculation finished.');
    } catch (error) {
      console.error('Error in recalculateGeneralRanking:', error);
      handleFirestoreError(error, OperationType.UPDATE, 'rankings');
    }
  },

  async getSettings(): Promise<Settings | null> {
    const path = 'settings/global';
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Settings;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    const path = 'settings/global';
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          ...settings,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(docRef, {
          ...settings,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getSellerByCode(code: string): Promise<Seller | null> {
    const path = 'sellers';
    try {
      const q = query(collection(db, 'sellers'), where('code', '==', code.toUpperCase()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Seller;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async getSellerWhatsApp(sellerId: string): Promise<string | null> {
    const path = `users/${sellerId}`;
    try {
      const docRef = doc(db, 'users', sellerId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userData = docSnap.data() as User;
        return userData.whatsapp || null;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async signInWithSellerCode(code: string, password: string): Promise<User> {
    try {
      const q = query(collection(db, 'sellers'), where('code', '==', code.toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error('Código de vendedor não encontrado.');
      }

      const sellerData = snapshot.docs[0].data() as Seller;
      
      if (sellerData.password !== password) {
        throw new Error('Senha incorreta para este vendedor.');
      }

      const userDoc = await getDoc(doc(db, 'users', sellerData.userId));
      if (!userDoc.exists()) {
        throw new Error('Usuário vinculado ao vendedor não encontrado.');
      }

      return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error: any) {
      console.error('Error signing in with seller code:', error);
      throw error;
    }
  },

  async signInWithClientCode(name: string, sellerCode: string): Promise<User> {
    try {
      // Check if seller exists
      const q = query(collection(db, 'sellers'), where('code', '==', sellerCode.toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error('Código de vendedor inválido.');
      }

      // Create or find a "code-based" user
      const userCode = `code_${name.toLowerCase().replace(/\s+/g, '_')}_${sellerCode.toLowerCase()}`;
      const userRef = doc(db, 'users', userCode);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as User;
      }

      const newUser: User = {
        id: userCode,
        uid: userCode,
        name: name,
        email: '',
        role: 'cliente',
        totalPoints: 0,
        linkedSellerCode: sellerCode.toUpperCase(),
        createdAt: Timestamp.now()
      };

      await setDoc(userRef, newUser);
      return newUser;
    } catch (error: any) {
      console.error('Error signing in with client code:', error);
      throw error;
    }
  },

  async getSellerByUserId(userId: string): Promise<Seller | null> {
    const path = 'sellers';
    try {
      const q = query(collection(db, 'sellers'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Seller;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return null;
    }
  },

  async getUsersBySellerCode(sellerCode: string): Promise<User[]> {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), where('linkedSellerCode', '==', sellerCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async trackPageView(pageId: string, role: string): Promise<void> {
    const statsRef = doc(db, 'system_stats', 'page_views');
    const updates: any = {
      [`${pageId}_total`]: increment(1),
      lastUpdate: serverTimestamp()
    };
    
    if (role === 'master' || role === 'admin') {
      updates[`${pageId}_admins`] = increment(1);
    } else if (role === 'vendedor') {
      updates[`${pageId}_sellers`] = increment(1);
    } else {
      updates[`${pageId}_clients`] = increment(1);
    }

    try {
      await setDoc(statsRef, updates, { merge: true });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  },

  async getPageViewStats(): Promise<any> {
    try {
      const docSnap = await getDoc(doc(db, 'system_stats', 'page_views'));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting page view stats:', error);
      return null;
    }
  }
};

const demoFirebaseService: any = {
  // Seller Requests
  async createSellerRequest(requestData: any): Promise<void> {
    const reqs = getLocalStorageData<any[]>('demo_sellerRequests', mockSellerRequests);
    const newReq = {
      ...requestData,
      id: `demo_req_${Date.now()}`,
      status: 'pendente',
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    };
    reqs.push(newReq);
    setLocalStorageData('demo_sellerRequests', reqs);
  },

  async getAllSellerRequests(): Promise<any[]> {
    return getLocalStorageData<any[]>('demo_sellerRequests', mockSellerRequests);
  },

  async updateSellerRequestStatus(requestId: string, status: any): Promise<void> {
    const reqs = getLocalStorageData<any[]>('demo_sellerRequests', mockSellerRequests);
    const req = reqs.find(r => r.id === requestId);
    if (req) {
      req.status = status;
      setLocalStorageData('demo_sellerRequests', reqs);
    }
  },

  async deleteSellerRequest(requestId: string): Promise<void> {
    const reqs = getLocalStorageData<any[]>('demo_sellerRequests', mockSellerRequests);
    const filtered = reqs.filter(r => r.id !== requestId);
    setLocalStorageData('demo_sellerRequests', filtered);
  },

  // Users
  async getUser(userId: string): Promise<User | null> {
    const users = getLocalStorageData<User[]>('demo_users', mockUsers);
    return users.find(u => u.id === userId) || null;
  },

  async getAllUsers(): Promise<User[]> {
    return getLocalStorageData<User[]>('demo_users', mockUsers);
  },

  subscribeToAllUsers(callback: (users: User[]) => void) {
    return registerDemoListener('allUsers', callback);
  },

  // Contests
  subscribeToActiveContest(callback: (contest: Contest | null) => void) {
    return registerDemoListener('activeContest', callback);
  },

  async getActiveContest(): Promise<Contest | null> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    return contests.find(c => c.status === 'aberto') || contests[contests.length - 1] || null;
  },

  async getAllContests(): Promise<Contest[]> {
    return getLocalStorageData<Contest[]>('demo_contests', mockContests);
  },

  async updateContestStartInfo(contestId: string, startDate: string, startTime: string): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const c = contests.find(con => con.id === contestId);
    if (c) {
      c.startDate = startDate;
      c.startTime = startTime;
      setLocalStorageData('demo_contests', contests);
      notifyDemoListeners('activeContest');
    }
  },

  async updateContestStatus(contestId: string, status: ContestStatus): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const c = contests.find(con => con.id === contestId);
    if (c) {
      c.status = status;
      setLocalStorageData('demo_contests', contests);
      notifyDemoListeners('activeContest');
    }
  },

  async createBet(bet: any): Promise<string> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    const contest = await this.getActiveContest();
    const newBet: Bet = {
      ...bet,
      id: `demo_bet_${Date.now()}`,
      contestNumber: contest?.number || 5,
      createdAt: new Date(),
      status: 'validado',
      hits: [0, 0, 0]
    };
    bets.push(newBet);
    setLocalStorageData('demo_bets', bets);
    notifyDemoListeners(`contestBets_${bet.contestId}`);
    notifyDemoListeners(`sellerSales_${bet.sellerCode}`);
    return newBet.id;
  },

  async getUserBets(userId: string): Promise<Bet[]> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    return bets.filter(b => b.userId === userId);
  },

  async getContestBets(contestId: string): Promise<Bet[]> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    return bets.filter(b => b.contestId === contestId);
  },

  subscribeToContestBets(contestId: string, callback: (bets: Bet[]) => void) {
    return registerDemoListener(`contestBets_${contestId}`, callback);
  },

  async getContestTotalBets(contestId: string, status?: any): Promise<number> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    const contestBets = bets.filter(b => b.contestId === contestId);
    if (status) {
      return contestBets.filter(b => b.status === status).length;
    }
    return contestBets.length;
  },

  subscribeToRanking(callback: (ranking: UserRanking[]) => void, limitCount = 100) {
    return registerDemoListener('ranking', callback);
  },

  async getRanking(limitCount = 100): Promise<UserRanking[]> {
    const r = getLocalStorageData<UserRanking[]>('demo_rankings', mockRankings);
    return r.slice(0, limitCount);
  },

  async validateBet(betId: string, status: any): Promise<void> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    const bet = bets.find(b => b.id === betId);
    if (bet) {
      bet.status = status;
      setLocalStorageData('demo_bets', bets);
      notifyDemoListeners(`contestBets_${bet.contestId}`);
      if (bet.sellerCode) {
        notifyDemoListeners(`sellerSales_${bet.sellerCode}`);
      }
    }
  },

  async updateBet(betId: string, data: any): Promise<void> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    const bet = bets.find(b => b.id === betId);
    if (bet) {
      Object.assign(bet, data);
      setLocalStorageData('demo_bets', bets);
      notifyDemoListeners(`contestBets_${bet.contestId}`);
      if (bet.sellerCode) {
        notifyDemoListeners(`sellerSales_${bet.sellerCode}`);
      }
    }
  },

  async deleteBet(betId: string): Promise<void> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    const bet = bets.find(b => b.id === betId);
    if (bet) {
      const filtered = bets.filter(b => b.id !== betId);
      setLocalStorageData('demo_bets', filtered);
      notifyDemoListeners(`contestBets_${bet.contestId}`);
      if (bet.sellerCode) {
        notifyDemoListeners(`sellerSales_${bet.sellerCode}`);
      }
    }
  },

  async createContest(
    number: number,
    draws: any[],
    startDate: string,
    startTime: string,
    betPrice: number,
    prizes?: any,
    prizeConfig?: any
  ): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const newContest: Contest = {
      id: `demo_contest_${number}`,
      number,
      status: 'aberto',
      draws: draws.map((d, idx) => ({
        id: `demo_draw_${number}_${idx + 1}`,
        number: idx + 1,
        status: 'pendente',
        results: []
      })),
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      betPrice,
      prizes: prizes || {
        draw1: 'A definir',
        draw2: 'A definir',
        draw3: 'A definir',
        rapidinha1: 'A definir',
        rapidinha2: 'A definir',
        rankeada: 'A definir'
      },
      prizeConfig: prizeConfig || {
        fixed10PtsDraw1: 10,
        fixed10PtsDraw2: 10,
        fixed10PtsDraw3: 10,
        fixed25PlusTotal: 50,
        fixed28PlusTotal: 100,
        pctRapidinha: 10,
        pctChampion: 40,
        pctVice: 20,
        pctSeller: 10,
        pctAdmin: 10,
        pctReserve: 10
      },
      startDate,
      startTime
    };
    
    // Close other contests
    contests.forEach(c => {
      if (c.status === 'aberto') c.status = 'encerrado';
    });
    
    contests.push(newContest);
    setLocalStorageData('demo_contests', contests);
    notifyDemoListeners('activeContest');
  },

  async deleteContest(contestId: string): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const filtered = contests.filter(c => c.id !== contestId);
    setLocalStorageData('demo_contests', filtered);
    notifyDemoListeners('activeContest');
  },

  async updateMaintenanceMode(active: boolean, message: string): Promise<void> {
    const settings = getLocalStorageData<Settings>('demo_settings', mockSettings);
    settings.maintenanceMode = active;
    settings.maintenanceMessage = message;
    setLocalStorageData('demo_settings', settings);
    notifyDemoListeners('settings');
  },

  subscribeToSettings(callback: (settings: Settings) => void) {
    return registerDemoListener('settings', callback);
  },

  subscribeToSellerSales(sellerCode: string, callback: (bets: Bet[]) => void) {
    return registerDemoListener(`sellerSales_${sellerCode}`, callback);
  },

  subscribeToSellerData(userId: string, callback: (seller: Seller | null) => void) {
    return registerDemoListener(`sellerData_${userId}`, callback);
  },

  async getSellerRecentSales(sellerCode: string): Promise<Bet[]> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    return bets.filter(b => b.sellerCode === sellerCode).sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateB - dateA;
    });
  },

  async getAllSellers(): Promise<Seller[]> {
    return getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
  },

  subscribeToAllSellers(callback: (sellers: Seller[]) => void) {
    return registerDemoListener('allSellers', callback);
  },

  async createSeller(seller: any): Promise<string> {
    const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
    const newSeller: Seller = {
      ...seller,
      id: `demo_seller_${Date.now()}`,
      totalSales: 0,
      totalCommission: 0
    };
    sellers.push(newSeller);
    setLocalStorageData('demo_sellers', sellers);
    notifyDemoListeners('allSellers');
    return newSeller.id;
  },

  async updateSeller(sellerId: string, data: any): Promise<void> {
    const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
    const s = sellers.find(sel => sel.id === sellerId);
    if (s) {
      Object.assign(s, data);
      setLocalStorageData('demo_sellers', sellers);
      notifyDemoListeners('allSellers');
      notifyDemoListeners(`sellerData_${s.userId}`);
    }
  },

  async deleteSeller(sellerId: string, userId: string, resetRole: boolean = true): Promise<void> {
    const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
    const filtered = sellers.filter(s => s.id !== sellerId);
    setLocalStorageData('demo_sellers', filtered);
    notifyDemoListeners('allSellers');
    notifyDemoListeners(`sellerData_${userId}`);
  },

  async toggleBlockSeller(sellerId: string, blocked: boolean): Promise<void> {
    const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
    const s = sellers.find(sel => sel.id === sellerId);
    if (s) {
      s.blocked = blocked;
      setLocalStorageData('demo_sellers', sellers);
      notifyDemoListeners('allSellers');
      notifyDemoListeners(`sellerData_${s.userId}`);
    }
  },

  async updateUserRole(userId: string, role: any): Promise<void> {
    const users = getLocalStorageData<User[]>('demo_users', mockUsers);
    const u = users.find(usr => usr.id === userId);
    if (u) {
      u.role = role;
      setLocalStorageData('demo_users', users);
      notifyDemoListeners('allUsers');
    }
  },

  async updateUserProfile(userId: string, data: any): Promise<void> {
    const users = getLocalStorageData<User[]>('demo_users', mockUsers);
    const u = users.find(usr => usr.id === userId);
    if (u) {
      Object.assign(u, data);
      setLocalStorageData('demo_users', users);
      notifyDemoListeners('allUsers');
    }
  },

  async updateContestPrizes(contestId: string, prizes: any): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const c = contests.find(con => con.id === contestId);
    if (c) {
      c.prizes = prizes;
      setLocalStorageData('demo_contests', contests);
      notifyDemoListeners('activeContest');
    }
  },

  async updateContestDisplayPrizes(contestId: string, displayPrizes: any): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const c = contests.find(con => con.id === contestId);
    if (c) {
      c.displayPrizes = displayPrizes;
      setLocalStorageData('demo_contests', contests);
      notifyDemoListeners('activeContest');
    }
  },

  async updateContestPublicLink(contestId: string, publicLink: string): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const c = contests.find(con => con.id === contestId);
    if (c) {
      c.publicLink = publicLink;
      setLocalStorageData('demo_contests', contests);
      notifyDemoListeners('activeContest');
    }
  },

  async updateContestBetPrice(contestId: string, betPrice: number): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const c = contests.find(con => con.id === contestId);
    if (c) {
      c.betPrice = betPrice;
      setLocalStorageData('demo_contests', contests);
      notifyDemoListeners('activeContest');
    }
  },

  async updateDrawResult(contestId: string, drawNumber: number, results: number[], caixaContest?: string, caixaDate?: string): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const c = contests.find(con => con.id === contestId);
    if (c) {
      const draw = c.draws.find(d => d.number === drawNumber);
      if (draw) {
        draw.status = 'concluido';
        draw.results = results;
        if (caixaContest) draw.caixaContest = caixaContest;
        if (caixaDate) draw.caixaDate = caixaDate;
        
        // Simular hits para todas as apostas do concurso
        const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
        bets.forEach(b => {
          if (b.contestId === contestId) {
            if (!b.hits) b.hits = [0, 0, 0];
            const hitCount = b.numbers.filter(n => results.includes(n)).length;
            b.hits[drawNumber - 1] = hitCount;
          }
        });
        setLocalStorageData('demo_bets', bets);
        notifyDemoListeners(`contestBets_${contestId}`);
      }
      setLocalStorageData('demo_contests', contests);
      notifyDemoListeners('activeContest');
    }
  },

  async recalculateGeneralRanking(): Promise<void> {
    const users = getLocalStorageData<User[]>('demo_users', mockUsers);
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    
    // Calcular pontos de cada usuário baseado nas apostas validadas
    const pointsMap: Record<string, { name: string, points: number, sellerCode?: string, numbers: number[] }> = {};
    
    bets.filter(b => b.status === 'validado').forEach(b => {
      const uid = b.userId;
      if (!pointsMap[uid]) {
        pointsMap[uid] = { name: b.userName, points: 0, sellerCode: b.sellerCode, numbers: b.numbers };
      }
      const totalBetPoints = (b.hits || [0, 0, 0]).reduce((sum, h) => sum + h, 0);
      pointsMap[uid].points += totalBetPoints;
    });
    
    let rank = 1;
    const ranking: UserRanking[] = Object.keys(pointsMap).map(uid => ({
      userId: uid,
      userName: pointsMap[uid].name,
      points: pointsMap[uid].points,
      position: 1,
      sellerCode: pointsMap[uid].sellerCode,
      numbers: pointsMap[uid].numbers
    })).sort((a, b) => b.points - a.points);
    
    let lastScore = -1;
    ranking.forEach((r, idx) => {
      if (r.points !== lastScore) {
        rank = idx + 1;
        lastScore = r.points;
      }
      r.position = rank;
      
      // Atualizar também no cadastro de usuários demo
      const user = users.find(u => u.id === r.userId);
      if (user) {
        user.totalPoints = r.points;
      }
    });
    
    setLocalStorageData('demo_rankings', ranking);
    setLocalStorageData('demo_users', users);
    notifyDemoListeners('ranking');
    notifyDemoListeners('allUsers');
  },

  async getSettings(): Promise<Settings | null> {
    return getLocalStorageData<Settings>('demo_settings', mockSettings);
  },

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    const current = getLocalStorageData<Settings>('demo_settings', mockSettings);
    const updated = { ...current, ...settings, updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } };
    setLocalStorageData('demo_settings', updated);
    notifyDemoListeners('settings');
  },

  async getSellerByCode(code: string): Promise<Seller | null> {
    const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
    return sellers.find(s => s.code === code.toUpperCase()) || null;
  },

  async getSellerByUserId(userId: string): Promise<Seller | null> {
    const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
    return sellers.find(s => s.userId === userId) || null;
  },

  async getUsersBySellerCode(sellerCode: string): Promise<User[]> {
    const users = getLocalStorageData<User[]>('demo_users', mockUsers);
    return users.filter(u => u.linkedSellerCode === sellerCode.toUpperCase());
  },

  async getPageViewStats(): Promise<any> {
    return {
      adminCount: 15,
      sellerCount: 42,
      clientCount: 118,
      pages: {
        'dashboard': 150,
        'live_ranking': 340,
        'seller_panel': 95,
        'admin_panel': 50
      }
    };
  },

  async processSellerBonuses(contestId: string): Promise<void> {
    console.log(`[Demo Mode] Processed seller bonuses for contest ${contestId}`);
  },

  async getBetsByStatus(status?: 'pendente' | 'validado' | 'rejeitado'): Promise<Bet[]> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    if (status) {
      return bets.filter(b => b.status === status);
    }
    return bets;
  },

  async getAllPendingBets(): Promise<Bet[]> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    return bets.filter(b => b.status === 'pendente');
  },

  async cleanupInactiveUsers(currentContestNumber: number): Promise<void> {
    console.log(`[Demo Mode] Cleanup inactive users for contest ${currentContestNumber}`);
  },

  async toggleBetRepeat(betId: string, repeat: boolean): Promise<void> {
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    const bet = bets.find(b => b.id === betId);
    if (bet) {
      bet.repeat = repeat;
      setLocalStorageData('demo_bets', bets);
      notifyDemoListeners(`contestBets_${bet.contestId}`);
    }
  },

  async resetAllContests(): Promise<void> {
    setLocalStorageData('demo_contests', []);
    setLocalStorageData('demo_bets', []);
    setLocalStorageData('demo_rankings', []);
    notifyDemoListeners('activeContest');
    notifyDemoListeners('ranking');
  },

  async resetSellersFinancialStats(): Promise<void> {
    const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
    sellers.forEach(s => {
      s.totalSales = 0;
      s.totalCommission = 0;
    });
    setLocalStorageData('demo_sellers', sellers);
    notifyDemoListeners('allSellers');
  },

  async updateContestBasicInfo(contestId: string, number: number, betPrice: number): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const c = contests.find(con => con.id === contestId);
    if (c) {
      c.number = number;
      c.betPrice = betPrice;
      setLocalStorageData('demo_contests', contests);
      notifyDemoListeners('activeContest');
    }
  },

  async linkUserToSeller(userId: string, sellerCode: string): Promise<void> {
    const users = getLocalStorageData<User[]>('demo_users', mockUsers);
    const u = users.find(usr => usr.id === userId);
    if (u) {
      u.linkedSellerCode = sellerCode.toUpperCase();
      setLocalStorageData('demo_users', users);
      notifyDemoListeners('allUsers');
    }
  },

  async updateContestPrizeConfig(contestId: string, prizeConfig: any): Promise<void> {
    const contests = getLocalStorageData<Contest[]>('demo_contests', mockContests);
    const c = contests.find(con => con.id === contestId);
    if (c) {
      c.prizeConfig = prizeConfig;
      setLocalStorageData('demo_contests', contests);
      notifyDemoListeners('activeContest');
    }
  },

  async checkBetNameAvailability(betName: string, userId: string, contestId?: string): Promise<{ available: boolean, message?: string }> {
    if (!betName) return { available: true };
    const normalizedNick = betName.trim().toUpperCase();
    if (!normalizedNick) return { available: true };
    
    const bets = getLocalStorageData<Bet[]>('demo_bets', mockBets);
    const activeContest = await this.getActiveContest();
    const targetContestId = contestId || activeContest?.id;
    
    const existing = bets.find(b => b.betName?.toUpperCase() === normalizedNick && b.contestId === targetContestId);
    if (existing && existing.userId !== userId) {
      return {
        available: false,
        message: `O nome "${betName}" já está sendo usado por outro participante neste concurso.`
      };
    }
    return { available: true };
  },

  async reserveNick(betName: string, userId: string, contestId?: string): Promise<void> {
    console.log(`[Demo Mode] Nick reserved: ${betName} for ${userId}`);
  },

  async getSellerWhatsApp(sellerId: string): Promise<string | null> {
    const users = getLocalStorageData<User[]>('demo_users', mockUsers);
    const u = users.find(usr => usr.id === sellerId);
    return u?.whatsapp || null;
  },

  async trackPageView(pageId: string, role: string): Promise<void> {
    // No-op in demo mode
  }
};

export const firebaseService = new Proxy(baseFirebaseService, {
  get(target, prop, receiver) {
    if (isDemoMode() && prop in demoFirebaseService) {
      return Reflect.get(demoFirebaseService, prop, receiver);
    }
    return Reflect.get(target, prop, receiver);
  }
}) as typeof baseFirebaseService;
