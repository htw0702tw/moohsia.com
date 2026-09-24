const cleanups = [];

export function unmountMotion() {
  while (cleanups.length) {
    const fn = cleanups.pop();
    try {
      fn();
    } catch {
      /* ignore teardown errors */
    }
  }
}

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function bindReveal(scope, reduce) {
  const nodes = [...scope.querySelectorAll(".reveal")];
  if (!nodes.length) return;
  if (reduce || !("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("is-in"));
    return;
  }
  const groups = new Map();
  nodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent) return;
    const list = groups.get(parent) || [];
    list.push(node);
    groups.set(parent, list);
  });
  groups.forEach((list) => {
    list.forEach((node, index) => {
      node.style.transitionDelay = `${Math.min(index, 8) * 80}ms`;
    });
  });
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
  );
  nodes.forEach((node) => observer.observe(node));
  cleanups.push(() => observer.disconnect());
}

function bindParallax(scope, reduce) {
  if (reduce) return;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hero = scope.querySelector("[data-hero]");
  const cards = [...scope.querySelectorAll("[data-tilt]")];
  if (!hero && !cards.length) return;

  const onScroll = () => {
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const fade = Math.min(1, Math.max(0, -rect.top / (rect.height * 0.72)));
    hero.style.setProperty("--scroll", fade.toFixed(3));
  };

  const onMove = (event) => {
    if (hero && fine) {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      const y = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
      hero.style.setProperty("--px", x.toFixed(4));
      hero.style.setProperty("--py", y.toFixed(4));
    }
    if (!fine) return;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (event.clientY < rect.top - 48 || event.clientY > rect.bottom + 48) return;
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      const y = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
      card.style.setProperty("--mx", x.toFixed(4));
      card.style.setProperty("--my", y.toFixed(4));
    });
  };

  const onLeave = (event) => {
    event.currentTarget.style.setProperty("--mx", "0");
    event.currentTarget.style.setProperty("--my", "0");
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  if (fine) {
    window.addEventListener("pointermove", onMove, { passive: true });
    cards.forEach((card) => card.addEventListener("pointerleave", onLeave));
  }
  onScroll();
  cleanups.push(() => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onMove);
    cards.forEach((card) => card.removeEventListener("pointerleave", onLeave));
  });
}

function spawnDot(initial) {
  return {
    x: Math.random(),
    y: initial ? Math.random() : 1.04,
    r: Math.random() * 1.7 + 0.35,
    v: Math.random() * 0.00055 + 0.00008,
    drift: (Math.random() - 0.5) * 0.00022,
    color: Math.random() > 0.58 ? "255,176,32" : Math.random() > 0.45 ? "255,59,134" : "179,136,255",
    a: Math.random() * 0.5 + 0.16,
    trail: Math.random() > 0.7,
  };
}

function bindParticles(scope, reduce) {
  const canvas = scope.querySelector("canvas.dust");
  if (!canvas || reduce) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const mobile = window.matchMedia("(max-width: 720px)").matches;
  const dots = Array.from({ length: mobile ? 34 : 76 }, () => spawnDot(true));
  let width = 1;
  let height = 1;
  let dpr = 1;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = Math.max(1, Math.floor(rect.width * dpr));
    height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.width = width;
    canvas.height = height;
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  let frame = 0;
  let alive = true;
  let onscreen = true;

  const draw = () => {
    if (!alive) return;
    if (!onscreen || document.visibilityState === "hidden") return;
    context.clearRect(0, 0, width, height);
    dots.forEach((dot) => {
      dot.y -= dot.v;
      dot.x += dot.drift;
      if (dot.y < -0.04 || dot.x < -0.05 || dot.x > 1.05) {
        const next = spawnDot(false);
        dot.x = next.x;
        dot.y = next.y;
        dot.v = next.v;
        dot.drift = next.drift;
      }
      const px = dot.x * width;
      const py = dot.y * height;
      if (dot.trail) {
        context.strokeStyle = `rgba(${dot.color}, ${dot.a * 0.55})`;
        context.lineWidth = Math.max(1, dot.r * dpr * 0.7);
        context.beginPath();
        context.moveTo(px, py);
        context.lineTo(px - dot.drift * width * 28, py + 22 * dpr);
        context.stroke();
      }
      context.beginPath();
      context.fillStyle = `rgba(${dot.color}, ${dot.a})`;
      context.arc(px, py, dot.r * dpr, 0, Math.PI * 2);
      context.fill();
    });
    frame = requestAnimationFrame(draw);
  };

  const kick = () => {
    if (!alive || !onscreen || document.visibilityState === "hidden") return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  };

  const intersection = new IntersectionObserver(([entry]) => {
    onscreen = Boolean(entry?.isIntersecting);
    kick();
  });
  intersection.observe(canvas);
  const onVis = () => kick();
  document.addEventListener("visibilitychange", onVis);
  kick();

  cleanups.push(() => {
    alive = false;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  });
}

export function mountMotion(scope) {
  unmountMotion();
  if (!scope) return;
  const reduce = reduced();
  bindReveal(scope, reduce);
  bindParallax(scope, reduce);
  bindParticles(scope, reduce);
}

let chromeBound = false;

export function mountChrome() {
  if (chromeBound) return;
  chromeBound = true;
  const reduce = reduced();
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const onScroll = () => {
    const bar = document.querySelector(".scroll-progress span");
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (bar) bar.style.transform = `scaleX(${progress})`;
    document.querySelector(".nav")?.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const tick = () => {
    const node = document.querySelector("[data-clock]");
    if (!node) return;
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Taipei",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
    node.textContent = `TPE ${time}`;
  };
  tick();
  const timer = window.setInterval(tick, 1000);

  const onMove = (event) => {
    const coords = document.querySelector("[data-coords]");
    if (coords) {
      const x = Math.round((event.clientX / Math.max(window.innerWidth, 1)) * 999)
        .toString()
        .padStart(3, "0");
      const y = Math.round((event.clientY / Math.max(window.innerHeight, 1)) * 999)
        .toString()
        .padStart(3, "0");
      coords.textContent = `X ${x}  Y ${y}`;
    }
    if (!fine || reduce) return;
    const reticle = document.querySelector(".reticle");
    if (reticle) reticle.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  };
  if (fine) window.addEventListener("pointermove", onMove, { passive: true });

  window.addEventListener("beforeunload", () => window.clearInterval(timer));
}
