import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsuranceRateComponent } from './insurance-rate.component';

describe('InsuranceRateComponent', () => {
  let component: InsuranceRateComponent;
  let fixture: ComponentFixture<InsuranceRateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsuranceRateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InsuranceRateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
