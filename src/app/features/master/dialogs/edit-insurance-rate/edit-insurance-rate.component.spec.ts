import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditInsuranceRateComponent } from './edit-insurance-rate.component';

describe('EditInsuranceRateComponent', () => {
  let component: EditInsuranceRateComponent;
  let fixture: ComponentFixture<EditInsuranceRateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditInsuranceRateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditInsuranceRateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
