const hero = document.querySelector('.hero');
const film = hero.querySelector('.film');
const cover = hero.querySelector('.cover');
const playButton = hero.querySelector('.play-button');
const controls = hero.querySelector('.film-controls');
const pauseButton = hero.querySelector('.film-pause');
const returnButton = hero.querySelector('.film-return');
const notice = hero.querySelector('.film-notice');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const useVideoFrames = typeof film.requestVideoFrameCallback === 'function';
const gripTime = 0.80;
const fullFrameTime = 4.45;
let state = 'idle';
let playbackAttempt = 0;
let frameRequest = null;
let uncovered = false;

function cancelFrame() {
  if (frameRequest === null) return;
  if (useVideoFrames) film.cancelVideoFrameCallback(frameRequest);
  else cancelAnimationFrame(frameRequest);
  frameRequest = null;
}

function revealFilm() {
  uncovered = true;
  hero.classList.add('is-uncovered');
  controls.hidden = false;
  if (cover.contains(document.activeElement)) returnButton.focus({ preventScroll: true });
  cover.inert = true;
}

function watchOpening() {
  if (frameRequest !== null || hero.classList.contains('is-film-wide')) return;

  const onFrame = (_, metadata) => {
    frameRequest = null;
    if (state !== 'playing' || film.paused) return;
    const time = metadata?.mediaTime ?? film.currentTime;

    if (time >= gripTime) {
      if (!uncovered) revealFilm();
      if (time >= fullFrameTime || reducedMotion.matches) {
        hero.classList.add('is-film-wide');
        film.style.removeProperty('--opening-progress');
        return;
      }

      // Follow the filmed lift so the edges dissolve even if playback stalls or pauses.
      const progress = (time - gripTime) / (fullFrameTime - gripTime);
      film.style.setProperty('--opening-progress', progress ** 1.35);
    }
    watchOpening();
  };

  frameRequest = useVideoFrames
    ? film.requestVideoFrameCallback(onFrame)
    : requestAnimationFrame(onFrame);
}

function restoreCover({ error = false } = {}) {
  if (state === 'idle' || state === 'returning') return;
  state = 'returning';
  playbackAttempt += 1;
  const returnFocus = controls.contains(document.activeElement)
    || (uncovered && document.activeElement === document.body);
  const transition = hero.classList.contains('is-showing-film') && !reducedMotion.matches;
  cancelFrame();
  film.pause();
  controls.hidden = true;
  hero.classList.add('is-returning');
  hero.classList.remove('is-showing-film', 'is-uncovered');
  playButton.removeAttribute('aria-busy');

  window.setTimeout(() => {
    film.currentTime = 0;
    film.style.removeProperty('--opening-progress');
    uncovered = false;
    cover.inert = false;
    hero.classList.remove('is-returning', 'is-film-wide');
    state = 'idle';
    if (returnFocus) playButton.focus({ preventScroll: true });

    notice.hidden = !error;
    notice.textContent = error ? 'Видео не запустилось. Попробуйте ещё раз.' : '';
  }, transition ? 580 : 0);
}

async function startFilm() {
  if (state !== 'idle') return;
  state = 'loading';
  const attempt = ++playbackAttempt;
  notice.hidden = true;
  playButton.setAttribute('aria-busy', 'true');
  try {
    await film.play();
    if (attempt !== playbackAttempt || state !== 'loading') return;
    state = 'playing';
    hero.classList.add('is-showing-film');
    playButton.removeAttribute('aria-busy');
    watchOpening();
  } catch {
    if (attempt === playbackAttempt) restoreCover({ error: true });
  }
}

playButton.hidden = false;
playButton.addEventListener('click', startFilm);
returnButton.addEventListener('click', () => restoreCover());
pauseButton.addEventListener('click', async () => {
  if (state !== 'playing') return;
  if (!film.paused) {
    film.pause();
    return;
  }

  const attempt = playbackAttempt;
  try {
    await film.play();
  } catch {
    if (attempt === playbackAttempt) restoreCover({ error: true });
  }
});
film.addEventListener('ended', () => restoreCover());
film.addEventListener('error', () => restoreCover({ error: true }));
film.addEventListener('play', () => {
  pauseButton.textContent = 'Пауза';
  if (state === 'playing') watchOpening();
});
film.addEventListener('pause', () => {
  pauseButton.textContent = 'Продолжить';
  cancelFrame();
});

const availability = document.querySelector('.availability');
if (typeof availability.showModal === 'function') {
  for (const link of document.querySelectorAll('[data-availability]')) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      availability.showModal();
      if (state === 'playing' && uncovered) film.pause();
    });
  }
}
const mobileMenu = document.querySelector('.mobile-menu');
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || availability.open) return;
  if (mobileMenu.open) {
    mobileMenu.open = false;
    mobileMenu.querySelector('summary').focus();
  } else if (state !== 'idle') {
    restoreCover();
  }
});
