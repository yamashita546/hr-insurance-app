import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DependentFormComponent } from './dependent-form.component';

describe('DependentFormComponent', () => {
  let component: DependentFormComponent;
  let fixture: ComponentFixture<DependentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DependentFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DependentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
