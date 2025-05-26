import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMyCompanyComponent } from './edit-my-company.component';

describe('EditMyCompanyComponent', () => {
  let component: EditMyCompanyComponent;
  let fixture: ComponentFixture<EditMyCompanyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditMyCompanyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditMyCompanyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
