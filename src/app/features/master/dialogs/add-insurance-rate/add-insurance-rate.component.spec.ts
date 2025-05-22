import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddInsuranceRateComponent } from './add-insurance-rate.component';

describe('AddInsuranceRateComponent', () => {
  let component: AddInsuranceRateComponent;
  let fixture: ComponentFixture<AddInsuranceRateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddInsuranceRateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddInsuranceRateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
