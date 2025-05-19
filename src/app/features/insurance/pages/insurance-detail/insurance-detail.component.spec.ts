import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsuranceDetailComponent } from './insurance-detail.component';

describe('InsuranceDetailComponent', () => {
  let component: InsuranceDetailComponent;
  let fixture: ComponentFixture<InsuranceDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsuranceDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InsuranceDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
