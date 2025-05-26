import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddOfficeComponent } from './add-office.component';

describe('AddOfficeComponent', () => {
  let component: AddOfficeComponent;
  let fixture: ComponentFixture<AddOfficeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddOfficeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddOfficeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
