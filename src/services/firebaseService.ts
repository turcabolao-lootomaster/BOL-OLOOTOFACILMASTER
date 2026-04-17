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
  setDoc,
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
import { User, Bet, Contest, Draw, UserRanking, Commission, ContestStatus, Seller, Settings, SellerRequest } from '../types';

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

  async updateContestStatus(contestId: string, status: ContestStatus): Promise<void> {
    const path = `contests/${contestId}`;
    try {
      await updateDoc(doc(db, 'contests', contestId), { status });
      // When a contest is finalized, recalculate the general ranking to ensure accuracy
      if (status === 'encerrado') {
        await this.recalculateGeneralRanking();
      }
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
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
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
    prizeConfig?: Contest['prizeConfig']
  ): Promise<void> {
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

  async checkBetNameAvailability(betName: string, userId: string): Promise<{ available: boolean, message?: string }> {
    if (!betName) return { available: true };
    
    const normalizedNick = betName.trim().toUpperCase();
    if (!normalizedNick) return { available: true };

    const key = normalizedNick.replace(/[^a-zA-Z0-9_]/g, '');
    const path = `nick_reservations/${key}`;
    
    try {
      const reservationRef = doc(db, 'nick_reservations', key);
      const reservationSnap = await getDoc(reservationRef);
      
      if (reservationSnap.exists()) {
        const data = reservationSnap.data();
        if (data.ownerId && data.ownerId !== userId) {
          return { 
            available: false, 
            message: `O nome "${normalizedNick}" já está sendo usado por outro participante. Por favor, escolha um nome diferente para garantir que seus pontos sejam computados corretamente.` 
          };
        }
      }
      return { available: true };
    } catch (error) {
      // If it's just a "not found" or similar, it's available
      return { available: true };
    }
  },

  async reserveNick(betName: string, userId: string): Promise<void> {
    if (!betName || !userId) return;
    
    const normalizedNick = betName.trim().toUpperCase();
    const key = normalizedNick.replace(/[^a-zA-Z0-9_]/g, '');
    
    try {
      const reservationRef = doc(db, 'nick_reservations', key);
      const reservationSnap = await getDoc(reservationRef);
      
      if (!reservationSnap.exists()) {
        await setDoc(reservationRef, {
          nick: normalizedNick,
          ownerId: userId,
          createdAt: serverTimestamp(),
          lastUsed: serverTimestamp()
        });
      } else {
        // Update last used
        await updateDoc(reservationRef, {
          lastUsed: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Erro ao reservar nick:', error);
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
        
        await updateDoc(docRef, updateData);

        // Update hits for all bets in this contest
        const betsQuery = query(collection(db, 'bets'), where('contestId', '==', contestId));
        const betsSnap = await getDocs(betsQuery);
        
        for (const betDoc of betsSnap.docs) {
          const betData = betDoc.data() as Bet;
          const hits = [...(betData.hits || [0, 0, 0])];
          
          // Calculate hits for this specific draw
          const drawHits = betData.numbers.filter(n => results.includes(n)).length;
          hits[drawNumber - 1] = drawHits;
          
          await updateDoc(doc(db, 'bets', betDoc.id), { hits });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async recalculateGeneralRanking(): Promise<void> {
    console.log('Starting recalculateGeneralRanking...');
    try {
      // 1. Get all contests and filter/sort in memory to avoid composite index requirement
      const contestsSnap = await getDocs(collection(db, 'contests'));
      console.log(`Found ${contestsSnap.size} total contests`);
      const closedContests = contestsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Contest))
        .filter(c => c.status === 'encerrado')
        .sort((a, b) => a.number - b.number);
      
      console.log(`Found ${closedContests.length} closed contests`);
      const participantTotals: { [key: string]: { betName: string, sellerCode: string, totalPoints: number, ownerId: string, numbers: number[] } } = {};

      for (const contest of closedContests) {
        const contestId = contest.id;
        console.log(`Processing contest #${contest.number} (${contestId})`);
        // Get all validated bets for this contest
        const betsQuery = query(
          collection(db, 'bets'), 
          where('contestId', '==', contestId), 
          where('status', '==', 'validado')
        );
        const betsSnap = await getDocs(betsQuery);
        console.log(`Found ${betsSnap.size} validated bets for contest #${contest.number}`);
        
        // Group by participant (betName + sellerCode) and take the best score in this contest
        // Rule: A participant can have multiple bets with different names (e.g., "ROMARIO" and "VALMIR").
        // For each unique name + seller combination, only the best bet in the contest counts for the general ranking.
        const contestBestScores: { [key: string]: { betName: string, sellerCode: string, score: number, userId: string, numbers: number[] } } = {};
        
        for (const betDoc of betsSnap.docs) {
          const betData = betDoc.data() as Bet;
          const hits = betData.hits || [0, 0, 0];
          const totalHits = hits.reduce((a, b) => a + b, 0);
          const betName = (betData.betName || betData.userName || 'Participante').trim().toUpperCase();
          const sellerCode = (betData.sellerCode || '').trim().toUpperCase();
          const key = betName; // Use only betName as key for global ranking
          
          if (!key) continue;

          if (!contestBestScores[key] || totalHits > contestBestScores[key].score) {
            contestBestScores[key] = { betName, sellerCode, score: totalHits, userId: betData.userId, numbers: betData.numbers };
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
              numbers: data.numbers
            };
          }
          participantTotals[key].totalPoints += data.score;
        }
      }

      console.log(`Recalculated totals for ${Object.keys(participantTotals).length} participants`);

      // 2. Clear current rankings collection and write new ones in batches
      const rankingsSnap = await getDocs(collection(db, 'rankings'));
      const { writeBatch } = await import('firebase/firestore');
      
      // Delete old rankings in batches of 500
      console.log(`Deleting ${rankingsSnap.size} old rankings...`);
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

      // Write new rankings in batches of 500
      console.log(`Writing ${Object.keys(participantTotals).length} new rankings...`);
      batch = writeBatch(db);
      count = 0;
      for (const [key, data] of Object.entries(participantTotals)) {
        if (!key) continue;
        batch.set(doc(db, 'rankings', key), {
          ...data,
          createdAt: serverTimestamp(),
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
      console.log('RecalculateGeneralRanking completed successfully!');
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

  subscribeToSettings(callback: (settings: Settings | null) => void) {
    const docRef = doc(db, 'settings', 'global');
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as Settings);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
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
  }
};
