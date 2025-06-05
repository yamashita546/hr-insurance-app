import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailStandardMonthlyComponent } from './detail-standard-monthly.component';

describe('DetailStandardMonthlyComponent', () => {
  let component: DetailStandardMonthlyComponent;
  let fixture: ComponentFixture<DetailStandardMonthlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailStandardMonthlyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailStandardMonthlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
