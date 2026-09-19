(() => {
  'use strict';

  const root = document.documentElement;
  const cover = document.getElementById('cover');
  const envelope = document.getElementById('envelope-button');
  const invitation = document.getElementById('invitation');
  const skipButton = document.getElementById('skip-button');
  const replayButton = document.getElementById('replay-button');
  const title = document.getElementById('invitation-title');
  const calendar = document.getElementById('calendar');
  const countdown = document.getElementById('countdown');
  const countdownDone = document.getElementById('countdown-done');
  const flapFace = cover.querySelector('.flap-face');
  const pocket = cover.querySelector('.env-pocket');
  const flapShadow = cover.querySelector('.flap-shadow');
  const foldShade = cover.querySelector('.fold-shade');
  const foldLight = cover.querySelector('.fold-light');
  const monogram = cover.querySelector('.monogram');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = typeof Element.prototype.animate === 'function';
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  // Midnight at the start of the wedding day in Philadelphia (EDT).
  const WEDDING = Date.parse('2027-05-15T00:00:00-04:00');
  const TAN40 = Math.tan((40 * Math.PI) / 180);
  let state = 'closed';
  let animations = [];
  let finishTimer, countdownTimer, layoutFrame, tileDpr, openWidth;

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

  // A cotton-paper relief tile: fibres lit from the top left. Relief is scaled by pixel density so it reads the same on every screen.
  function paperTile(dpr) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='f' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='.07' numOctaves='4' seed='3' stitchTiles='stitch'/><feDiffuseLighting surfaceScale='${(1.3 * dpr).toFixed(2)}' diffuseConstant='1.1' lighting-color='#fff'><feDistantLight azimuth='225' elevation='58'/></feDiffuseLighting></filter><rect width='320' height='320' filter='url(#f)'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
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
    foldShade.setAttribute('d', folds(0));
    foldLight.setAttribute('d', folds(1));
    // Keep the monogram's lower corners clear of the flap edge.
    const half = monogram.offsetWidth / 2 + 14;
    const lift = Math.max(H * 0.04, (half * dy) / cx - (vy - tipY));
    cover.style.setProperty('--tip-y', `${n(tipY)}px`);
    cover.style.setProperty('--lift', `${n(lift)}px`);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (dpr !== tileDpr) {
      tileDpr = dpr;
      cover.style.setProperty('--cotton', paperTile(dpr));
    }
  }

  // Days, hours and minutes until the wedding; "Today's the day" on the day; nothing afterwards.
  function renderCountdown() {
    window.clearTimeout(countdownTimer);
    const left = WEDDING - Date.now();
    if (left <= -864e5) {
      countdown.hidden = true;
      countdownDone.hidden = true;
      return;
    }
    if (left <= 0) {
      countdown.hidden = true;
      countdownDone.hidden = false;
      countdownTimer = window.setTimeout(renderCountdown, left + 864e5 + 25);
      return;
    }
    countdown.hidden = false;
    countdownDone.hidden = true;
    const total = Math.ceil(left / 6e4);
    const values = { days: Math.floor(total / 1440), hours: Math.floor(total / 60) % 24, mins: total % 60 };
    const labels = { days: ['Day', 'Days'], hours: ['Hour', 'Hours'], mins: ['Min', 'Mins'] };
    for (const num of countdown.querySelectorAll('.cd-num')) {
      const unit = num.dataset.unit;
      num.textContent = values[unit];
      num.nextElementSibling.textContent = labels[unit][values[unit] === 1 ? 0 : 1];
    }
    countdownTimer = window.setTimeout(renderCountdown, (left % 6e4 || 6e4) + 25);
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
    calendar.open = false;
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
      // The envelope: the monogram presses in, the flap lifts toward you and away, then the envelope drops.
      animate(part('.cover-hint'), [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-out' });
      animate(monogram, [{ transform: 'scale(1)' }, { transform: 'scale(.94)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-in-out' });
      const flapTiming = { delay: 280, duration: 1050, easing: 'cubic-bezier(.45, 0, .2, 1)' };
      animate(part('.env-flap'), [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(100deg)' }], flapTiming);
      animate(part('.flap-dim'), [{ opacity: 0 }, { opacity: 1 }], flapTiming);
      animate(flapShadow, [
        { opacity: 1, strokeWidth: 10 },
        { opacity: 1, strokeWidth: 30, offset: 0.4 },
        { opacity: 0, strokeWidth: 44 },
      ], { delay: 280, duration: 850, easing: 'ease-out' });
      animate(part('.env-body'), [{ transform: 'translateY(0)' }, { transform: 'translateY(104%)' }], { delay: 1180, duration: 820, easing: 'cubic-bezier(.55, 0, .75, .1)' });

      // The card rises into place beneath it, then assembles: frame, banner, lettering, tassels, words, crest.
      animate(invitation, [
        { opacity: 0, transform: 'translateY(min(140px, 16vh)) scale(.985)' },
        { opacity: 1, offset: 0.3 },
        { opacity: 1, transform: 'none' },
      ], { delay: 1250, duration: 1150, easing: 'cubic-bezier(.16, 1, .3, 1)' });
      animate(piece('.invitation-rules'), [{ clipPath: 'inset(50% 50% 50% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }], { delay: 1550, duration: 950, easing: 'cubic-bezier(.4, 0, .2, 1)' });
      animate(piece('.bn-band'), [
        { opacity: 0, clipPath: 'inset(0% 50% 0% 50%)' },
        { opacity: 1, offset: 0.15 },
        { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' },
      ], { delay: 1800, duration: 900, easing: 'cubic-bezier(.3, .7, .2, 1)' });
      animate(piece('.bn-tail-l'), [{ opacity: 0, transform: 'rotate(-38deg)' }, { opacity: 1, transform: 'none' }], { delay: 2250, duration: 650 });
      animate(piece('.bn-tail-r'), [{ opacity: 0, transform: 'rotate(38deg)' }, { opacity: 1, transform: 'none' }], { delay: 2250, duration: 650 });
      animate(piece('.bn-text'), [{ clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }], { delay: 2400, duration: 950, easing: 'cubic-bezier(.4, 0, .25, 1)' });
      for (const [selector, delay, sign] of [['.bn-jhumka-l', 2500, 1], ['.bn-jhumka-r', 2570, -1]]) {
        animate(piece(selector), [
          { opacity: 0, transform: `rotate(${24 * sign}deg)`, easing: 'ease-in-out' },
          { opacity: 1, transform: `rotate(${-12 * sign}deg)`, offset: 0.3, easing: 'ease-in-out' },
          { transform: `rotate(${6 * sign}deg)`, offset: 0.55, easing: 'ease-in-out' },
          { transform: `rotate(${-2.5 * sign}deg)`, offset: 0.78, easing: 'ease-in-out' },
          { opacity: 1, transform: 'rotate(0deg)' },
        ], { delay, duration: 1150, easing: 'linear' });
      }
      for (const [selector, delay] of [['.eyebrow', 2750], ['.couple-names', 2850], ['.wedding-date', 3000], ['.wedding-location', 3080]]) {
        animate(piece(selector), fadeUp, { delay, duration: 650 });
      }
      animate(piece('.crest'), [
        { opacity: 0, transform: 'scale(.95)', clipPath: 'circle(0% at 50% 50%)' },
        { opacity: 1, transform: 'none', clipPath: 'circle(75% at 50% 50%)' },
      ], { delay: 3200, duration: 1050 });
      for (const [selector, delay] of [['.countdown', 3550], ['.cd-done', 3550], ['.invitation-actions', 3700]]) {
        animate(piece(selector), fadeUp, { delay, duration: 600 });
      }
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
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderCountdown();
  });

  renderCountdown();
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
