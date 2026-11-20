/**
 * Imperative behaviour for the landing page: the silk shader, the 3D unfold demo,
 * the before/after slider, feature micro-demos, themes, pricing, FAQ and the drop zone.
 *
 * Everything is scoped to `root` and every listener, timer, frame and observer is
 * tracked so the returned cleanup leaves nothing running (React strict mode mounts twice).
 */
export function initLanding(root: HTMLElement): () => void {
  const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = root) => r.querySelector(s) as T;
  const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = root) => Array.from(r.querySelectorAll(s)) as T[];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- cleanup tracking ---------- */
  const cleanups: Array<() => void> = [];
  const timeouts = new Set<number>();
  const frames = new Set<number>();
  let disposed = false;
  const on = <K extends string>(target: EventTarget, type: K, fn: EventListenerOrEventListenerObject, opts?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { timeouts.delete(id); if (!disposed) fn(); }, ms);
    timeouts.add(id);
    return id;
  };
  const clearLater = (id: number | undefined) => { if (id !== undefined) { clearTimeout(id); timeouts.delete(id); } };
  const frame = (fn: FrameRequestCallback) => {
    const id = requestAnimationFrame(t => { frames.delete(id); if (!disposed) fn(t); });
    frames.add(id);
    return id;
  };
  const observe = (cb: IntersectionObserverCallback, el: Element, opts?: IntersectionObserverInit) => {
    const io = new IntersectionObserver(cb, opts);
    io.observe(el);
    cleanups.push(() => io.disconnect());
    return io;
  };

  /* ---------- mobile menu ---------- */
  const menuBtn = $<HTMLButtonElement>('#menuBtn');
  const menu = $('#menu');
  const setMenu = (open: boolean) => {
    menu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  on(menuBtn, 'click', e => { e.stopPropagation(); setMenu(!menu.classList.contains('open')); });
  $$('a', menu).forEach(a => on(a, 'click', () => setMenu(false)));
  on(document, 'click', e => { if (!menu.contains(e.target as Node)) setMenu(false); });
  on(window, 'keydown', e => {
    if ((e as KeyboardEvent).key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });

  /* ---------- reveal: content is always visible; the entrance plays once on first scroll-in ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }));
    cleanups.push(() => io.disconnect());
    $$('.reveal').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) io.observe(el); });
  }

  /* ---------- 3D unfold demo ---------- */
  const s3d = $('#s3d');
  const fit = $('#fit');
  const vp = $('#viewport');
  const steps = $$<HTMLButtonElement>('.step', s3d);
  const bParse = $('#bParse'), bPub = $('#bPub'), bViews = $('#bViews');
  const cursor = $('#cursor'), contact = $('#contact');
  const viewsEl = $('#views'), weekEl = $('#weekViews');
  const size = () => {
    const s = Math.min(1, vp.clientWidth / 720);
    fit.style.transform = `scale(${s})`;
    vp.style.height = `${540 * s}px`;
  };
  on(window, 'resize', size);
  size();

  const PHASES: Array<[string, number]> = [['resume', 2000], ['explode', 1900], ['live', 5600]];
  let idx = 0, views = 1284, week = 128, auto = !reduce, demoVisible = true;
  let timer: number | undefined;
  let phaseTimers: number[] = [];
  const bump = (n: number) => {
    views += n; week += n;
    viewsEl.textContent = views.toLocaleString('en-US');
    weekEl.textContent = `+${week} visitors`;
  };
  const go = (i: number) => {
    idx = i;
    const [name, dur] = PHASES[i];
    s3d.dataset.state = name;
    phaseTimers.forEach(clearLater); phaseTimers = [];
    const phase = (fn: () => void, ms: number) => phaseTimers.push(later(fn, ms));
    steps.forEach((s, j) => {
      s.setAttribute('aria-pressed', String(j === i));
      s.classList.remove('run');
      void s.offsetWidth; // restart the progress bar animation
      if (j === i && auto) { s.style.setProperty('--dur', `${dur}ms`); s.classList.add('run'); }
    });
    bParse.classList.toggle('on', name === 'explode');
    bPub.classList.remove('on'); bViews.classList.remove('on'); cursor.classList.remove('on', 'go');
    if (name === 'live') {
      phase(() => bPub.classList.add('on'), reduce ? 0 : 900);
      phase(() => bViews.classList.add('on'), reduce ? 0 : 1250);
      if (!reduce) {
        phase(() => cursor.classList.add('on'), 1500);
        phase(() => cursor.classList.add('go'), 1650);
        phase(() => { contact.classList.add('press'); bump(3); }, 2650);
        phase(() => contact.classList.remove('press'), 2810);
        phase(() => bump(2), 3500);
        phase(() => bump(4), 4400);
      }
    }
    clearLater(timer);
    if (auto && demoVisible && !document.hidden) timer = later(() => go((idx + 1) % PHASES.length), dur);
  };
  steps.forEach((s, j) => on(s, 'click', () => {
    auto = false; go(j); clearLater(timer);
    if (!reduce) timer = later(() => { auto = true; go((idx + 1) % PHASES.length); }, 9000);
  }));
  const resumeDemo = () => { if (auto && demoVisible && !document.hidden) go(idx); else clearLater(timer); };
  on(document, 'visibilitychange', resumeDemo);
  observe(entries => {
    const v = entries[0].isIntersecting;
    if (v !== demoVisible) { demoVisible = v; resumeDemo(); }
  }, s3d);
  go(reduce ? 2 : 0);

  if (fine && !reduce) {
    const tilt = $('#tilt');
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, raf: number | null = null;
    const tick = () => {
      vx = (vx + (tx - x) * 0.045) * 0.82; vy = (vy + (ty - y) * 0.045) * 0.82; x += vx; y += vy;
      tilt.style.transform = `rotateY(${(x * 6).toFixed(3)}deg) rotateX(${(-y * 5).toFixed(3)}deg)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) > 0.0005 ? frame(tick) : null;
    };
    on(s3d, 'pointermove', e => {
      const r = s3d.getBoundingClientRect(), pe = e as PointerEvent;
      tx = ((pe.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((pe.clientY - r.top) / r.height - 0.5) * 2;
      if (raf === null) raf = frame(tick);
    });
    on(s3d, 'pointerleave', () => { tx = 0; ty = 0; if (raf === null) raf = frame(tick); });
  }

  /* ---------- before / after slider ---------- */
  const ba = $('#ba'), baTop = $('#baTop'), baHandle = $('#baHandle'), knob = $<HTMLButtonElement>('#baKnob');
  let pos = 50, dragging = false;
  const setPos = (p: number) => {
    pos = Math.max(0, Math.min(100, p));
    baTop.style.clipPath = `inset(0 ${100 - pos}% 0 0)`;
    baHandle.style.transform = `translateX(${(pos / 100) * ba.clientWidth}px)`;
    knob.setAttribute('aria-valuenow', String(Math.round(pos)));
    knob.setAttribute('aria-valuetext', `${Math.round(pos)}% resume`);
  };
  const fromEvent = (e: PointerEvent) => {
    const r = ba.getBoundingClientRect();
    setPos(((e.clientX - r.left) / r.width) * 100);
  };
  on(ba, 'pointerdown', e => {
    const pe = e as PointerEvent;
    if (dragging || pe.button > 0) return; // ignore extra touch points mid-drag
    dragging = true; ba.classList.add('dragging'); ba.setPointerCapture(pe.pointerId); fromEvent(pe);
  });
  on(ba, 'pointermove', e => { if (dragging) fromEvent(e as PointerEvent); });
  const end = (e: Event) => {
    if (!dragging) return;
    dragging = false; ba.classList.remove('dragging');
    try { ba.releasePointerCapture((e as PointerEvent).pointerId); } catch { /* already released */ }
  };
  on(ba, 'pointerup', end); on(ba, 'pointercancel', end);
  on(knob, 'keydown', e => {
    const ke = e as KeyboardEvent, step = ke.shiftKey ? 10 : 2;
    const map: Record<string, number> = { ArrowLeft: -step, ArrowRight: step, ArrowDown: -step, ArrowUp: step };
    if (ke.key in map) { ke.preventDefault(); setPos(pos + map[ke.key]); }
    else if (ke.key === 'Home') { ke.preventDefault(); setPos(0); }
    else if (ke.key === 'End') { ke.preventDefault(); setPos(100); }
  });
  on(window, 'resize', () => setPos(pos));
  setPos(50);

  /* ---------- feature card spotlight ---------- */
  if (fine) $$('.feat-spot').forEach(c => on(c, 'pointermove', e => {
    const r = c.getBoundingClientRect(), pe = e as PointerEvent;
    c.style.setProperty('--sx', `${pe.clientX - r.left}px`);
    c.style.setProperty('--sy', `${pe.clientY - r.top}px`);
  }));

  /* ---------- domain typing ---------- */
  const typed = $('#typed');
  const DOMAINS = ['maya.unfold.site', 'mayaiyer.com', 'maya.design'];
  if (!reduce) {
    let di = 0, ci = DOMAINS[0].length, mode: 'hold' | 'del' | 'type' = 'hold';
    const step = () => {
      if (mode === 'hold') { mode = 'del'; later(step, 2200); return; }
      if (mode === 'del') {
        ci--; typed.textContent = DOMAINS[di].slice(0, ci);
        if (ci === 0) { di = (di + 1) % DOMAINS.length; mode = 'type'; }
        later(step, 45); return;
      }
      ci++; typed.textContent = DOMAINS[di].slice(0, ci);
      if (ci === DOMAINS[di].length) mode = 'hold';
      later(step, 85);
    };
    step();
  }

  /* ---------- analytics chart (sample data, drawn to scale) ---------- */
  {
    const svg = $<SVGSVGElement>('#chart');
    svg.replaceChildren();
    const NS = 'http://www.w3.org/2000/svg', W = 560, H = 120, pad = 8;
    let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const data = Array.from({ length: 30 }, (_, i) => Math.round(18 + i * 1.6 + rnd() * 22 + (i === 21 ? 40 : 0) + (i === 22 ? 22 : 0)));
    const max = Math.max(...data) * 1.1;
    const X = (i: number) => (i / (data.length - 1)) * W;
    const Y = (v: number) => H - pad - (v / max) * (H - pad * 2);
    const line = data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    const mk = (tag: string, attrs: Record<string, string | number>) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, String(attrs[k]));
      svg.appendChild(el);
      return el;
    };
    const defs = mk('defs', {});
    defs.innerHTML = '<linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6e6ea" stop-opacity=".22"/><stop offset="1" stop-color="#e6e6ea" stop-opacity="0"/></linearGradient>';
    [0.25, 0.5, 0.75].forEach(f => {
      const yy = (pad + f * (H - pad * 2)).toFixed(1);
      mk('line', { x1: 0, x2: W, y1: yy, y2: yy, stroke: 'rgba(255,255,255,.05)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' });
    });
    mk('path', { d: `${line} L${W} ${H} L0 ${H} Z`, fill: 'url(#cg)' });
    mk('path', { d: line, fill: 'none', stroke: '#ededf0', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' });
    const last = data.length - 1;
    mk('circle', { cx: X(last), cy: Y(data[last]), r: 3.5, fill: '#fff' });
    $('#chartTotal').textContent = data.reduce((a, b) => a + b, 0).toLocaleString('en-US');
  }

  /* ---------- themes ---------- */
  const pv = $('#pv');
  const tBtns = $$<HTMLButtonElement>('#themeList .theme-btn');
  let tTimer: number | undefined;
  tBtns.forEach(b => on(b, 'click', () => {
    if (b.getAttribute('aria-pressed') === 'true') return;
    tBtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    clearLater(tTimer);
    const theme = b.dataset.t ?? 't-graphite';
    if (reduce) { pv.className = `pv ${theme}`; return; }
    pv.classList.add('swap');
    tTimer = later(() => { pv.className = `pv swap ${theme}`; frame(() => pv.classList.remove('swap')); }, 170);
  }));

  /* ---------- pricing toggle ---------- */
  const billBtns = $$<HTMLButtonElement>('#bill button');
  billBtns.forEach(b => on(b, 'click', () => {
    if (b.getAttribute('aria-pressed') === 'true') return;
    billBtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const k = b.dataset.b as 'm' | 'y';
    $$('.price').forEach(pr => {
      const amt = $('.amt', pr), sm = $('small', pr);
      if (!amt.dataset[k]) return;
      amt.classList.add('swap');
      later(() => {
        amt.textContent = amt.dataset[k] ?? '';
        if (sm.dataset[k]) sm.textContent = sm.dataset[k] ?? '';
        amt.classList.remove('swap');
      }, reduce ? 0 : 160);
    });
  }));

  /* ---------- FAQ ---------- */
  $$<HTMLButtonElement>('#faqList .qa button').forEach(b => on(b, 'click', () => {
    b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true'));
  }));

  /* ---------- drop zone demo (the file never leaves the browser) ---------- */
  const dz = $('#dz'), fileIn = $<HTMLInputElement>('#fileIn'), idle = $('#dzIdle'), run = $('#dzRun');
  const fill = $('#dzFill'), stage = $('#dzStage'), pct = $('#dzPct'), done = $('#dzDone');
  const toast = $('#toast');
  let toastTimer: number | undefined;
  let runTimers: number[] = [];
  const say = (m: string) => {
    toast.textContent = m; toast.classList.add('show');
    clearLater(toastTimer); toastTimer = later(() => toast.classList.remove('show'), 2600);
  };
  const STAGES: Array<[string, number]> = [['Reading roles and dates', 22], ['Finding projects and results', 48], ['Writing headlines', 71], ['Picking a theme', 90], ['Building your preview', 100]];
  const reset = () => {
    runTimers.forEach(clearLater); runTimers = [];
    run.hidden = true; idle.hidden = false; done.hidden = true;
    fill.style.transform = 'scaleX(0)'; pct.textContent = '0%';
    fileIn.value = ''; fileIn.hidden = false;
  };
  const start = (file: File | null | undefined) => {
    if (!file) return;
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) { say('That file type isn’t supported. Use PDF, DOCX or TXT.'); return; }
    if (file.size > 10 * 1024 * 1024) { say('That file is over 10 MB. Try a smaller export.'); return; }
    runTimers.forEach(clearLater); runTimers = [];
    idle.hidden = true; run.hidden = false; done.hidden = true; fileIn.hidden = true;
    $('#dzName').textContent = file.name;
    $('#dzExt').textContent = ext.toUpperCase().slice(0, 4);
    fill.style.transform = 'scaleX(0)';
    STAGES.forEach(([label, p], i) => runTimers.push(later(() => {
      stage.textContent = label; pct.textContent = `${p}%`; fill.style.transform = `scaleX(${p / 100})`;
      if (p === 100) runTimers.push(later(() => { done.hidden = false; stage.textContent = 'Done'; }, 450));
    }, reduce ? 0 : 250 + i * 650)));
  };
  on(fileIn, 'change', () => start(fileIn.files?.[0]));
  ['dragenter', 'dragover'].forEach(t => on(dz, t, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => on(dz, t, e => { e.preventDefault(); dz.classList.remove('over'); }));
  on(dz, 'drop', e => start((e as DragEvent).dataTransfer?.files[0]));
  on($('#dzReset'), 'click', e => { e.stopPropagation(); reset(); fileIn.focus(); });

  /* ---------- silk shader (black and grey) ---------- */
  {
    const canvas = $<HTMLCanvasElement>('#silk');
    const gl = canvas.getContext('webgl', { antialias: false });
    if (gl) {
      const vs = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';
      const fs = `precision highp float;varying vec2 vUv;uniform float uTime;uniform vec3 uColor;uniform float uSpeed;uniform float uScale;uniform float uRotation;uniform float uNoise;uniform vec2 uRes;
        const float e=2.71828182845904523536;
        float noise(vec2 t){float G=e;vec2 r=(G*sin(G*t));return fract(r.x*r.y*(1.0+t.x));}
        vec2 rot(vec2 uv,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*uv;}
        void main(){float rnd=noise(gl_FragCoord.xy);vec2 uv=vUv;uv.x*=max(1.0,uRes.x/uRes.y)*0.55;uv=rot(uv*uScale,uRotation);vec2 tex=uv*uScale;float t=uSpeed*uTime;
          tex.y+=0.03*sin(8.0*tex.x-t);
          float pattern=0.6+0.4*sin(5.0*(tex.x+tex.y+cos(3.0*tex.x+5.0*tex.y)+0.02*t)+sin(20.0*(tex.x+tex.y-0.1*t)));
          vec3 col=uColor*pattern-rnd/15.0*uNoise;gl_FragColor=vec4(col,1.0);}`;
      const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const U = (n: string) => gl.getUniformLocation(prog, n);
        gl.uniform3f(U('uColor'), 0.36, 0.36, 0.38);
        gl.uniform1f(U('uSpeed'), 5); gl.uniform1f(U('uScale'), 1); gl.uniform1f(U('uRotation'), 0.35); gl.uniform1f(U('uNoise'), 1.5);
        const uTime = U('uTime'), uRes = U('uRes');
        const resize = () => {
          const d = Math.min(devicePixelRatio || 1, 1.5);
          const w = Math.round(canvas.clientWidth * d), h = Math.round(canvas.clientHeight * d);
          if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uRes, w, h); }
        };
        let t = 0, last = performance.now(), running = true, visible = true;
        const draw = () => { resize(); gl.uniform1f(uTime, t); gl.drawArrays(gl.TRIANGLES, 0, 3); };
        const loop = (now: number) => {
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (running) { t += 0.1 * dt; draw(); }
          frame(loop);
        };
        const update = () => { running = visible && !document.hidden; last = performance.now(); };
        on(window, 'resize', draw);
        on(document, 'visibilitychange', update);
        observe(entries => { visible = entries[0].isIntersecting; update(); }, canvas);
        if (reduce) { t = 3; draw(); } else frame(loop);
      }
    }
  }

  return () => {
    disposed = true;
    timeouts.forEach(id => clearTimeout(id));
    frames.forEach(id => cancelAnimationFrame(id));
    cleanups.forEach(fn => fn());
  };
}
