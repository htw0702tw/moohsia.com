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
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
  );
  nodes.forEach((node) => observer.observe(node));
  cleanups.push(() => observer.disconnect());
}

function bindParallax(scope, reduce) {
  if (reduce) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const hero = scope.querySelector("[data-hero]");
  const cards = [...scope.querySelectorAll("[data-tilt]")];
  if (!hero && !cards.length) return;

  const onMove = (event) => {
    if (hero) {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      hero.style.setProperty("--px", x.toFixed(4));
      hero.style.setProperty("--py", y.toFixed(4));
    }
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (event.clientY < rect.top - 40 || event.clientY > rect.bottom + 40) return;
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--mx", x.toFixed(4));
      card.style.setProperty("--my", y.toFixed(4));
    });
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  cleanups.push(() => window.removeEventListener("pointermove", onMove));
}

function bindParticles(scope, reduce) {
  const canvas = scope.querySelector("canvas.dust");
  if (!canvas || reduce) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const dots = Array.from({ length: 42 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.5 + 0.3,
    v: Math.random() * 0.00032 + 0.00006,
    color: Math.random() > 0.55 ? "255, 176, 32" : Math.random() > 0.5 ? "255, 59, 134" : "167, 139, 250",
    a: Math.random() * 0.45 + 0.12,
  }));

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  let frame = 0;
  const draw = () => {
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    dots.forEach((dot) => {
      dot.y -= dot.v;
      if (dot.y < -0.02) {
        dot.y = 1.02;
        dot.x = Math.random();
      }
      context.beginPath();
      context.fillStyle = `rgba(${dot.color}, ${dot.a})`;
      context.arc(dot.x * width, dot.y * height, dot.r * (width / 800), 0, Math.PI * 2);
      context.fill();
    });
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  cleanups.push(() => {
    cancelAnimationFrame(frame);
    observer.disconnect();
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
  const onScroll = () => {
    const bar = document.querySelector(".scroll-progress span");
    if (!bar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = `scaleX(${progress})`;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
