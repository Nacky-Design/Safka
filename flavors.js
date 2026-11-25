(() => {
  const section = document.querySelector('#flavors');
  const supportsHover = matchMedia('(any-hover: hover)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let active;

  function stop(card = active) {
    if (!card || card !== active) return;
    active = undefined;
    card.request = undefined;
    card.video.pause();
    delete card.element.dataset.playing;
  }

  function start(card) {
    if (active === card) return;
    stop();
    active = card;
    if (card.video.currentTime > 0) card.video.currentTime = 0;
    const request = card.video.play();
    card.request = request;
    request.catch(() => {
      if (card.request === request) stop(card);
    });
  }

  for (const element of section.querySelectorAll('.flavor-card')) {
    const video = element.querySelector('video');
    const media = element.querySelector('.flavor-media');
    const card = { element, media, video };
    media.tabIndex = 0;

    video.addEventListener('playing', () => {
      if (active !== card) return;
      element.dataset.playing = '';
    });
    video.addEventListener('ended', () => stop(card));
    video.addEventListener('error', () => stop(card));

    element.addEventListener('pointerenter', ({ pointerType }) => {
      if (pointerType === 'mouse' && supportsHover.matches && !reducedMotion.matches) start(card);
    });
    element.addEventListener('pointerleave', ({ pointerType }) => {
      if (pointerType === 'mouse') stop(card);
    });
    function toggle() {
      if (active === card) stop(card);
      else start(card);
    }

    media.addEventListener('focus', () => {
      if (media.matches(':focus-visible') && !reducedMotion.matches) start(card);
    });
    media.addEventListener('blur', () => stop(card));
    media.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (!event.repeat) toggle();
    });
    media.addEventListener('click', (event) => {
      const touch = event.pointerType === 'touch' || event.pointerType === 'pen';
      if (touch || (event.detail > 0 && (!supportsHover.matches || reducedMotion.matches))) toggle();
    });
  }

  section.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && active) stop();
  });
  document.addEventListener('pointerdown', (event) => {
    if (active && !active.media.contains(event.target)) stop();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) stop();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
})();
