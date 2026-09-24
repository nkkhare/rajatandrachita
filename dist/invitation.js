(() => {
  'use strict';

  const root = document.documentElement;
  const cover = document.getElementById('cover');
  const envelope = document.getElementById('envelope-button');
  const invitation = document.getElementById('invitation');
  const skipButton = document.getElementById('skip-button');
  const replayButton = document.getElementById('replay-button');
  const title = document.getElementById('invitation-title');
  const flapFace = cover.querySelector('.flap-face');
  const pocket = cover.querySelector('.env-pocket');
  const flapShadow = cover.querySelector('.flap-shadow');
  const sideShade = cover.querySelector('.side-shade');
  const foldShade = cover.querySelector('.fold-shade');
  const foldLight = cover.querySelector('.fold-light');
  const monogram = cover.querySelector('.monogram');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = typeof Element.prototype.animate === 'function';
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const TAN40 = Math.tan((40 * Math.PI) / 180);
  let state = 'closed';
  let animations = [];
  let finishTimer, layoutFrame, openWidth;

  function setState(next) {
    state = next;
    root.dataset.state = next;
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

  // The flap is a V with a rounded tip whose lowest point sits at 58% of the screen height.
  // Its sides meet the screen edges at most 22% higher, so wide screens get a shallower V.
  function layoutEnvelope() {
    const W = cover.clientWidth, H = cover.clientHeight;
    if (!W || !H) return;
    const n = (v) => Math.round(v * 10) / 10, cx = W / 2;
    const tipY = H * 0.58;
    const dy = Math.min(cx * TAN40, H * 0.22);
    const len = Math.hypot(cx, dy), ux = cx / len, uy = dy / len;
    const t = Math.min(Math.max(W * 0.06, 22), 90);
    const vy = tipY + 0.5 * t * uy, sy = vy - dy;
    const edge = (o) => `M0 ${n(sy + o)}L${n(cx - t * ux)} ${n(vy - t * uy + o)}Q${n(cx)} ${n(vy + o)} ${n(cx + t * ux)} ${n(vy - t * uy + o)}L${n(W)} ${n(sy + o)}`;
    flapFace.style.clipPath = `path('M0 0L${edge(0).slice(1)}V0Z')`;
    // The pocket's mouth is a shallower V, hidden under the flap until it lifts.
    const my = vy - 0.35 * dy;
    pocket.style.clipPath = `path('M0 ${n(H)}V${n(sy)}L${n(cx)} ${n(my)}L${n(W)} ${n(sy)}V${n(H)}Z')`;
    flapShadow.setAttribute('d', edge(4));
    const folds = (o) => `M0 ${n(H + o)}L${n(cx)} ${n(my + o)}M${n(W)} ${n(H + o)}L${n(cx)} ${n(my + o)}`;
    // The side flaps sit under the bottom flap, a shade darker.
    sideShade.setAttribute('d', `M0 ${n(sy)}L${n(cx)} ${n(my)}L0 ${n(H)}ZM${n(W)} ${n(sy)}L${n(cx)} ${n(my)}L${n(W)} ${n(H)}Z`);
    foldShade.setAttribute('d', folds(0));
    foldLight.setAttribute('d', folds(1));
    // Keep the monogram's lower corners clear of the flap edge.
    const half = monogram.offsetWidth / 2 + 14;
    const lift = Math.max(H * 0.04, (half * dy) / cx - (vy - tipY));
    cover.style.setProperty('--tip-y', `${n(tipY)}px`);
    cover.style.setProperty('--lift', `${n(lift)}px`);
  }

  function finishOpening({ focus = true } = {}) {
    clearAnimations();
    setState('opened');
    cover.hidden = true;
    invitation.inert = false;
    invitation.removeAttribute('aria-hidden');
    skipButton.hidden = true;
    replayButton.hidden = false;
    envelope.disabled = false;
    if (focus) title.focus({ preventScroll: true });
  }

  function resetCover() {
    clearAnimations();
    setState('closed');
    cover.hidden = false;
    invitation.inert = true;
    invitation.setAttribute('aria-hidden', 'true');
    replayButton.hidden = true;
    skipButton.hidden = true;
    window.scrollTo(0, 0);
    layoutEnvelope();
  }

  function openInvitation() {
    if (state !== 'closed') return;
    if (motionPreference.matches || !canAnimate) {
      finishOpening();
      return;
    }

    clearAnimations();
    envelope.disabled = true;
    setState('opening');
    openWidth = window.innerWidth;
    skipButton.hidden = false;
    skipButton.focus({ preventScroll: true });
    const part = (selector) => cover.querySelector(selector);
    const piece = (selector) => invitation.querySelector(selector);
    const fadeUp = [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }];

    try {
      // The envelope, paced like a real one being opened: a slow push-in, the monogram presses in, then the flap
      // lifts in one unbroken arc, up toward you and out of frame; a beat on the interior, then the envelope drops.
      animate(part('.cover-hint'), [{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-out' });
      animate(envelope, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }], { duration: 3600, easing: 'cubic-bezier(.4, 0, .4, 1)' });
      animate(monogram, [{ transform: 'scale(1)' }, { transform: 'scale(.95)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 700, easing: 'ease-in-out' });
      // The flap, its dimming and its shadow share one timing, so each keyframe offset is a fraction of the flap's angle
      // (0 to 92deg). The flap leaves the top of the frame at about 75deg; its shadow has faded well before then.
      const flapTiming = { delay: 600, duration: 2700, easing: 'cubic-bezier(.37, 0, .63, 1)' };
      animate(part('.env-flap'), [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(92deg)' }], flapTiming);
      animate(part('.flap-dim'), [{ opacity: 0 }, { opacity: 1 }], flapTiming);
      animate(flapShadow, [
        { offset: 0, opacity: 1, strokeWidth: 10 },
        { offset: 0.25, opacity: 0.9, strokeWidth: 22 },
        { offset: 0.5, opacity: 0.35, strokeWidth: 34 },
        { offset: 0.68, opacity: 0, strokeWidth: 40 },
        { offset: 1, opacity: 0, strokeWidth: 40 },
      ], flapTiming);
      animate(part('.env-body'), [{ transform: 'translateY(0)' }, { transform: 'translateY(104%)' }], { delay: 3700, duration: 1500, easing: 'cubic-bezier(.55, 0, .7, .2)' });

      // The card is a single painting, so it simply rises into place; its water, sky and petals take over from
      // there, in CSS, once the state is `opened`.
      animate(invitation, [
        { opacity: 0, transform: 'translateY(min(140px, 16vh)) scale(.985)' },
        { opacity: 1, offset: 0.35 },
        { opacity: 1, transform: 'none' },
      ], { delay: 3900, duration: 2100, easing: 'cubic-bezier(.16, 1, .3, 1)' });

      // A single bounded timer, just after the last animation ends, also settles the page if a tab was backgrounded.
      const end = Math.max(...animations.map((a) => a.effect.getComputedTiming().endTime));
      finishTimer = window.setTimeout(() => finishOpening(), end + 50);
    } catch {
      // Any unavailable animation feature falls back to the readable invitation.
      finishOpening();
    }
  }

  envelope.addEventListener('click', openInvitation);
  skipButton.addEventListener('click', () => finishOpening());
  replayButton.addEventListener('click', () => {
    resetCover();
    openInvitation();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (state === 'opening') finishOpening();
  });
  window.addEventListener('resize', () => {
    // Mobile toolbars change only the height; a real width change mid-opening settles the page.
    if (state === 'opening' && window.innerWidth !== openWidth) finishOpening({ focus: false });
    else if (state === 'closed') {
      window.cancelAnimationFrame(layoutFrame);
      layoutFrame = window.requestAnimationFrame(layoutEnvelope);
    }
  }, { passive: true });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches && state === 'opening') finishOpening();
  });
  // Enhance only after all controls work. Without JS (or without clip-path paths), the full invitation is visible.
  if (!window.CSS || !CSS.supports('clip-path', 'path("M0 0H1V1Z")')) {
    delete root.dataset.state;
    return;
  }
  resetCover();
  if (document.fonts) document.fonts.load('1em Pinyon').then(() => { if (state === 'closed') layoutEnvelope(); }, () => {});
  if (!motionPreference.matches && canAnimate) {
    animate(monogram, [{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 1200, fill: 'backwards' });
    animate(cover.querySelector('.cover-hint'), [{ opacity: 0 }, { opacity: 1 }], { delay: 600, duration: 900, fill: 'backwards' });
  }
})();
