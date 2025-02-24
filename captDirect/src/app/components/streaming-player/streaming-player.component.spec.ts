import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamingPlayerComponent } from './streaming-player.component';

describe('StreamingPlayerComponent', () => {
  let component: StreamingPlayerComponent;
  let fixture: ComponentFixture<StreamingPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreamingPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StreamingPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
