import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppUser } from '../models/user.model';
import { Company } from '../models/company.model';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged, User as FirebaseUser } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class UserCompanyService {
  private userSubject = new BehaviorSubject<AppUser | null>(null);
  public user$: Observable<AppUser | null> = this.userSubject.asObservable();

  private companySubject = new BehaviorSubject<Company | null>(null);
  public company$: Observable<Company | null> = this.companySubject.asObservable();

  constructor(private firestore: Firestore, private auth: Auth) {
    onAuthStateChanged(this.auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // FirestoreからAppUser情報を取得
        const userDoc = doc(this.firestore, 'users', firebaseUser.uid);
        const snap = await getDoc(userDoc);
        const user = snap.data() as AppUser;
        this.userSubject.next(user);

        // 会社情報も取得
        if (user?.companyId) {
          const companyDoc = doc(this.firestore, 'companies', user.companyId);
          const companySnap = await getDoc(companyDoc);
          this.companySubject.next(companySnap.data() as Company);
        } else {
          this.companySubject.next(null);
        }
      } else {
        this.userSubject.next(null);
        this.companySubject.next(null);
      }
    });
  }

  // 権限判定などの共通メソッド
  isAdmin(user: AppUser | null): boolean {
    return user?.role === 'admin';
  }
  isOwner(user: AppUser | null): boolean {
    return user?.role === 'owner';
  }

  async updateCompany(company: Company) {
    const companyDoc = doc(this.firestore, 'companies', company.companyId);
    await updateDoc(companyDoc, { ...company });
    this.companySubject.next({ ...company });
  }
} 