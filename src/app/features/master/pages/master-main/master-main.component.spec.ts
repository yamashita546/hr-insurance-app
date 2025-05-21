import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterMainComponent } from './master-main.component';

describe('MasterMainComponent', () => {
  let component: MasterMainComponent;
  let fixture: ComponentFixture<MasterMainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterMainComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterMainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
