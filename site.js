const video = document.querySelector('#game-video');
const button = document.querySelector('.video-toggle');
if (video && button) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    button.textContent = video.paused ? 'Watch video' : 'Pause video';
    button.setAttribute('aria-label', video.paused ? 'Watch recorded gameplay video' : 'Pause gameplay video');
  };
  button.hidden = false;
  video.controls = false;
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  video.addEventListener('error', () => { video.controls = true; button.hidden = true; });
  button.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => { video.controls = true; update(); });
    else video.pause();
  });
  reducedMotion.addEventListener('change', event => { if (event.matches) video.pause(); });
  if (!reducedMotion.matches) video.play().catch(update);
  update();
}
