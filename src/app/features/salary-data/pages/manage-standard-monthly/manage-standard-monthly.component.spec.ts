import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageStandardMonthlyComponent } from './manage-standard-monthly.component';

describe('ManageStandardMonthlyComponent', () => {
  let component: ManageStandardMonthlyComponent;
  let fixture: ComponentFixture<ManageStandardMonthlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageStandardMonthlyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageStandardMonthlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
