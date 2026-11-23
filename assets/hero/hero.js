const hero = document.querySelector('.hero');
const film = hero.querySelector('.film');
const cover = hero.querySelector('.cover');
const playButton = hero.querySelector('.play-button');
const controls = hero.querySelector('.film-controls');
const pauseButton = hero.querySelector('.film-pause');
const returnButton = hero.querySelector('.film-return');
const notice = hero.querySelector('.film-notice');
const canvas = hero.querySelector('.hands');
const context = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const useVideoFrames = typeof film.requestVideoFrameCallback === 'function';
const gripTime = 0.94;
let state = 'idle';
let playbackAttempt = 0;
let frameRequest = null;
let uncovered = false;

// Hand outlines sampled from the uploaded film around the grip. Coordinates
// are percentages of the original 16:9 frame, also used when it scales.
const gripOutlines = [
  {
    time: 0.70,
    left: [[0, 31], [9, 46], [15, 52], [21, 59], [23, 70], [21, 77], [16, 78], [0, 73]],
    right: [[100, 24], [92, 36], [85, 43], [81, 48], [79, 61], [79, 72], [83, 78], [100, 71]],
  },
  {
    time: 0.83,
    left: [[0, 28], [11, 46], [19, 52], [24, 62], [27, 71], [27, 77], [22, 82], [0, 73]],
    right: [[100, 22], [91, 37], [83, 43], [77, 50], [74, 61], [73, 73], [79, 82], [100, 71]],
  },
  {
    time: 1.00,
    left: [[0, 26], [13, 45], [21, 55], [26, 62], [30, 73], [32, 79], [27, 83], [0, 72]],
    right: [[100, 21], [91, 36], [81, 43], [73, 51], [71, 58], [68, 72], [77, 83], [100, 74]],
  },
  {
    time: 1.22,
    left: [[0, 25], [13, 44], [22, 54], [28, 63], [32, 74], [34, 80], [27, 84], [0, 71]],
    right: [[100, 21], [90, 36], [80, 44], [72, 51], [69, 58], [65, 72], [75, 84], [100, 75]],
  },
];

function clearHands() {
  context?.clearRect(0, 0, canvas.width, canvas.height);
}

function paintHands(time) {
  if (!context) return;
  clearHands();

  const nextIndex = gripOutlines.findIndex((frame) => frame.time > time);
  if (nextIndex < 1) return;

  const previous = gripOutlines[nextIndex - 1];
  const next = gripOutlines[nextIndex];
  const blend = (time - previous.time) / (next.time - previous.time);
  const interpolate = (from, to) => (from + (to - from) * blend) / 100;

  context.save();
  context.beginPath();
  for (const side of ['left', 'right']) {
    const points = previous[side].map(([x, y], index) => {
      const [nextX, nextY] = next[side][index];
      return [interpolate(x, nextX) * canvas.width, interpolate(y, nextY) * canvas.height];
    });
    const [startX, startY] = points[0];
    const [endX, endY] = points.at(-1);
    context.moveTo((startX + endX) / 2, (startY + endY) / 2);
    points.forEach(([x, y], index) => {
      const [followingX, followingY] = points[(index + 1) % points.length];
      context.quadraticCurveTo(x, y, (x + followingX) / 2, (y + followingY) / 2);
    });
    context.closePath();
  }
  context.clip();
  context.drawImage(film, 0, 0, canvas.width, canvas.height);
  context.restore();
}

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

function watchGrip() {
  const onFrame = (_, metadata) => {
    frameRequest = null;
    if (state !== 'playing') return;
    const time = metadata?.mediaTime ?? film.currentTime;

    paintHands(time);
    if (time >= gripTime && !uncovered) revealFilm();
    if (time < gripOutlines.at(-1).time) watchGrip();
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
  clearHands();
  film.pause();
  controls.hidden = true;
  hero.classList.add('is-returning');
  hero.classList.remove('is-showing-film', 'is-uncovered');
  playButton.removeAttribute('aria-busy');

  window.setTimeout(() => {
    film.currentTime = 0;
    uncovered = false;
    cover.inert = false;
    hero.classList.remove('is-returning');
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
    watchGrip();
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
film.addEventListener('play', () => { pauseButton.textContent = 'Пауза'; });
film.addEventListener('pause', () => { pauseButton.textContent = 'Продолжить'; });

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
