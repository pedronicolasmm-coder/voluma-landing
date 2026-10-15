// Voluma landing. Sem dependencias. Nada aqui escuta o evento de scroll:
// entradas e troca de telas usam IntersectionObserver.
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Gerador deterministico: os desenhos saem iguais a cada visita.
  const rng = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Grade de pontos (dot-matrix): uma coluna por semana, uma linha por dia,
  // cinco niveis de cinza por faixa de carga, como em src/ui/DotMatrix.tsx.
  document.querySelectorAll('[data-matrix]').forEach((el) => {
    const weeks = Number(el.dataset.matrix);
    const rand = rng(Number(el.dataset.seed) || 1);
    const trainingDays = new Set([0, 1, 3, 4, 5]); // seg, ter, qui, sex, sab
    const frag = document.createDocumentFragment();
    for (let w = 0; w < weeks; w += 1) {
      for (let d = 0; d < 7; d += 1) {
        const dot = document.createElement('i');
        const consistency = 0.45 + (w / weeks) * 0.45; // mais constante com o tempo
        if (trainingDays.has(d) && rand() < consistency) {
          dot.dataset.l = String(1 + Math.min(3, Math.floor(rand() * 4)));
        }
        frag.appendChild(dot);
      }
    }
    el.appendChild(frag);
  });

  // Dias treinados no ranking: quadrados acesos na cor da pessoa.
  // --i e --row escalonam o acender: dia a dia, pessoa a pessoa.
  document.querySelectorAll('[data-days]').forEach((el, row) => {
    const n = Number(el.dataset.days);
    for (let i = 0; i < 7; i += 1) {
      const sq = document.createElement('i');
      if (i < n) sq.className = 'on';
      sq.style.setProperty('--i', i);
      sq.style.setProperty('--row', row);
      el.appendChild(sq);
    }
  });

  // Graficos: escala de numeros redondos a direita, meses embaixo, o seu dado
  // em laranja com brilho (design.md, secao 6).
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (name, attrs) => {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };

  // Desenhado no tamanho real do espaco (e redesenhado quando ele muda), para
  // os rotulos nao esticarem junto com as barras.
  const drawBars = (el) => {
    const data = [6.2, 7.1, 6.8, 7.9, 5.4, 8.4, 7.7, 8.9, 9.3, 8.8, 9.9, 10.4];
    const months = { 0: 'jul', 4: 'ago', 8: 'set', 11: 'out' };
    const W = Math.max(240, el.clientWidth), H = Math.max(200, el.clientHeight);
    const pad = { t: 10, r: 44, b: 28, l: 0 };
    const max = 12;
    el.replaceChildren();
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
    const defs = svgEl('defs', {});
    const f = svgEl('filter', { id: 'glow', x: '-50%', y: '-20%', width: '200%', height: '140%' });
    f.appendChild(svgEl('feGaussianBlur', { stdDeviation: '6' }));
    defs.appendChild(f);
    svg.appendChild(defs);
    const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
    [0, 5, 10].forEach((v) => {
      const y = pad.t + plotH - (v / max) * plotH;
      svg.appendChild(svgEl('line', { x1: 0, x2: plotW, y1: y, y2: y, stroke: 'rgba(255,255,255,0.07)', 'vector-effect': 'non-scaling-stroke' }));
      const t = svgEl('text', { x: W - 4, y: y + 4, 'text-anchor': 'end' });
      t.textContent = v === 0 ? '0' : `${v} mil`;
      svg.appendChild(t);
    });
    const step = plotW / data.length;
    const bw = step * 0.42;
    data.forEach((v, i) => {
      const h = (v / max) * plotH;
      const x = pad.l + i * step + (step - bw) / 2;
      const y = pad.t + plotH - h;
      const last = i === data.length - 1;
      const g = svgEl('g', { class: 'bar', style: `--i:${i}` });
      if (last) g.appendChild(svgEl('rect', { x, y, width: bw, height: h, rx: bw / 2, fill: '#FF5C00', opacity: 0.8, filter: 'url(#glow)' }));
      g.appendChild(svgEl('rect', { x, y, width: bw, height: h, rx: Math.min(bw / 2, 6), fill: last ? '#FF5C00' : 'rgba(245,245,245,0.82)' }));
      svg.appendChild(g);
      if (months[i]) {
        const t = svgEl('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle' });
        t.textContent = months[i];
        svg.appendChild(t);
      }
    });
    el.appendChild(svg);
  };

  const drawLine = (el) => {
    const data = [80.6, 80.4, 80.5, 80.1, 79.8, 79.9, 79.5, 79.2, 79.0, 78.9, 78.6, 78.4];
    const W = 300, H = 110, pad = 8;
    const min = 78, max = 81;
    const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (W - pad * 2), pad + (1 - (v - min) / (max - min)) * (H - pad * 2)]);
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    const defs = svgEl('defs', {});
    const grad = svgEl('linearGradient', { id: 'area', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svgEl('stop', { offset: '0', 'stop-color': 'rgb(255,92,0)', 'stop-opacity': '0.24' }));
    grad.appendChild(svgEl('stop', { offset: '1', 'stop-color': 'rgb(255,92,0)', 'stop-opacity': '0' }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(svgEl('path', { class: 'area', d: `${d} L${W - pad} ${H} L${pad} ${H} Z`, fill: 'url(#area)' }));
    svg.appendChild(svgEl('path', { class: 'line', d, pathLength: 1, fill: 'none', stroke: '#FF5C00', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }));
    el.appendChild(svg);
  };

  document.querySelectorAll('[data-chart="bars"]').forEach((el) => {
    let lastWidth = 0;
    new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      drawBars(el);
    }).observe(el);
  });
  document.querySelectorAll('[data-chart="line"]').forEach(drawLine);

  // O dado se preenche quando entra na tela: barras sobem, a linha se
  // desenha, os dias do ranking acendem. Uma vez so.
  document.querySelectorAll('.chart, .ranking').forEach((el) => el.setAttribute('data-anim', ''));
  const animIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      animIO.unobserve(e.target);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('[data-anim]').forEach((el) => animIO.observe(el));

  // Topo: o celular mostra o gesto central do app. A serie 3 e marcada, a 4
  // vira a da vez e tambem e marcada. Duas batidas e para.
  const demoSet = document.querySelector('[data-demo-set]');
  const demoNext = document.querySelector('[data-demo-next]');
  const demoCount = document.querySelector('[data-demo-count]');
  const check = (set, count) => {
    set.classList.add('is-done');
    set.classList.remove('is-next');
    demoCount.textContent = String(count);
  };
  if (!reduce && demoSet && demoNext) {
    setTimeout(() => {
      check(demoSet, 3);
      demoNext.classList.add('is-next');
    }, 1900);
    setTimeout(() => check(demoNext, 4), 3500);
  }

  // Como funciona: o passo no meio da tela escolhe a tela do celular.
  const steps = [...document.querySelectorAll('.step')];
  const screens = [...document.querySelectorAll('.how__stage [data-screen]')];
  const show = (index) => {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
    screens.forEach((s, i) => s.classList.toggle('is-active', i === index));
  };
  show(0);

  // Desktop: o celular fica preso e o passo no meio da tela escolhe a tela.
  // Celular: nao ha espaco para prender o aparelho ao lado do texto, entao as
  // tres telas passam sozinhas enquanto ele esta visivel.
  const narrow = matchMedia('(max-width: 899px)');
  const stepIO = new IntersectionObserver((entries) => {
    if (narrow.matches) return;
    entries.forEach((e) => {
      if (e.isIntersecting) show(Number(e.target.dataset.step));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => stepIO.observe(s));

  let cycle = 0;
  let current = 0;
  const stage = document.querySelector('.how__stage');
  new IntersectionObserver(([e]) => {
    clearInterval(cycle);
    if (!narrow.matches || reduce || !e.isIntersecting) return;
    // Uma volta so (Plano, Treino, Resultado, Plano) e para: movimento
    // automatico nao fica rodando sem fim ao lado do texto.
    let left = screens.length;
    cycle = setInterval(() => {
      current = (current + 1) % screens.length;
      show(current);
      left -= 1;
      if (left === 0) clearInterval(cycle);
    }, 3600);
  }, { threshold: 0.6 }).observe(stage);

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

  // Marquee: duplica a lista para o loop nao ter emenda. Com movimento
  // reduzido, a lista fica parada e sem copia.
  const track = document.querySelector('.marquee__track');
  if (track && !reduce) {
    [...track.children].forEach((li) => {
      const copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
    });
  }

  // Pausar a faixa: o hover so serve para mouse; teclado e toque usam o botao.
  const toggle = document.querySelector('[data-marquee-toggle]');
  toggle?.addEventListener('click', () => {
    const paused = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Continuar' : 'Pausar';
    toggle.closest('.marquee').classList.toggle('is-paused', paused);
  });
})();
