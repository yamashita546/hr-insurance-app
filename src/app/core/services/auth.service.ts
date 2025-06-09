import { Injectable, inject } from '@angular/core';
import { Auth, onAuthStateChanged, signOut, User as FirebaseUser } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, deleteDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { AppUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private appUserSubject = new BehaviorSubject<AppUser | null>(null);
  user$ = this.appUserSubject.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        // FirestoreからAppUser情報を取得
        const userDoc = doc(this.firestore, 'users', user.uid);
        const snap = await getDoc(userDoc);
        const data = snap.data() as AppUser | undefined;
        
        if (data) {
          this.appUserSubject.next(data);
        } else {
          this.appUserSubject.next(null);
        }
      } else {
        this.appUserSubject.next(null);
      }
    });
  }

  get currentUser(): AppUser | null {
    return this.appUserSubject.value;
  }

  logout() {
    return signOut(this.auth);
  }

  // usersコレクションからAppUserを取得
  async getAppUserByUid(uid: string): Promise<AppUser | null> {
    const userDoc = doc(this.firestore, 'users', uid);
    const snap = await getDoc(userDoc);
    return snap.exists() ? (snap.data() as AppUser) : null;
  }

  // usersコレクションからemailでAppUserを取得（Google認証用）
  async getAppUserByEmail(email: string): Promise<AppUser | null> {
    const usersCol = collection(this.firestore, 'users');
    const q = query(usersCol, where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as AppUser;
    }
    return null;
  }

  // isRegisteredをtrueに更新
  async setRegistered(uid: string) {
    const userDoc = doc(this.firestore, 'users', uid);
    await updateDoc(userDoc, { isRegistered: true });
  }

  // FirestoreのAppUserのuidをGoogle認証のuidに更新
  async updateUserUid(oldUid: string, newUid: string) {
    const oldDocRef = doc(this.firestore, 'users', oldUid);
    const oldSnap = await getDoc(oldDocRef);
    if (!oldSnap.exists()) return;
    const data = oldSnap.data();
    const newDocRef = doc(this.firestore, 'users', newUid);
    await setDoc(newDocRef, { ...data, uid: newUid });
    await deleteDoc(oldDocRef);
  }
}
