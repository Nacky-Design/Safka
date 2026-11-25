const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-nav');
const catalog = document.querySelector('.catalog');
const catalogToggle = document.querySelector('.catalog-toggle');
const catalogItems = document.querySelector('#catalog-items');
const desktop = matchMedia('(min-width: 1024px)');
const hover = matchMedia('(hover: hover) and (pointer: fine)');
let dismissedCatalog = false;

function showCatalog(open) {
  catalogToggle.setAttribute('aria-expanded', String(open));
  catalogItems.hidden = !open;
}

function showMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  navigation.hidden = !desktop.matches && !open;
  if (!open) showCatalog(false);
}

function resetNavigation() {
  menu.hidden = desktop.matches;
  dismissedCatalog = false;
  showMenu(false);
}

catalogToggle.hidden = false;
resetNavigation();
desktop.addEventListener('change', resetNavigation);

menu.addEventListener('click', () => showMenu(menu.getAttribute('aria-expanded') === 'false'));
catalogToggle.addEventListener('click', () => {
  const open = catalogItems.hidden;
  dismissedCatalog = !open;
  showCatalog(open);
});
catalogToggle.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    showCatalog(true);
    catalogItems.querySelector('a').focus();
  }
});

catalog.addEventListener('pointerenter', () => {
  if (desktop.matches && hover.matches) showCatalog(true);
});
catalog.addEventListener('pointerleave', () => {
  dismissedCatalog = false;
  if (!catalog.contains(document.activeElement) || document.activeElement === catalogToggle) showCatalog(false);
});
catalogToggle.addEventListener('focus', () => {
  if (desktop.matches && !dismissedCatalog && catalogToggle.matches(':focus-visible')) showCatalog(true);
});
catalog.addEventListener('focusout', ({ relatedTarget }) => {
  if (!catalog.contains(relatedTarget)) {
    dismissedCatalog = false;
    if (!desktop.matches || !hover.matches || !catalog.matches(':hover')) showCatalog(false);
  }
});
catalogItems.addEventListener('click', ({ target }) => {
  const link = target.closest('a');
  if (!link) return;
  showMenu(false);
  document.querySelector(link.hash)?.focus({ preventScroll: true });
});
document.addEventListener('pointerdown', ({ target }) => {
  if (!catalog.contains(target)) showCatalog(false);
  if (!navigation.contains(target) && !menu.contains(target)) showMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!catalogItems.hidden) {
    dismissedCatalog = true;
    showCatalog(false);
    catalogToggle.focus();
    event.preventDefault();
  } else if (!desktop.matches && !navigation.hidden) {
    showMenu(false);
    menu.focus();
    event.preventDefault();
  }
});

const video = document.querySelector('#hero-video');
const videoToggle = document.querySelector('.video-toggle');
videoToggle.hidden = false;

function displayPlayback(playing) {
  videoToggle.toggleAttribute('data-playing', playing);
  videoToggle.setAttribute('aria-label', playing ? 'Приостановить видео' : 'Воспроизвести видео');
}

videoToggle.addEventListener('click', async () => {
  if (!video.paused) {
    video.pause();
    return;
  }
  try {
    await video.play();
  } catch {
    displayPlayback(false);
  }
});
video.addEventListener('playing', () => displayPlayback(true));
video.addEventListener('pause', () => displayPlayback(false));
video.addEventListener('ended', () => {
  video.load();
  displayPlayback(false);
});
