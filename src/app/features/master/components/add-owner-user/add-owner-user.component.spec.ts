import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddOwnerUserComponent } from './add-owner-user.component';

describe('AddOwnerUserComponent', () => {
  let component: AddOwnerUserComponent;
  let fixture: ComponentFixture<AddOwnerUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddOwnerUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddOwnerUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
