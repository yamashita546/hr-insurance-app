import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardMonthlyComponent } from './standard-monthly.component';

describe('StandardMonthlyComponent', () => {
  let component: StandardMonthlyComponent;
  let fixture: ComponentFixture<StandardMonthlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandardMonthlyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardMonthlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
