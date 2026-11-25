(() => {
  if (!('animate' in Element.prototype)) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.22,.61,.36,1)';
  const playing = new Map();
  const pending = new Map();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(reveal) : null;

  function animate(element, duration, offset, delay = 0) {
    playing.get(element)?.cancel();
    const animation = element.animate([
      { opacity: 0, transform: `translateY(${offset}px)` },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration, delay, easing, fill: 'backwards' });
    playing.set(element, animation);
    const settle = () => {
      if (playing.get(element) === animation) playing.delete(element);
    };
    animation.addEventListener('finish', settle);
    animation.addEventListener('cancel', settle);
  }

  function expose(element) {
    observer?.unobserve(element);
    delete element.dataset.motionPending;
    pending.delete(element);
  }

  function reveal(entries) {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting || !pending.has(target)) continue;
      const timing = pending.get(target);
      expose(target);
      if (!reduced.matches && !target.contains(document.activeElement)) animate(target, ...timing);
    }
  }

  function register(selector, duration, offset, initialDelay = 0, stagger = 0) {
    if (!observer || reduced.matches) return;
    document.querySelectorAll(selector).forEach((element, index) => {
      // Keep the initial viewport and restored scroll position visible from the first paint.
      if (element.getBoundingClientRect().top < innerHeight) return;
      pending.set(element, [duration, offset, initialDelay + index * stagger]);
      element.dataset.motionPending = '';
      observer.observe(element);
    });
  }

  register('#flavors .flavor-card', 520, 14, 0, 75);

  register('#company h2', 560, 16);
  register('#company .batch-lead', 560, 16, 80);
  register('#company .batch-cta', 560, 16, 160);
  register('#company .story-engraving', 650, 22, 80);

  register('#production h2', 540, 16);
  register('#production .batch-lead', 540, 16, 80);
  register('#production .production-steps li', 500, 14, 160, 70);

  register('#production .production-action', 540, 16, 110);

  register('#uses .use-card', 580, 18, 0, 85);
  register('#buy h2', 540, 16);
  register('#buy .retail-lead', 540, 16, 80);
  register('#faq .questions-copy', 560, 16);
  register('#faq .questions-list', 560, 16, 80);
  register('#partnership .partner-copy', 560, 16);
  register('#partnership .partner-fields', 620, 18, 90);

  register('.site-footer .footer-brand', 540, 14);
  register('.site-footer .footer-nav > div', 540, 14, 65, 65);
  register('.site-footer .footer-buy', 540, 14, 325);

  const retail = document.querySelector('#buy .retail-window');
  if (observer) {
    retail.dataset.offscreen = '';
    const retailObserver = new IntersectionObserver(([entry]) => {
      retail.toggleAttribute('data-offscreen', !entry.isIntersecting);
    });
    retailObserver.observe(retail);
  }

  const mobile = matchMedia('(width < 1001px)');
  const faq = document.querySelector('.questions-list');
  for (const details of faq.querySelectorAll('details')) {
    const summary = details.querySelector('summary');
    const answer = details.querySelector('p');
    let wasOpen = details.open;
    summary.setAttribute('aria-expanded', String(wasOpen));
    summary.addEventListener('click', () => {
      const previous = faq.querySelector('details[open]');
      if (!mobile.matches || details.open || !previous ||
          !(previous.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      const before = summary.getBoundingClientRect().top;
      requestAnimationFrame(() => {
        const delta = summary.getBoundingClientRect().top - before;
        if (details.open && Math.abs(delta) > 1) scrollBy({ top: delta, behavior: 'instant' });
      });
    });
    details.addEventListener('toggle', () => {
      if (wasOpen === details.open) return;
      wasOpen = details.open;
      summary.setAttribute('aria-expanded', String(wasOpen));
      if (wasOpen && !reduced.matches) animate(answer, 400, 12);
      else playing.get(answer)?.cancel();
    });
  }

  document.addEventListener('focusin', (event) => {
    const element = event.target.closest('[data-motion-pending]');
    if (element) expose(element);
    for (const [target, animation] of playing) {
      if (target.contains(event.target)) animation.cancel();
    }
  });

  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    for (const element of pending.keys()) expose(element);
    for (const animation of playing.values()) animation.cancel();
  });
})();
