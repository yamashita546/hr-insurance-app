import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageOfficeComponent } from './manage-office.component';

describe('ManageOfficeComponent', () => {
  let component: ManageOfficeComponent;
  let fixture: ComponentFixture<ManageOfficeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageOfficeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageOfficeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
