import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditStandardMonthlyComponent } from './edit-standard-monthly.component';

describe('EditStandardMonthlyComponent', () => {
  let component: EditStandardMonthlyComponent;
  let fixture: ComponentFixture<EditStandardMonthlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditStandardMonthlyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditStandardMonthlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
