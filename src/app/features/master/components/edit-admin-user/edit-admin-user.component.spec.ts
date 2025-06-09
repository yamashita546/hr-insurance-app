import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditAdminUserComponent } from './edit-admin-user.component';

describe('EditAdminUserComponent', () => {
  let component: EditAdminUserComponent;
  let fixture: ComponentFixture<EditAdminUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditAdminUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditAdminUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
