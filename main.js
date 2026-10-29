// Voluma landing (versao clara). Sem dependencias. Nada escuta o evento de
// scroll: entradas usam IntersectionObserver.
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Gerador deterministico: os desenhos saem iguais a cada visita.
  const rng = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Grade de pontos: uma coluna por semana, uma linha por dia, cinco niveis
  // por faixa de carga, como em src/ui/DotMatrix.tsx do app.
  document.querySelectorAll('[data-matrix]').forEach((el) => {
    const weeks = Number(el.dataset.matrix);
    const rand = rng(Number(el.dataset.seed) || 1);
    const trainingDays = new Set([0, 1, 3, 4, 5]);
    const frag = document.createDocumentFragment();
    for (let w = 0; w < weeks; w += 1) {
      for (let d = 0; d < 7; d += 1) {
        const dot = document.createElement('i');
        if (trainingDays.has(d) && rand() < 0.45 + (w / weeks) * 0.45) {
          dot.dataset.l = String(1 + Math.min(3, Math.floor(rand() * 4)));
        }
        frag.appendChild(dot);
      }
    }
    el.appendChild(frag);
  });

  // Graficos: numeros redondos a direita, meses embaixo, a semana atual em
  // laranja (design.md do app, secao 6), nas cores do card claro.
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (name, attrs) => {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };

  const drawBars = (el) => {
    const data = [6.2, 7.1, 6.8, 7.9, 5.4, 8.4, 7.7, 8.9, 9.3, 8.8, 9.9, 10.4];
    const months = { 0: 'jul', 4: 'ago', 8: 'set', 11: 'out' };
    const W = Math.max(220, el.clientWidth), H = Math.max(160, el.clientHeight);
    const pad = { t: 8, r: 40, b: 24 };
    const max = 12;
    el.replaceChildren();
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
    const plotW = W - pad.r, plotH = H - pad.t - pad.b;
    [0, 5, 10].forEach((v) => {
      const y = pad.t + plotH - (v / max) * plotH;
      svg.appendChild(svgEl('line', { x1: 0, x2: plotW, y1: y, y2: y, stroke: 'rgba(0,0,0,0.08)' }));
      const t = svgEl('text', { x: W - 2, y: y + 4, 'text-anchor': 'end' });
      t.textContent = v === 0 ? '0' : `${v} mil`;
      svg.appendChild(t);
    });
    const step = plotW / data.length;
    const bw = step * 0.46;
    data.forEach((v, i) => {
      const h = (v / max) * plotH;
      const x = i * step + (step - bw) / 2;
      const y = pad.t + plotH - h;
      const g = svgEl('g', { class: 'bar', style: `--i:${i}` });
      g.appendChild(svgEl('rect', { x, y, width: bw, height: h, rx: Math.min(bw / 2, 5), fill: i === data.length - 1 ? '#FF5C00' : '#3E3E3E' }));
      svg.appendChild(g);
      if (months[i]) {
        const t = svgEl('text', { x: x + bw / 2, y: H - 4, 'text-anchor': 'middle' });
        t.textContent = months[i];
        svg.appendChild(t);
      }
    });
    el.appendChild(svg);
  };

  const drawLine = (el) => {
    const data = [80.6, 80.4, 80.5, 80.1, 79.8, 79.9, 79.5, 79.2, 79.0, 78.9, 78.6, 78.4];
    const W = 300, H = 110, pad = 6, min = 78, max = 81;
    const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (W - pad * 2), pad + (1 - (v - min) / (max - min)) * (H - pad * 2)]);
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    const defs = svgEl('defs', {});
    const grad = svgEl('linearGradient', { id: 'area', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svgEl('stop', { offset: '0', 'stop-color': 'rgb(255,92,0)', 'stop-opacity': '0.22' }));
    grad.appendChild(svgEl('stop', { offset: '1', 'stop-color': 'rgb(255,92,0)', 'stop-opacity': '0' }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(svgEl('path', { class: 'area', d: `${d} L${W - pad} ${H} L${pad} ${H} Z`, fill: 'url(#area)' }));
    svg.appendChild(svgEl('path', { class: 'line', d, pathLength: 1, fill: 'none', stroke: '#FF5C00', 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }));
    el.appendChild(svg);
  };

  // Barras redesenhadas no tamanho real do espaco, para o texto nao esticar.
  document.querySelectorAll('[data-chart="bars"]').forEach((el) => {
    let lastWidth = 0;
    new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      // Redesenha no proximo quadro: mexer no DOM dentro do callback gera o
      // aviso "ResizeObserver loop" no Safari.
      requestAnimationFrame(() => drawBars(el));
    }).observe(el);
  });
  document.querySelectorAll('[data-chart="line"]').forEach(drawLine);

  // O dado se preenche quando entra na tela. Uma vez so.
  document.querySelectorAll('.chart').forEach((el) => el.setAttribute('data-anim', ''));
  const animIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      animIO.unobserve(e.target);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('[data-anim]').forEach((el) => animIO.observe(el));

  // HERO: os botoes em pilula trocam a tela do celular.
  const phone = document.querySelector('[data-hero-phone]');
  const screens = phone ? [...phone.querySelectorAll('[data-screen]')] : [];
  const names = { treino: 'Treino', hoje: 'Hoje', plano: 'Plano', resultado: 'Resultado' };

  // O celular precisa caber inteiro na altura da tela,
  // inclusive em notebook de 1366x768. Escala entre 0,42 e 0,7.
  const stage = document.querySelector('.hero__stage');
  const fitHero = () => {
    if (!stage) return;
    if (innerWidth < 900) {
      stage.style.removeProperty('--s');
      return;
    }
    // Um celular so: ele usa a altura toda da tela.
    const avail = innerHeight - 72 - 40;
    stage.style.setProperty('--s', Math.max(0.42, Math.min(0.7, avail / 860)).toFixed(3));
  };
  fitHero();
  addEventListener('resize', fitHero);

  const switchBtns = [...document.querySelectorAll(".switch__btn")];
  const phoneWrap = document.querySelector(".hero__stage .phone-wrap");
  const showScreen = (name, { bump = true } = {}) => {
    screens.forEach((s) => s.classList.toggle("is-active", s.dataset.screen === name));
    switchBtns.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.show === name)));
    phone.setAttribute("aria-label", `Tela ${names[name]} do Voluma`);
    // O celular "pulsa" quando a tela troca: liga o botao ao que mudou.
    if (bump && !reduce && phoneWrap?.animate) {
      phoneWrap.animate([{ scale: 1 }, { scale: 0.965 }, { scale: 1 }], { duration: 360, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
    }
  };

  // Demonstracao: depois que o treino termina de se marcar, o site passa
  // pelas telas sozinho UMA vez. O botao ativo enche (barrinha) e o celular
  // troca quando ela completa. Qualquer toque no seletor para de vez.
  const tour = ["hoje", "plano", "resultado", "treino"];
  const STEP = 3200;
  let tourTimer = 0;
  let tourOn = false;
  const clearTiming = () => switchBtns.forEach((t) => t.classList.remove("is-timing"));
  const stopTour = () => {
    tourOn = false;
    clearTimeout(tourTimer);
    clearTiming();
  };
  const runTour = (i) => {
    if (!tourOn || i >= tour.length) return stopTour();
    const current = switchBtns.find((t) => t.getAttribute("aria-pressed") === "true");
    clearTiming();
    if (current) {
      current.style.setProperty("--dur", `${STEP}ms`);
      void current.offsetWidth; // reinicia a animacao da barrinha
      current.classList.add("is-timing");
    }
    tourTimer = setTimeout(() => {
      if (!tourOn) return;
      showScreen(tour[i]);
      runTour(i + 1);
    }, STEP);
  };
  switchBtns.forEach((t) => t.addEventListener("click", () => {
    stopTour();
    showScreen(t.dataset.show);
  }));
  document.querySelector(".switch")?.addEventListener("pointerenter", stopTour);
  if (phone) showScreen("treino", { bump: false });
  if (!reduce && phone) {
    // So comeca se o topo ainda estiver na tela; para se a pessoa rolar.
    let heroVisible = true;
    new IntersectionObserver(([e]) => {
      heroVisible = e.isIntersecting;
      if (!heroVisible) stopTour();
    }, { threshold: 0.3 }).observe(document.querySelector(".hero"));
    setTimeout(() => {
      if (!heroVisible) return;
      tourOn = true;
      runTour(0);
    }, 4200);
  }

  // Na tela Treino, a serie 3 e marcada, a 4 vira a da vez e e marcada.
  // Duas batidas e para: e o gesto central do app.
  const demoSet = phone?.querySelector('[data-demo-set]');
  const demoNext = phone?.querySelector('[data-demo-next]');
  const demoCount = phone?.querySelector('[data-demo-count]');
  const check = (set, count) => {
    set.classList.add('is-done');
    set.classList.remove('is-next');
    demoCount.textContent = String(count);
  };
  if (!reduce && demoSet && demoNext && demoCount) {
    setTimeout(() => {
      check(demoSet, 3);
      demoNext.classList.add('is-next');
    }, 1900);
    setTimeout(() => check(demoNext, 4), 3500);
  }

  // Movimentos: "Ver mais" mostra a segunda metade da grade.
  const cards = document.querySelector('[data-cards]');
  const more = document.querySelector('[data-more-toggle]');
  more?.addEventListener('click', () => {
    const open = !cards.classList.contains('is-open');
    cards.classList.toggle('is-open', open);
    more.setAttribute('aria-expanded', String(open));
    more.textContent = open ? 'Ver menos' : 'Ver mais';
  });

  // Academias: trocar a cor mostra como fica o app de cada uma. Na pagina
  // para academias a cor e o nome sao separados (data-color-only): o nome vem
  // do campo que o dono digita.
  const demo = document.querySelector('[data-gym-demo]');
  const nameEls = [...document.querySelectorAll('[data-gym-name]')];
  const subEls = [...document.querySelectorAll('[data-gym-sub]')];
  const live = document.querySelector('[data-gym-live]');
  const colorOnly = !!document.querySelector('[data-color-only]');
  const setName = (name) => {
    nameEls.forEach((el) => { el.textContent = name; });
    subEls.forEach((el) => { el.textContent = `Treinos da ${name}, semana a semana`; });
  };
  document.querySelectorAll('.swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      document.querySelectorAll('[data-gym-demo], [data-gym-demo-copy]').forEach((el) => el.style.setProperty('--gym', btn.style.getPropertyValue('--c')));
      if (!colorOnly) setName(btn.dataset.name);
      if (live) live.textContent = colorOnly ? `Cor ${btn.dataset.name} aplicada` : `Mostrando o app ${btn.dataset.name}`;
    });
  });
  const gymInput = document.querySelector('[data-gym-input]');
  gymInput?.addEventListener('input', () => {
    setName(gymInput.value.trim() || gymInput.dataset.default);
  });

  // Exemplo pronto: compara o app da academia ficticia com o Voluma padrao.
  // O CSS troca o tema pelo data-look; aqui so muda o atributo e pisca as telas.
  const caseEl = document.querySelector('.case[data-look]');
  const lookBtns = [...document.querySelectorAll('[data-look-btn]')];
  lookBtns.forEach((btn) => btn.addEventListener('click', () => {
    if (caseEl.dataset.look === btn.dataset.lookBtn) return;
    caseEl.dataset.look = btn.dataset.lookBtn;
    lookBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    if (!reduce) {
      caseEl.querySelectorAll('.phone').forEach((p, i) => p.animate(
        [{ opacity: 0.35, translate: '0 6px' }, { opacity: 1, translate: '0 0' }],
        { duration: 420, delay: i * 50, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' },
      ));
    }
  }));

  // ROLAR A PAGINA: cada secao com a sua entrada (o CSS faz o movimento).
  // [seletor, tipo, atraso da cascata em ms, atraso inicial]
  const reveals = [
    [".brands .h3, .brands .small", "up", 80],
    [".brand-logo", "up", 110, 160],
    [".split__dark", "wipe"],
    [".split__panel > *", "up", 90, 200],
    [".split__tile", "rise", 140, 250],
    ["#offer-title", "up"],
    [".steps li", "left", 120, 120],
    [".pcard", "pop", 0, 150],
    [".mini", "right", 0, 500],
    ["#mov-title, .collection .container > .body", "up", 90],
    [".band .h2, .band .body", "up", 90],
    [".dcard", "up", 110, 150],
    [".gyms__card", "left"],
    [".gyms__panel", "right", 0, 140],
    ["#faq-title", "up"],
    [".faq details", "up", 60, 80],
    [".footer__grid > *", "up", 100],
    // Pagina para academias
    [".gh__copy > *", "up", 90],
    [".gh__visual", "pop", 0, 150],
    [".case__copy > *", "up", 90],
    [".kit", "pop", 0, 150],
    [".train__copy > *", "up", 90],
    [".train__visual", "pop", 0, 150],
    [".case__item", "up", 110, 100],
    ["#impl-title", "up"],
    [".listing", "pop", 0, 150],
    ["#vant-title, .band .lead-dark", "up", 90],
    [".vcard", "up", 110, 100],
    [".cta-final .container > *", "up", 90],
  ];
  reveals.forEach(([sel, type, step = 0, base = 0]) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.dataset.reveal = type;
      el.style.setProperty("--d", `${base + i * step}ms`);
    });
  });
  // Cards de movimento: a cascata reinicia a cada linha de 3.
  document.querySelectorAll(".mcard").forEach((el, i) => {
    el.dataset.reveal = "up";
    el.style.setProperty("--d", `${(i % 3) * 90}ms`);
  });

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      revealIO.unobserve(e.target);
      (byParent.get(e.target) || [e.target]).forEach((el) => {
        el.setAttribute("data-visible", "");
        // Depois da entrada, devolve ao elemento as transicoes dele (hover, toque).
        const wait = parseInt(el.style.getPropertyValue("--d"), 10) || 0;
        setTimeout(() => {
          el.removeAttribute("data-reveal");
          el.removeAttribute("data-visible");
        }, wait + 1100);
      });
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  // Quem comeca 100% recortado (wipe, rise) nao "aparece" para o observer:
  // observa o pai e revela os filhos juntos.
  const byParent = new Map();
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    const clipped = el.dataset.reveal === "wipe" || el.dataset.reveal === "rise";
    const watch = clipped ? el.parentElement : el;
    if (!byParent.has(watch)) byParent.set(watch, []);
    byParent.get(watch).push(el);
    revealIO.observe(watch);
  });

  // NUMEROS: contam de 0 ate o valor quando aparecem (formato brasileiro).
  const counters = [...document.querySelectorAll(".cnt[data-count]")];
  const fmt = (v, dec) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
  if (!reduce) {
    counters.forEach((el) => { el.textContent = fmt(0, Number(el.dataset.dec)); });
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        countIO.unobserve(e.target);
        const el = e.target;
        const target = Number(el.dataset.count);
        const dec = Number(el.dataset.dec);
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / 1300);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = fmt(target * eased, dec);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => countIO.observe(el));
  }

  // MOUSE: o celular do topo inclina levemente seguindo o cursor.
  // So com mouse de verdade e sem pedido de menos movimento.
  const tiltTarget = document.querySelector(".phone-wrap--tilt");
  const hero = document.querySelector(".hero");
  if (tiltTarget && hero && !reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let frame = 0;
    hero.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = tiltTarget.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        tiltTarget.style.transform = `perspective(1200px) rotateY(${(dx * 16).toFixed(2)}deg) rotateX(${(-dy * 12).toFixed(2)}deg)`;
      });
    });
    hero.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      tiltTarget.style.transform = "";
    });
  }
})();
