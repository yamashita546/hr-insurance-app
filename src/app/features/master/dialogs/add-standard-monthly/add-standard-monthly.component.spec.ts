import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddStandardMonthlyComponent } from './add-standard-monthly.component';

describe('AddStandardMonthlyComponent', () => {
  let component: AddStandardMonthlyComponent;
  let fixture: ComponentFixture<AddStandardMonthlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddStandardMonthlyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddStandardMonthlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
