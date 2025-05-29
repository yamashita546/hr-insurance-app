import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardMonthlyFormComponent } from './standard-monthly-form.component';

describe('StandardMonthlyFormComponent', () => {
  let component: StandardMonthlyFormComponent;
  let fixture: ComponentFixture<StandardMonthlyFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandardMonthlyFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardMonthlyFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
