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
import { doc, getDoc, setDoc, Timestamp, onSnapshot, query, collection, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithWhatsApp: (phone: string, sellerCode?: string) => Promise<void>;
  signInWithCode: (name: string, code: string, sellerCode?: string) => Promise<void>;
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
      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
        if (firebaseUser) {
          try {
            // Always search for user by UID field first to find wa_ or code_ docs
            const q = query(collection(db, 'users'), where('uid', '==', firebaseUser.uid));
            const snapshot = await getDocs(q);
            
            let userDocRef = doc(db, 'users', firebaseUser.uid);
            let foundDoc = false;

            if (!snapshot.empty) {
              // If multiple docs found, prefer the one that is NOT just the UID (wa_ or code_)
              const bestDoc = snapshot.docs.find(d => d.id !== firebaseUser.uid) || snapshot.docs[0];
              userDocRef = doc(db, 'users', bestDoc.id);
              foundDoc = true;
            } else {
              // Check if a doc with UID as ID exists
              const directDoc = await getDoc(userDocRef);
              if (directDoc.exists()) {
                foundDoc = true;
              }
            }

            if (foundDoc) {
              unsubscribeUser = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                  const data = doc.data() as User;
                  setUser({ id: doc.id, ...data });
                }
                setLoading(false);
              });
            } else {
              // If user is authenticated but has no document, create a default one
              // This fulfills "PRECISO QUE TODO USUARIO SEJA REGISTRADO NO SISTEMA"
              const isMaster = firebaseUser.email === 'turcabolao@gmail.com';
              const newUser: User = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Visitante' : 'Usuário'),
                email: firebaseUser.email || '',
                role: isMaster ? 'master' : 'cliente',
                totalPoints: 0,
                createdAt: Timestamp.now()
              };
              
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              setUser(newUser);
              setLoading(false);
            }
          } catch (error) {
            console.error('Error in AuthProvider:', error);
            setLoading(false);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      });
    };

    initAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Erro no login com Google:', error);
      throw error;
    }
  };

  const signInWithWhatsApp = async (phone: string, sellerCode?: string) => {
    try {
      // 1. Sign in anonymously to interact with Firestore
      const { user: firebaseUser } = await signInAnonymously(auth);
      
      // 2. Search for existing user with this WhatsApp
      const q = query(collection(db, 'users'), where('whatsapp', '==', phone));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Update existing user with new UID
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as User;
        const updates: any = { uid: firebaseUser.uid };
        
        // If user doesn't have a linked seller but one was provided, link it
        if (!userData.linkedSellerCode && sellerCode) {
          updates.linkedSellerCode = sellerCode.toUpperCase();
        }
        
        await updateDoc(doc(db, 'users', userDoc.id), updates);
      } else {
        // Create new user
        const userId = `wa_${phone}`;
        const newUser: User = {
          id: userId,
          uid: firebaseUser.uid,
          name: `User ${phone.slice(-4)}`,
          email: '',
          whatsapp: phone,
          role: 'cliente',
          totalPoints: 0,
          linkedSellerCode: sellerCode?.toUpperCase() || '',
          createdAt: Timestamp.now()
        };
        await setDoc(doc(db, 'users', userId), newUser);
      }
    } catch (error) {
      console.error('Erro no login com WhatsApp:', error);
      throw error;
    }
  };

  const signInWithCode = async (name: string, code: string, sellerCode?: string) => {
    try {
      const { user: firebaseUser } = await signInAnonymously(auth);
      
      // Search for existing user with this name and code
      const q = query(
        collection(db, 'users'), 
        where('name', '==', name),
        where('accessCode', '==', code.toUpperCase())
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as User;
        const updates: any = { uid: firebaseUser.uid };
        
        // If user doesn't have a linked seller but one was provided, link it
        if (!userData.linkedSellerCode && sellerCode) {
          updates.linkedSellerCode = sellerCode.toUpperCase();
        }
        
        await updateDoc(doc(db, 'users', userDoc.id), updates);
      } else {
        const userId = `code_${name.replace(/\s+/g, '_')}_${code.toUpperCase()}`;
        const newUser: User = {
          id: userId,
          uid: firebaseUser.uid,
          name: name,
          email: '',
          accessCode: code.toUpperCase(),
          role: 'cliente',
          totalPoints: 0,
          linkedSellerCode: sellerCode?.toUpperCase() || '',
          createdAt: Timestamp.now()
        };
        await setDoc(doc(db, 'users', userId), newUser);
      }
    } catch (error) {
      console.error('Erro no login com Código:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithWhatsApp, signInWithCode, logout }}>
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
