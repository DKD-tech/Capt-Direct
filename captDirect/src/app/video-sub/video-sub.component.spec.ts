import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoSubComponent } from './video-sub.component';

describe('VideoSubComponent', () => {
  let component: VideoSubComponent;
  let fixture: ComponentFixture<VideoSubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoSubComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoSubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
