/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInAnonymously,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, onSnapshot, query, collection, where, getDocs, updateDoc, or, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole, Seller } from '../types';
import { isDemoMode } from '../services/firebaseService';
import { mockMasterUser, getLocalStorageData, setLocalStorageData, mockSellers, mockUsers } from '../services/demoData';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithWhatsApp: (phone: string, name?: string, sellerCode?: string) => Promise<void>;
  signInWithSellerCode: (code: string, password: string) => Promise<void>;
  signInWithClientCode: (name: string, sellerCode: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;
    let unsubscribeAuth: (() => void) | undefined;

    const initAuth = async () => {
      if (isDemoMode()) {
        const demoUser = getLocalStorageData<User | null>('demo_user', mockMasterUser);
        setUser(demoUser);
        setLoading(false);
        return;
      }
      try {
        unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
          
          if (unsubscribeUser) unsubscribeUser();
          
          if (firebaseUser) {
            // Listen using 'or' to support both legacy single 'uid' tracking and real-time multi-device 'uids' list tracking
            const q = query(
              collection(db, 'users'),
              or(
                where('uid', '==', firebaseUser.uid),
                where('uids', 'array-contains', firebaseUser.uid)
              )
            );
            
            unsubscribeUser = onSnapshot(q, async (snapshot) => {
              if (!snapshot.empty) {
                // If multiple docs found, prefer the one that is NOT just the UID (wa_ or code_)
                // This happens when a pre-existing user (e.g. created by admin) gets linked to a new UID
                const bestDoc = snapshot.docs.find(d => d.id !== firebaseUser.uid) || snapshot.docs[0];
                const data = bestDoc.data() as User;
                setUser({ id: bestDoc.id, ...data });
                setLoading(false);
              } else {
                // No document found with this UID yet.
                // Wait a bit to see if a custom login method links it (seller login)
                // If not, created a default one after a small delay
                setTimeout(async () => {
                  // Re-check if still empty after delay
                  const secondCheck = await getDocs(q);
                  if (secondCheck.empty && auth.currentUser?.uid === firebaseUser.uid) {
                    const isMaster = firebaseUser.email === 'turcabolao@gmail.com';
                    const newUser: User = {
                      id: firebaseUser.uid,
                      uid: firebaseUser.uid,
                      uids: [firebaseUser.uid],
                      name: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Visitante' : 'Usuário'),
                      email: firebaseUser.email || '',
                      role: isMaster ? 'master' : 'cliente',
                      totalPoints: 0,
                      createdAt: Timestamp.now()
                    };
                    
                    try {
                      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
                      await setDoc(doc(db, 'uids', firebaseUser.uid), { userId: firebaseUser.uid });
                      // Snapshot will pick this up on next emission
                    } catch (err) {
                      console.error('Error creating default user doc:', err);
                    }
                  }
                }, 2000);
              }
            }, (error) => {
              console.error('Error in user query snapshot:', error);
              const errorMsg = error instanceof Error ? error.message : String(error);
              if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit exceeded') || errorMsg.toLowerCase().includes('resource_exhausted')) {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('firestore-quota-error', { 
                    detail: { error: errorMsg, operationType: 'list', path: 'users' } 
                  }));
                }
              }
              setLoading(false);
            });
          } else {
            setUser(null);
            setLoading(false);
          }
        }, (error) => {
          console.error('onAuthStateChanged error:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit exceeded') || errorMsg.toLowerCase().includes('resource_exhausted')) {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('firestore-quota-error', { 
                detail: { error: errorMsg, operationType: 'get', path: 'auth' } 
              }));
            }
          }
          setLoading(false);
        });
      } catch (error) {
        console.error('initAuth error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit exceeded') || errorMsg.toLowerCase().includes('resource_exhausted')) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('firestore-quota-error', { 
              detail: { error: errorMsg, operationType: 'get', path: 'auth' } 
            }));
          }
        }
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (isDemoMode()) {
      setLocalStorageData('demo_user', mockMasterUser);
      setUser(mockMasterUser);
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Erro no login com Google:', error);
      throw error;
    }
  };

  const signInWithWhatsApp = async (phone: string, name?: string, sellerCode?: string) => {
    if (isDemoMode()) {
      const demoUser: User = {
        id: `demo_wa_${phone}`,
        uid: `demo_wa_${phone}`,
        uids: [`demo_wa_${phone}`],
        name: name || `User ${phone.slice(-4)}`,
        email: '',
        whatsapp: phone,
        role: 'cliente',
        totalPoints: 0,
        linkedSellerCode: sellerCode?.toUpperCase() || '',
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };
      setLocalStorageData('demo_user', demoUser);
      setUser(demoUser);
      return;
    }
    try {
      // 1. Sign in anonymously to interact with Firestore
      const { user: firebaseUser } = await signInAnonymously(auth);
      
      // 2. Search for existing user with this WhatsApp
      const q = query(collection(db, 'users'), where('whatsapp', '==', phone));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Update existing user with new UID and append UID to uids array for multi-device synchronization
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as User;
        const updates: any = { 
          uid: firebaseUser.uid,
          uids: arrayUnion(firebaseUser.uid)
        };
        
        // Update name if current is generic and a new one was provided
        if (name && (!userData.name || userData.name.startsWith('User '))) {
          updates.name = name;
        }

        // If user doesn't have a linked seller but one was provided, link it
        if (!userData.linkedSellerCode && sellerCode) {
          updates.linkedSellerCode = sellerCode.toUpperCase();
        }
        
        await updateDoc(doc(db, 'users', userDoc.id), updates);
        await setDoc(doc(db, 'uids', firebaseUser.uid), { userId: userDoc.id });
      } else {
        // Create new user
        const userId = `wa_${phone}`;
        const newUser: User = {
          id: userId,
          uid: firebaseUser.uid,
          uids: [firebaseUser.uid],
          name: name || `User ${phone.slice(-4)}`,
          email: '',
          whatsapp: phone,
          role: 'cliente',
          totalPoints: 0,
          linkedSellerCode: sellerCode?.toUpperCase() || '',
          createdAt: Timestamp.now()
        };
        await setDoc(doc(db, 'users', userId), newUser);
        await setDoc(doc(db, 'uids', firebaseUser.uid), { userId: userId });
      }
    } catch (error) {
      console.error('Erro no login com WhatsApp:', error);
      throw error;
    }
  };

  const signInWithSellerCode = async (code: string, password: string) => {
    if (isDemoMode()) {
      const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
      const seller = sellers.find(s => s.code === code.toUpperCase());
      if (!seller) {
        throw new Error('Código de vendedor inválido.');
      }
      if (seller.password !== password) {
        throw new Error('Senha de vendedor incorreta.');
      }
      if (seller.blocked) {
        throw new Error('O seu acesso de colaborador está bloqueado. Entre em contato com o suporte.');
      }
      const users = getLocalStorageData<User[]>('demo_users', mockUsers);
      const sellerUser = users.find(u => u.id === seller.userId);
      if (!sellerUser) {
        throw new Error('Usuário do vendedor não encontrado.');
      }
      setLocalStorageData('demo_user', sellerUser);
      setUser(sellerUser);
      return;
    }
    try {
      const { user: firebaseUser } = await signInAnonymously(auth);
      
      // 1. Search for seller with this code
      const qSeller = query(collection(db, 'sellers'), where('code', '==', code.toUpperCase()));
      const sellerSnap = await getDocs(qSeller);
      
      if (sellerSnap.empty) {
        throw new Error('Código de vendedor inválido.');
      }

      const sellerData = sellerSnap.docs[0].data();
      
      // 2. Validate Password and Blocked Status
      if (!sellerData.password || sellerData.password !== password) {
        throw new Error('Senha de vendedor incorreta.');
      }

      if (sellerData.blocked) {
        throw new Error('O seu acesso de colaborador está bloqueado. Entre em contato com o suporte.');
      }

      const sellerUserId = sellerData.userId;

      // 3. Get the user document for this seller
      const userDocRef = doc(db, 'users', sellerUserId);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        throw new Error('Usuário do vendedor não encontrado.');
      }

      // 4. Link the anonymous UID to this seller user and append UID to uids array for multi-device sync
      await updateDoc(userDocRef, { 
        uid: firebaseUser.uid,
        uids: arrayUnion(firebaseUser.uid)
      });
      await setDoc(doc(db, 'uids', firebaseUser.uid), { userId: sellerUserId });
      
    } catch (error) {
      console.error('Erro no login com código de vendedor:', error);
      throw error;
    }
  };

  const signInWithClientCode = async (name: string, sellerCode: string) => {
    if (isDemoMode()) {
      const sellers = getLocalStorageData<Seller[]>('demo_sellers', mockSellers);
      const seller = sellers.find(s => s.code === sellerCode.toUpperCase());
      if (!seller) {
        throw new Error('Código de vendedor inválido. Peça o código correto ao seu vendedor.');
      }
      const demoUser: User = {
        id: `demo_client_${name.replace(/\s+/g, '_')}_${sellerCode.toUpperCase()}`,
        uid: `demo_client_${name.replace(/\s+/g, '_')}_${sellerCode.toUpperCase()}`,
        uids: [`demo_client_${name.replace(/\s+/g, '_')}_${sellerCode.toUpperCase()}`],
        name: name,
        email: '',
        role: 'cliente',
        totalPoints: 0,
        linkedSellerCode: sellerCode.toUpperCase(),
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };
      setLocalStorageData('demo_user', demoUser);
      setUser(demoUser);
      return;
    }
    try {
      const { user: firebaseUser } = await signInAnonymously(auth);
      
      // 1. Validate Seller Code
      const qSeller = query(collection(db, 'sellers'), where('code', '==', sellerCode.toUpperCase()));
      const sellerSnap = await getDocs(qSeller);
      
      if (sellerSnap.empty) {
        throw new Error('Código de vendedor inválido. Peça o código correto ao seu vendedor.');
      }

      // 2. Search for existing client with this name under this seller
      const qClient = query(
        collection(db, 'users'), 
        where('name', '==', name),
        where('linkedSellerCode', '==', sellerCode.toUpperCase())
      );
      const clientSnap = await getDocs(qClient);
      
      if (!clientSnap.empty) {
        // Update existing user
        const userDoc = clientSnap.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), { 
          uid: firebaseUser.uid,
          uids: arrayUnion(firebaseUser.uid)
        });
        await setDoc(doc(db, 'uids', firebaseUser.uid), { userId: userDoc.id });
      } else {
        // Create new client user
        const userId = `client_${name.replace(/\s+/g, '_')}_${sellerCode.toUpperCase()}`;
        const newUser: User = {
          id: userId,
          uid: firebaseUser.uid,
          uids: [firebaseUser.uid],
          name: name,
          email: '',
          role: 'cliente',
          totalPoints: 0,
          linkedSellerCode: sellerCode.toUpperCase(),
          createdAt: Timestamp.now()
        };
        await setDoc(doc(db, 'users', userId), newUser);
        await setDoc(doc(db, 'uids', firebaseUser.uid), { userId: userId });
      }
    } catch (error) {
      console.error('Erro no login por código de cliente:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (isDemoMode()) {
      localStorage.removeItem('demo_user');
      setUser(null);
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithWhatsApp, signInWithSellerCode, signInWithClientCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
