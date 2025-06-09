import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOperatorUserComponent } from './edit-operator-user.component';

describe('EditOperatorUserComponent', () => {
  let component: EditOperatorUserComponent;
  let fixture: ComponentFixture<EditOperatorUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditOperatorUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditOperatorUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
