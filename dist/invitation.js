(() => {
  'use strict';

  const experience = document.querySelector('.experience');
  const invitation = document.getElementById('invitation');
  const cover = document.getElementById('cover');
  const envelopeButton = document.getElementById('envelope-button');
  const envelopeImage = document.getElementById('envelope-image');
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
    if (!element) return null;
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
    cover.style.height = `${coverHeight}px`;
    invitation.hidden = false;
    setState('opening');
    const targetHeight = Math.max(invitation.getBoundingClientRect().height, initialHeight);
    experience.style.height = `${initialHeight}px`;
    skipButton.hidden = false;
    skipButton.focus({ preventScroll: true });

    try {
      const art = cover.querySelector('.envelope-art');
      const card = cover.querySelector('.envelope-card');
      const rise = 0.75;
      animate(experience, [{ height: `${initialHeight}px` }, { height: `${targetHeight}px` }], {
        duration: 1400,
      });
      animate(cover.querySelector('.cover-heading'), [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-18px)' },
      ], { duration: 430 });
      animate(cover.querySelector('.cover-action'), [{ opacity: 1 }, { opacity: 0 }], { duration: 240 });
      animate(cover.querySelector('.envelope-halo'), [{ opacity: 1 }, { opacity: 0 }], { duration: 600 });
      // The seal catches the light, the envelope settles, the flap lifts and the card slides out.
      animate(cover.querySelector('.seal-glow'), [
        { opacity: 0, transform: 'scale(.9)' },
        { opacity: 1, transform: 'scale(1.15)', offset: 0.45 },
        { opacity: 0, transform: 'scale(1.3)' },
      ], { duration: 520, easing: 'ease-out' });
      animate(art, [
        { offset: 0, opacity: 1, transform: 'translateY(0) rotate(-3deg) scale(1)', easing: 'cubic-bezier(.3, .7, .3, 1)' },
        { offset: 0.18, opacity: 1, transform: 'translateY(-6px) rotate(0deg) scale(1.02)' },
        { offset: 0.76, opacity: 1, transform: 'translateY(-6px) rotate(0deg) scale(1.02)', easing: 'cubic-bezier(.5, 0, .7, .4)' },
        { offset: 1, opacity: 0, transform: 'translateY(90px) rotate(0deg) scale(.96)' },
      ], { duration: 1650, easing: 'linear' });
      // The flap lifts, snaps through edge-on quickly (so it never reads as a sliver), then settles open.
      const flapTiming = { delay: 260, duration: 600, easing: 'linear' };
      animate(cover.querySelector('.envelope-flap'), [
        { offset: 0, transform: 'rotateX(0deg)', zIndex: 4, easing: 'cubic-bezier(.45, 0, .9, .6)' },
        { offset: 0.46, transform: 'rotateX(76deg)', zIndex: 4 },
        { offset: 0.5, transform: 'rotateX(90deg)', zIndex: 4 },
        { offset: 0.5, transform: 'rotateX(90deg)', zIndex: 0 },
        { offset: 0.54, transform: 'rotateX(104deg)', zIndex: 0, easing: 'cubic-bezier(.1, .4, .3, 1)' },
        { offset: 1, transform: 'rotateX(180deg)', zIndex: 0 },
      ], flapTiming);
      animate(cover.querySelector('.flap-front'), [
        { filter: 'brightness(1)' },
        { filter: 'brightness(.86)', offset: 0.46 },
        { filter: 'brightness(.86)' },
      ], flapTiming);
      animate(card, [
        { transform: 'translateY(0)' },
        { transform: `translateY(${-rise * 100}%)` },
      ], { delay: 640, duration: 600, easing: 'cubic-bezier(.3, .7, .25, 1)' });

      // Hand the little card over to the real invitation at the same place and size, then bring it forward.
      const box = envelopeButton.getBoundingClientRect();
      const k = 1.02;
      const artCx = box.left + art.offsetLeft + art.offsetWidth / 2;
      const artCy = box.top + art.offsetTop + art.offsetHeight / 2 - 6;
      const cardCx = artCx + (card.offsetLeft + card.offsetWidth / 2 - art.offsetWidth / 2) * k;
      const cardCy = artCy + (card.offsetTop + card.offsetHeight / 2 - art.offsetHeight / 2 - rise * card.offsetHeight) * k;
      const inv = invitation.getBoundingClientRect();
      const matches = inv.width / inv.height > 1.3 && targetHeight === initialHeight;
      if (matches) {
        const s = (card.offsetWidth * k) / inv.width;
        const from = `translate(${cardCx - (inv.left + inv.width / 2)}px, ${cardCy - (inv.top + inv.height / 2)}px) scale(${s})`;
        animate(invitation, [
          { offset: 0, opacity: 0, transform: from },
          { offset: 0.12, opacity: 1, transform: from, easing: 'cubic-bezier(.3, .1, .2, 1)' },
          { offset: 1, opacity: 1, transform: 'none' },
        ], { delay: 1220, duration: 820, easing: 'linear' });
      } else {
        animate(invitation, [
          { opacity: 0, transform: 'translateY(26px) scale(.975)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ], { delay: 1240, duration: 760 });
      }

      // Two lovebirds carry the rolled banner down, beak to beak, then back apart to pull it open from the middle.
      const banner = document.getElementById('banner');
      const flight = 1900;
      const unfurl = flight + 1650;
      const unfurlTime = 1300;
      const drop = unfurl + unfurlTime + 80;
      animate(banner, [
        { offset: 0, opacity: 0, transform: 'translate(-26px, -52vh)' },
        { offset: 0.14, opacity: 1 },
        { offset: 0.45, transform: 'translate(22px, -20vh)' },
        { offset: 0.78, transform: 'translate(-7px, -6px)' },
        { offset: 1, opacity: 1, transform: 'translate(0, 0)' },
      ], { delay: flight, duration: 1500, easing: 'cubic-bezier(.25, .5, .35, 1)' });
      banner.querySelectorAll('.bird-wing').forEach((wing, i) => {
        animate(wing, [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(52deg)', offset: 0.35 },
          { transform: 'rotate(-14deg)', offset: 0.75 },
          { transform: 'rotate(0deg)' },
        ], { delay: flight + i * 70, duration: 270, iterations: 14, easing: 'ease-in-out' });
      });
      const unfurlTiming = { delay: unfurl, duration: unfurlTime, easing: 'cubic-bezier(.5, 0, .25, 1)' };
      animate(banner.querySelector('.banner-cloth'), [
        { clipPath: 'inset(0 50% 0 50%)' },
        { clipPath: 'inset(0 0 0 0)' },
      ], unfurlTiming);
      animate(banner.querySelector('.banner-carrier-l'), [
        { transform: 'translateX(100%)' },
        { transform: 'translateX(0)' },
      ], unfurlTiming);
      animate(banner.querySelector('.banner-carrier-r'), [
        { transform: 'translateX(-100%)' },
        { transform: 'translateX(0)' },
      ], unfurlTiming);
      banner.querySelectorAll('.banner-roll').forEach((roll) => {
        animate(roll, [
          { offset: 0, opacity: 1, transform: 'scaleX(1.5)' },
          { offset: 0.88, opacity: 1, transform: 'scaleX(.85)' },
          { offset: 1, opacity: 0, transform: 'scaleX(.7)' },
        ], unfurlTiming);
      });

      // With the banner open, the rest of the invitation drops in line by line.
      const lines = [
        ...title.children,
        invitation.querySelector('.ornament'),
        invitation.querySelector('.wedding-date'),
        invitation.querySelector('.wedding-location'),
        invitation.querySelector('.invitation-actions'),
      ];
      lines.forEach((line, i) => {
        animate(line, [
          { offset: 0, opacity: 0, transform: 'translateY(-30px)' },
          { offset: 0.65, opacity: 1, transform: 'translateY(3px)' },
          { offset: 1, opacity: 1, transform: 'translateY(0)' },
        ], { delay: drop + i * 150, duration: 720, easing: 'cubic-bezier(.3, .6, .35, 1)' });
      });
      // A single bounded timer, just after the last animation ends, also settles the page if a tab was backgrounded.
      const end = Math.max(...animations.map((a) => a.effect.getComputedTiming().endTime));
      finishTimer = window.setTimeout(() => finishOpening(), end + 50);
    } catch {
      // Any unavailable animation feature falls back to the readable invitation.
      finishOpening();
    }
  }

  envelopeButton.addEventListener('click', openInvitation);
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
