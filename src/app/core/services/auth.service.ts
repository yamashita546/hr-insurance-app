import { Injectable, inject } from '@angular/core';
import { Auth, onAuthStateChanged, signOut, User as FirebaseUser } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
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
}
