import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOwnerUserComponent } from './edit-owner-user.component';

describe('EditOwnerUserComponent', () => {
  let component: EditOwnerUserComponent;
  let fixture: ComponentFixture<EditOwnerUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditOwnerUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditOwnerUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
