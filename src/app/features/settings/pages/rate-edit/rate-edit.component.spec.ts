import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RateEditComponent } from './rate-edit.component';

describe('RateEditComponent', () => {
  let component: RateEditComponent;
  let fixture: ComponentFixture<RateEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RateEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RateEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
