import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddOperatorUserComponent } from './add-operator-user.component';

describe('AddOperatorUserComponent', () => {
  let component: AddOperatorUserComponent;
  let fixture: ComponentFixture<AddOperatorUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddOperatorUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddOperatorUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
