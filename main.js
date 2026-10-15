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
      drawBars(el);
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

  // HERO: as miniaturas sao copias das telas reais, como as cores do tenis na
  // referencia. Tocar numa troca a tela do celular.
  const phone = document.querySelector('[data-hero-phone]');
  const screens = phone ? [...phone.querySelectorAll('[data-screen]')] : [];
  const names = { treino: 'Treino', hoje: 'Hoje', plano: 'Plano', resultado: 'Resultado' };
  document.querySelectorAll('[data-clone]').forEach((slot) => {
    const src = phone.querySelector(`[data-screen="${slot.dataset.clone}"]`);
    if (!src) return;
    const copy = src.cloneNode(true);
    copy.removeAttribute('data-screen');
    copy.querySelectorAll('[data-demo-set],[data-demo-next],[data-demo-count]').forEach((n) => {
      n.removeAttribute('data-demo-set');
      n.removeAttribute('data-demo-next');
      n.removeAttribute('data-demo-count');
    });
    slot.appendChild(copy);
  });

  const thumbs = [...document.querySelectorAll('.thumb')];
  const showScreen = (name) => {
    screens.forEach((s) => s.classList.toggle('is-active', s.dataset.screen === name));
    thumbs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.show === name)));
    phone.setAttribute('aria-label', `Tela ${names[name]} do Voluma`);
  };
  thumbs.forEach((t) => t.addEventListener('click', () => showScreen(t.dataset.show)));
  if (phone) showScreen('treino');

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

  // Academias: trocar a cor mostra como fica o app de cada uma.
  const demo = document.querySelector('[data-gym-demo]');
  const nameEl = document.querySelector('[data-gym-name]');
  const live = document.querySelector('[data-gym-live]');
  document.querySelectorAll('.swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      demo.style.setProperty('--gym', btn.style.getPropertyValue('--c'));
      nameEl.textContent = btn.dataset.name;
      live.textContent = `Mostrando o app ${btn.dataset.name}`;
    });
  });
})();
