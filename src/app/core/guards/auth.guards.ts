import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);

  return authState(auth).pipe(
    take(1),
    switchMap(async user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      const appUser = await authService.getAppUserByUid(user.uid);
      if (!appUser) {
        router.navigate(['/login'], { queryParams: { error: 'not-registered' } });
        return false;
      }
      if (!appUser.isRegistered) {
        router.navigate(['/register'], { queryParams: { uid: user.uid } });
        return false;
      }
      return true;
    })
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const authService = inject(AuthService);

  return authState(auth).pipe(
    take(1),
    switchMap(async user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      const appUser = await authService.getAppUserByUid(user.uid);
      if (!appUser) {
        router.navigate(['/login'], { queryParams: { error: 'not-registered' } });
        return false;
      }
      if (!appUser.isRegistered) {
        router.navigate(['/register'], { queryParams: { uid: user.uid } });
        return false;
      }
      if (appUser.role !== 'admin') {
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};
