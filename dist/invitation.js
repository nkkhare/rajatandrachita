(() => {
  'use strict';

  const experience = document.querySelector('.experience');
  const invitation = document.getElementById('invitation');
  const cover = document.getElementById('cover');
  const envelopeButton = document.getElementById('envelope-button');
  const envelopeImage = document.getElementById('envelope-image');
  const openButton = document.getElementById('open-button');
  const skipButton = document.getElementById('skip-button');
  const replayButton = document.getElementById('replay-button');
  const title = document.getElementById('invitation-title');
  const calendar = document.getElementById('calendar');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = typeof Element.prototype.animate === 'function';
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  let state = 'closed';
  let animations = [];
  let finishTimer;

  function setState(next) {
    state = next;
    experience.dataset.state = next;
  }

  function clearAnimations() {
    window.clearTimeout(finishTimer);
    for (const animation of animations) animation.cancel();
    animations = [];
  }

  function animate(element, frames, options) {
    const animation = element.animate(frames, {
      duration: 850,
      easing: ease,
      fill: 'both',
      ...options,
    });
    animations.push(animation);
    return animation;
  }

  function finishOpening({ focus = true } = {}) {
    clearAnimations();
    setState('opened');
    cover.hidden = true;
    invitation.hidden = false;
    invitation.inert = false;
    invitation.removeAttribute('aria-hidden');
    skipButton.hidden = true;
    replayButton.hidden = false;
    experience.style.removeProperty('height');
    cover.style.removeProperty('height');
    envelopeButton.disabled = false;
    openButton.disabled = false;
    if (focus) title.focus({ preventScroll: true });
  }

  function resetCover() {
    clearAnimations();
    calendar.open = false;
    setState('closed');
    cover.hidden = false;
    invitation.hidden = true;
    invitation.inert = true;
    invitation.setAttribute('aria-hidden', 'true');
    replayButton.hidden = true;
    skipButton.hidden = true;
    experience.style.removeProperty('height');
    cover.style.removeProperty('height');
  }

  function openInvitation() {
    if (state !== 'closed') return;
    if (motionPreference.matches || !canAnimate) {
      finishOpening();
      return;
    }

    clearAnimations();
    const initialHeight = experience.getBoundingClientRect().height;
    const coverHeight = cover.getBoundingClientRect().height;
    envelopeButton.disabled = true;
    openButton.disabled = true;
    cover.style.height = `${coverHeight}px`;
    invitation.hidden = false;
    replayButton.hidden = false;
    setState('opening');
    const targetHeight = Math.max(invitation.getBoundingClientRect().height, initialHeight);
    experience.style.height = `${initialHeight}px`;
    skipButton.hidden = false;
    skipButton.focus({ preventScroll: true });

    try {
      animate(experience, [{ height: `${initialHeight}px` }, { height: `${targetHeight}px` }], {
        duration: 1650,
      });
      animate(cover.querySelector('.cover-heading'), [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-18px)' },
      ], { duration: 430 });
      animate(cover.querySelector('.cover-action'), [{ opacity: 1 }, { opacity: 0 }], { duration: 240 });
      animate(cover.querySelector('.envelope-art'), [
        { offset: 0, opacity: 1, transform: 'translateY(0) rotate(-3deg) scale(1)' },
        { offset: .24, opacity: 1, transform: 'translateY(-12px) rotate(0deg) scale(1.025)' },
        { offset: .48, opacity: 1, transform: 'translateY(5px) rotateX(9deg) scale(1.02)' },
        { offset: 1, opacity: 0, transform: 'translateY(85px) rotateX(22deg) scale(.91)' },
      ], { duration: 1050, easing: 'cubic-bezier(.4, 0, .2, 1)' });
      animate(cover.querySelector('.envelope-halo'), [{ opacity: 1 }, { opacity: 0 }], { duration: 700 });
      animate(invitation, [
        { opacity: 0, transform: 'translateY(34px) scale(.975)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { delay: 620, duration: 1100 });
      animate(invitation.querySelector('.crest'), [
        { opacity: 0, transform: 'translateY(22px) scale(.96)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { delay: 730, duration: 1050 });
      const reveals = [
        ['.eyebrow', 900],
        ['.couple-names', 990],
        ['.ornament', 1120],
        ['.event-details', 1220],
        ['.invitation-actions', 1370],
      ];
      for (const [selector, delay] of reveals) {
        animate(invitation.querySelector(selector), [
          { opacity: 0, transform: 'translateY(13px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], { delay, duration: 650 });
      }
      // A single bounded timer also settles the page if a tab was backgrounded.
      finishTimer = window.setTimeout(() => finishOpening(), 2070);
    } catch {
      // Any unavailable animation feature falls back to the readable invitation.
      finishOpening();
    }
  }

  envelopeButton.addEventListener('click', openInvitation);
  openButton.addEventListener('click', openInvitation);
  skipButton.addEventListener('click', () => finishOpening());
  replayButton.addEventListener('click', () => {
    resetCover();
    window.scrollTo({ top: 0, behavior: 'instant' });
    openInvitation();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (state === 'opening') finishOpening();
    else if (calendar.open) {
      calendar.open = false;
      calendar.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!calendar.contains(event.target)) calendar.open = false;
  });
  calendar.addEventListener('click', (event) => {
    if (event.target.closest('a')) calendar.open = false;
  });
  window.addEventListener('resize', () => {
    if (state === 'opening') finishOpening({ focus: false });
  }, { passive: true });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches && state === 'opening') finishOpening();
  });
  envelopeImage.addEventListener('error', () => finishOpening({ focus: false }));

  // Enhance only after all controls work. Without JS, the full invitation is visible.
  if (envelopeImage.complete && envelopeImage.naturalWidth === 0) return;
  resetCover();
  if (!motionPreference.matches && canAnimate) {
    animate(cover.querySelector('.envelope-art'), [
      { opacity: 0, transform: 'translateY(20px) rotate(-1deg) scale(.97)' },
      { opacity: 1, transform: 'translateY(0) rotate(-3deg) scale(1)' },
    ], { duration: 1150, fill: 'backwards' });
  }
})();
