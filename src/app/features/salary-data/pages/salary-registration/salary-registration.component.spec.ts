import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalaryRegistrationComponent } from './salary-registration.component';

describe('SalaryRegistrationComponent', () => {
  let component: SalaryRegistrationComponent;
  let fixture: ComponentFixture<SalaryRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalaryRegistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalaryRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
