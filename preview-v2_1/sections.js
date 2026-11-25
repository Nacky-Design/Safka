(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(any-hover: hover)');
  const uses = document.querySelector('#uses');
  let playing;

  function stopUse() {
    if (!playing) return;
    const { card, video } = playing;
    playing = undefined;
    video.pause();
    delete card.dataset.playing;
  }

  for (const card of uses.querySelectorAll('.use-card')) {
    const video = card.querySelector('video');
    card.tabIndex = 0;

    function start() {
      if (playing?.card === card) return;
      stopUse();
      const request = { card, video };
      playing = request;
      if (video.currentTime > 0) video.currentTime = 0;
      video.play().catch(() => {
        if (playing === request) stopUse();
      });
    }

    function stop() {
      if (playing?.card === card) stopUse();
    }

    function toggle() {
      if (playing?.card === card) stopUse();
      else start();
    }

    video.addEventListener('playing', () => {
      if (playing?.card === card) card.dataset.playing = '';
    });
    video.addEventListener('ended', stop);
    video.addEventListener('error', stop);
    card.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && hover.matches && !reduced.matches) start();
    });
    card.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') stop();
    });
    card.addEventListener('focus', () => {
      if (card.matches(':focus-visible') && !reduced.matches) start();
    });
    card.addEventListener('blur', stop);
    card.addEventListener('click', (event) => {
      const touch = event.pointerType === 'touch' || event.pointerType === 'pen';
      if (touch || (event.detail > 0 && (!hover.matches || reduced.matches))) toggle();
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        stop();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!event.repeat) toggle();
      }
    });
  }

  document.addEventListener('pointerdown', (event) => {
    if (playing && !playing.card.contains(event.target)) stopUse();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopUse();
  });

  const film = document.querySelector('#story-film');
  const filmControl = document.querySelector('.production-action');

  function updateFilm() {
    filmControl.textContent = film.paused || film.ended
      ? 'Смотреть ролик Safka' : 'Приостановить ролик Safka';
  }

  filmControl.addEventListener('click', () => {
    if (film.paused) {
      const rect = film.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > innerHeight) film.scrollIntoView({ block: 'nearest' });
      film.play().catch(updateFilm);
    } else {
      film.pause();
    }
  });
  film.addEventListener('playing', updateFilm);
  film.addEventListener('pause', updateFilm);
  film.addEventListener('ended', () => {
    film.load();
    updateFilm();
  });
  film.addEventListener('error', () => {
    film.dataset.unavailable = '';
    updateFilm();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) film.pause();
    }).observe(film);
  }
  reduced.addEventListener('change', (event) => {
    if (event.matches) film.pause();
  });

  const windowElement = document.querySelector('.retail-window');
  const track = windowElement.querySelector('.retail-track');
  const pause = windowElement.querySelector('.retail-pause');
  const replica = track.querySelector('.retail-list').cloneNode(true);
  replica.setAttribute('aria-hidden', 'true');
  replica.setAttribute('inert', '');

  function setMotion() {
    if (reduced.matches) {
      stopUse();
      replica.remove();
    } else if (!replica.isConnected) {
      track.append(replica);
    }
    windowElement.toggleAttribute('data-motion', !reduced.matches);
    if (!reduced.matches) windowElement.scrollLeft = 0;
    pause.hidden = reduced.matches;
    if (reduced.matches) windowElement.tabIndex = 0;
    else windowElement.removeAttribute('tabindex');
  }

  function toggleTrack() {
    const paused = windowElement.toggleAttribute('data-paused');
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? 'Продолжить прокрутку' : 'Пауза прокрутки';
  }

  setMotion();
  reduced.addEventListener('change', setMotion);
  pause.addEventListener('click', toggleTrack);
  track.addEventListener('click', (event) => {
    if (!reduced.matches && (event.pointerType === 'touch' || !hover.matches)) toggleTrack();
  });

  const form = document.querySelector('.partner-fields');
  const contact = form.querySelector('#partner-contact');
  const feedback = form.querySelector('.partner-feedback');
  function validate(input) {
    const value = input.value.trim();
    let message = '';
    if (!value) {
      message = 'Заполните поле.';
    } else if (input === contact) {
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const digits = value.replace(/\D/g, '');
      const phone = /^\+?[\d() .-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
      if (!email && !phone) message = 'Укажите телефон или e-mail.';
    }
    const error = form.querySelector('#' + input.id + '-error');
    input.setCustomValidity(message);
    input.setAttribute('aria-invalid', String(Boolean(message)));
    error.textContent = message;
    error.hidden = !message;
    const firstInvalid = form.querySelector('input[aria-invalid="true"]');
    const shownError = message || (firstInvalid && form.querySelector('#' + firstInvalid.id + '-error').textContent);
    feedback.textContent = shownError || '';
    feedback.hidden = !shownError;
  }

  for (const input of form.querySelectorAll('input[required]')) {
    input.addEventListener('blur', () => validate(input));
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) validate(input);
    });
  }

  form.addEventListener('submit', (event) => event.preventDefault());
})();
