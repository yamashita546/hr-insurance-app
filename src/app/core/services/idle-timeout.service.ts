import { Injectable, NgZone } from '@angular/core';
import { fromEvent, merge, Observable, Subject, Subscription, timer } from 'rxjs';
import { switchMap, throttleTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IdleTimeoutService {
  private idle$: Observable<any>;
  private timerSubscription: Subscription | undefined;
  private timeoutExpired = new Subject<void>();

  private readonly TIMEOUT_MINUTES = 30; // 30分でタイムアウト

  constructor(private ngZone: NgZone) {
    // マウス移動、キー入力、スクロール、クリックを監視対象とする
    const mouseMove$ = fromEvent(document, 'mousemove');
    const keyDown$ = fromEvent(document, 'keydown');
    const scroll$ = fromEvent(document, 'scroll');
    const click$ = fromEvent(document, 'click');

    // イベントをマージし、スロットリングでイベント発火を間引く
    this.idle$ = merge(mouseMove$, keyDown$, scroll$, click$).pipe(
      throttleTime(1000) // 1秒に1回に制限
    );
  }

  startWatching(): Observable<void> {
    this.ngZone.runOutsideAngular(() => {
      this.timerSubscription = this.idle$.pipe(
        // タイマーを初期セット
        switchMap(() => timer(this.TIMEOUT_MINUTES * 60 * 1000))
      ).subscribe(() => {
        this.ngZone.run(() => {
          this.timeoutExpired.next();
        });
      });
    });
    return this.timeoutExpired.asObservable();
  }

  stopWatching() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
} 