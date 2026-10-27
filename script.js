// ---------- copy buttons ----------
document.querySelectorAll('.copy').forEach(btn => {
  btn.addEventListener('click', () => {
    const el = document.getElementById(btn.dataset.copy);
    const done = () => { btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy', 1500); };
    const fallback = () => {
      const r = document.createRange(); r.selectNodeContents(el);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = 'Selected';
    };
    try { navigator.clipboard.writeText(el.textContent).then(done, fallback); } catch (e) { fallback(); }
  });
});

// ---------- color theme ----------
(function () {
  const root = document.documentElement;
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  let saved = null;
  try { saved = localStorage.getItem('portfolio-theme'); } catch (e) {}
  const initial = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  function setTheme(theme) {
    root.dataset.theme = theme;
    const next = theme === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', `Switch to ${next} mode`);
    button.title = `Switch to ${next} mode`;
  }
  setTheme(initial);
  button.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
    try { localStorage.setItem('portfolio-theme', theme); } catch (e) {}
  });
})();

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- typing role rotator ----------
(function () {
  const el = document.getElementById('rotator');
  const words = ['web developer', 'game developer', 'simulation builder', 'BSIT student'];
  if (reduce) return;
  let w = 0, i = words[0].length, deleting = true;
  function tick() {
    const word = words[w];
    if (deleting) {
      i--; el.textContent = word.slice(0, i);
      if (i === 0) { deleting = false; w = (w + 1) % words.length; }
      setTimeout(tick, 45);
    } else {
      const next = words[w];
      i++; el.textContent = next.slice(0, i);
      if (i === next.length) { deleting = true; setTimeout(tick, 1800); }
      else setTimeout(tick, 80);
    }
  }
  setTimeout(tick, 2200);
})();

// ---------- scroll progress + active nav link ----------
(function () {
  const bar = document.getElementById('progress');
  const links = [...document.querySelectorAll('nav ul a')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href')));
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    let current = -1;
    const marker = Math.min(innerHeight * 0.35, 220);
    sections.forEach((s, k) => { if (s && s.getBoundingClientRect().top <= marker) current = k; });
    // The contact section sits directly above the footer, so bottom-of-page
    // scrolling can leave it below the marker even though it is the visible section.
    if (max > 0 && scrollY >= max - 2) current = sections.length - 1;
    links.forEach((a, k) => {
      const active = k === current;
      a.classList.toggle('on', active);
      if (active) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  links.forEach((a, k) => a.addEventListener('click', () => {
    links.forEach((link, index) => {
      const active = index === k;
      link.classList.toggle('on', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }));
  onScroll();
})();

// ---------- reveal on scroll (only things below the first screen) ----------
(function () {
  if (reduce || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); e.target.classList.remove('pre'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el, k) => {
    if (el.getBoundingClientRect().top > innerHeight) {
      el.classList.add('pre');
      el.style.transitionDelay = (k % 4) * 70 + 'ms';
      io.observe(el);
    }
  });
})();

// ---------- 3D tilt on screenshots ----------
document.querySelectorAll('.shot').forEach(shot => {
  if (reduce) return;
  shot.addEventListener('pointermove', e => {
    const r = shot.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    shot.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
    shot.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
  });
  shot.addEventListener('pointerleave', () => { shot.style.setProperty('--rx', '0deg'); shot.style.setProperty('--ry', '0deg'); });
});

// ---------- lightbox ----------
(function () {
  const box = document.getElementById('lightbox'), img = document.getElementById('lb-img'), cap = document.getElementById('lb-cap');
  let opener = null;
  function open(btn) {
    opener = btn;
    img.src = btn.dataset.full; img.alt = btn.querySelector('img').alt;
    cap.innerHTML = btn.dataset.caption;
    box.hidden = false; document.body.style.overflow = 'hidden';
    document.getElementById('lb-close').focus();
  }
  function close() { box.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); }
  document.querySelectorAll('.shot').forEach(b => b.addEventListener('click', () => open(b)));
  box.addEventListener('click', e => { if (e.target !== img) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
})();

// ---------- the cell: particles drifting around a membrane ring ----------
(function () {
  const cell = document.getElementById('cell'), c = document.getElementById('membrane'), ctx = c.getContext('2d');
  let W, H, cx, cy, R, parts = [], mouse = { x: -999, y: -999 }, angle = 0;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2), r = c.getBoundingClientRect();
    W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H / 2; R = W * 0.31;
  }
  function init() {
    parts = [];
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2, d = R + 22 + Math.random() * (W * 0.5 - R - 26);
      parts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: 0, vy: 0, r: 2.5 + Math.random() * 3, k: Math.random() < 0.65 ? 'a' : 'w' });
    }
  }
  function step() {
    angle += 0.0025;
    for (const p of parts) {
      p.vx += (Math.random() - 0.5) * 0.45; p.vy += (Math.random() - 0.5) * 0.45;
      // slow swirl around the cell
      const dx0 = p.x - cx, dy0 = p.y - cy, d0 = Math.hypot(dx0, dy0) || 1;
      p.vx += (-dy0 / d0) * 0.03; p.vy += (dx0 / d0) * 0.03;
      // cursor pushes particles away
      const mx = p.x - mouse.x, my = p.y - mouse.y, m2 = mx * mx + my * my;
      if (m2 < 7000) { const f = (7000 - m2) / 7000 * 1.8, md = Math.sqrt(m2) || 1; p.vx += mx / md * f; p.vy += my / md * f; }
      p.vx *= 0.92; p.vy *= 0.92; p.x += p.vx; p.y += p.vy;
      // bounce off the membrane (stay outside the cell)
      const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1, min = R + 16;
      if (d < min) { p.x = cx + dx / d * min; p.y = cy + dy / d * min; const dot = (p.vx * dx + p.vy * dy) / d; p.vx -= 1.6 * dot * dx / d; p.vy -= 1.6 * dot * dy / d; }
      // keep inside the box
      if (p.x < p.r) { p.x = p.r; p.vx *= -1; } if (p.x > W - p.r) { p.x = W - p.r; p.vx *= -1; }
      if (p.y < p.r) { p.y = p.r; p.vy *= -1; } if (p.y > H - p.r - 18) { p.y = H - p.r - 18; p.vy *= -1; }
    }
  }
  function draw() {
    const acc = css('--accent'), warm = css('--warm'), line = css('--line');
    ctx.clearRect(0, 0, W, H);
    // phospholipid bilayer: two rings of heads joined by tails
    const n = Math.max(36, Math.round(R / 4.2)), rin = R - 6, rout = R + 8;
    for (let i = 0; i < n; i++) {
      const a = angle + (i / n) * Math.PI * 2, cos = Math.cos(a), sin = Math.sin(a);
      ctx.strokeStyle = line; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cx + cos * rin, cy + sin * rin); ctx.lineTo(cx + cos * rout, cy + sin * rout); ctx.stroke();
      ctx.fillStyle = warm;
      ctx.beginPath(); ctx.arc(cx + cos * (rin - 3), cy + sin * (rin - 3), 3.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + cos * (rout + 3), cy + sin * (rout + 3), 3.6, 0, 7); ctx.fill();
    }
    for (const p of parts) {
      ctx.globalAlpha = p.k === 'a' ? 0.85 : 0.55;
      ctx.fillStyle = p.k === 'a' ? acc : warm;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function loop() { step(); draw(); requestAnimationFrame(loop); }
  cell.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  cell.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
  addEventListener('resize', () => { size(); init(); draw(); });
  size(); init();
  if (reduce) { for (let i = 0; i < 300; i++) step(); draw(); } else { for (let i = 0; i < 40; i++) step(); loop(); }
})();
