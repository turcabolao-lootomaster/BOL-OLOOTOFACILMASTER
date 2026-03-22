/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User, Bet, Contest, Draw, UserRanking, Commission, ContestStatus, Seller } from '../types';

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
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  async getContestRanking(contestId: string): Promise<any[]> {
    const path = 'bets';
    try {
      const q = query(
        collection(db, 'bets'), 
        where('contestId', '==', contestId),
        where('status', '==', 'validado')
      );
      const querySnapshot = await getDocs(q);
      const bets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
      
      // Group by user and sum hits
      const userHits: { [userId: string]: { userName: string, totalHits: number } } = {};
      
      bets.forEach(bet => {
        const totalHits = (bet.hits || [0, 0, 0]).reduce((acc, h) => acc + h, 0);
        const displayName = bet.betName || bet.userName;
        if (!userHits[bet.userId]) {
          userHits[bet.userId] = { userName: displayName, totalHits: 0 };
        }
        // If user has multiple bets, we might want to show the best one or sum them?
        // Usually, it's the best bet. Let's take the best bet per user for the ranking.
        if (totalHits > userHits[bet.userId].totalHits) {
          userHits[bet.userId].totalHits = totalHits;
          userHits[bet.userId].userName = displayName;
        }
      });

      return Object.entries(userHits)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.totalHits - a.totalHits);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
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

  // Contests
  async getActiveContest(): Promise<Contest | null> {
    const path = 'contests';
    try {
      const q = query(
        collection(db, 'contests'), 
        where('status', 'in', ['aberto', 'em_andamento'])
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contest));
        return docs.sort((a, b) => b.number - a.number)[0];
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

  async updateContestStatus(contestId: string, status: ContestStatus): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      await updateDoc(doc(db, 'contests', contestId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
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

  // Real-time listeners
  subscribeToRanking(callback: (ranking: UserRanking[]) => void) {
    if (!auth.currentUser) {
      return () => {};
    }
    const path = 'users';
    const q = query(
      collection(db, 'users'), 
      orderBy('totalPoints', 'desc'), 
      limit(200)
    );
    
    return onSnapshot(q, (snapshot) => {
      const ranking: UserRanking[] = snapshot.docs.map((doc, index) => ({
        userId: doc.id,
        userName: doc.data().name || 'Usuário',
        points: doc.data().totalPoints || 0,
        position: index + 1
      }));
      callback(ranking);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  // Admin Actions
  async validateBet(betId: string, status: 'validado' | 'rejeitado'): Promise<void> {
    const path = `bets/${betId}`;
    try {
      const docRef = doc(db, 'bets', betId);
      const betSnap = await getDoc(docRef);
      const oldStatus = betSnap.data()?.status;
      
      await updateDoc(docRef, { status });

      // If status changed to 'validado', update seller stats
      if (status === 'validado' && oldStatus !== 'validado') {
        const betData = betSnap.data() as Bet;
        if (betData.sellerCode) {
          const sellersQuery = query(collection(db, 'sellers'), where('code', '==', betData.sellerCode));
          const sellersSnap = await getDocs(sellersQuery);
          if (!sellersSnap.empty) {
            const sellerDoc = sellersSnap.docs[0];
            const sellerData = sellerDoc.data() as Seller;
            const commissionAmount = 10 * (sellerData.commissionPct / 100); // Fixed price R$ 10
            
            await updateDoc(doc(db, 'sellers', sellerDoc.id), {
              totalSales: (sellerData.totalSales || 0) + 1,
              totalCommission: (sellerData.totalCommission || 0) + commissionAmount
            });

            // Create commission record
            await addDoc(collection(db, 'commissions'), {
              sellerId: sellerDoc.id,
              betId: betId,
              amount: commissionAmount,
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

  async createContest(number: number): Promise<void> {
    const path = 'contests';
    try {
      // 1. Close any existing active or in-progress contests
      const activeQuery = query(collection(db, 'contests'), where('status', 'in', ['aberto', 'em_andamento']));
      const activeSnap = await getDocs(activeQuery);
      for (const contestDoc of activeSnap.docs) {
        await updateDoc(doc(db, 'contests', contestDoc.id), { status: 'encerrado' });
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
    } catch (error) {
      console.error('Error resetting all contests:', error);
      throw error;
    }
  },

  // Seller functions
  async getSellerByUserId(userId: string): Promise<Seller | null> {
    const path = 'sellers';
    try {
      const q = query(collection(db, 'sellers'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Seller;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async getSellerRecentSales(sellerCode: string): Promise<Bet[]> {
    const path = 'bets';
    try {
      const q = query(
        collection(db, 'bets'), 
        where('sellerCode', '==', sellerCode),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
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

  async createSeller(seller: Omit<Seller, 'id' | 'totalSales' | 'totalCommission'>): Promise<string> {
    const path = 'sellers';
    try {
      const docRef = await addDoc(collection(db, 'sellers'), {
        ...seller,
        totalSales: 0,
        totalCommission: 0
      });
      
      // Update user role to 'vendedor'
      await updateDoc(doc(db, 'users', seller.userId), { role: 'vendedor' });
      
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async updateDrawResult(contestId: string, drawNumber: number, results: number[]): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      const docRef = doc(db, 'contests', contestId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Contest;
        const updatedDraws = data.draws.map(d => 
          d.number === drawNumber ? { ...d, status: 'concluido', results } : d
        );
        
        const isLastDraw = drawNumber === 3;
        const updateData: any = { draws: updatedDraws };
        if (isLastDraw) {
          updateData.status = 'encerrado';
        }
        
        await updateDoc(docRef, updateData);

        // Update hits for all bets in this contest
        const betsQuery = query(collection(db, 'bets'), where('contestId', '==', contestId));
        const betsSnap = await getDocs(betsQuery);
        
        const userBestScores: { [userId: string]: number } = {};
        
        for (const betDoc of betsSnap.docs) {
          const betData = betDoc.data() as Bet;
          const hits = [...(betData.hits || [0, 0, 0])];
          
          // Calculate hits for this specific draw
          const drawHits = betData.numbers.filter(n => results.includes(n)).length;
          hits[drawNumber - 1] = drawHits;
          
          const totalHits = hits.reduce((a, b) => a + b, 0);
          
          await updateDoc(doc(db, 'bets', betDoc.id), { hits });

          if (isLastDraw && betData.status === 'validado') {
            if (!userBestScores[betData.userId] || totalHits > userBestScores[betData.userId]) {
              userBestScores[betData.userId] = totalHits;
            }
          }
        }

        // If last draw, update users' totalPoints
        if (isLastDraw) {
          for (const [userId, score] of Object.entries(userBestScores)) {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data() as User;
              const currentPoints = userData.totalPoints || 0;
              await updateDoc(userRef, { totalPoints: currentPoints + score });
            }
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
