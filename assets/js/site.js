/* Oval Fund static site starter
   - Active nav highlight
   - Investor letter browser + filters
   - Performance chart (Chart.js) from /data/performance.json
*/

function q(sel, el=document){ return el.querySelector(sel); }
function qa(sel, el=document){ return Array.from(el.querySelectorAll(sel)); }

function formatPct(x){
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  const sign = x > 0 ? "+" : "";
  return sign + x.toFixed(2) + "%";
}

function parseISODate(s){
  // Expect YYYY-MM-DD
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, (m||1)-1, d||1);
}

function setupActiveNav(){
  const links = qa('.nav-links a[href^="#"]');
  const sections = links
    .map(a => ({ a, id: a.getAttribute('href').slice(1) }))
    .map(x => ({ ...x, el: document.getElementById(x.id) }))
    .filter(x => x.el);

  if (!sections.length) return;

  const setActive = (id) => {
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#'+id));
  };

  const onScroll = () => {
    const top = window.scrollY + 90; // header offset
    let current = sections[0].id;
    for (const s of sections){
      if (s.el.offsetTop <= top) current = s.id;
    }
    setActive(current);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

async function loadLetters(){
  const grid = q('#lettersGrid');
  if (!grid) return;

  const yearPills = qa('[data-filter="year"] .pill');
  const quarterPills = qa('[data-filter="quarter"] .pill');

  let letters = [];
  try {
    const res = await fetch('content/letters.json', { cache: 'no-store' });
    letters = await res.json();
  } catch (e){
    grid.innerHTML = `<div class="note">Unable to load letters.json. Check that <code>content/letters.json</code> exists.</div>`;
    return;
  }

  // normalize
  letters = letters
    .map(x => ({
      ...x,
      year: Number(x.year),
      quarter: String(x.quarter || '').toUpperCase(),
      dateObj: parseISODate(x.date || '1970-01-01')
    }))
    .sort((a,b) => b.dateObj - a.dateObj);

  let state = { year: 'all', quarter: 'all' };

  const setPills = () => {
    yearPills.forEach(p => p.classList.toggle('active', p.dataset.value === state.year));
    quarterPills.forEach(p => p.classList.toggle('active', p.dataset.value === state.quarter));
  };

  const render = () => {
    const filtered = letters.filter(x => {
      const yOk = (state.year === 'all') || (String(x.year) === state.year);
      const qOk = (state.quarter === 'all') || (x.quarter === state.quarter);
      return yOk && qOk;
    });

    if (!filtered.length){
      grid.innerHTML = `<div class="note">No letters match the current filters.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(x => {
      const meta = `${x.year} · ${x.quarter} · ${x.date || ''}`.replace(' · ', ' | ');
      const cover = x.coverUrl || 'assets/img/letter-placeholder.svg';
      const href = x.pdfUrl || '#';
      const safeTitle = (x.title || 'Investor Letter').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const safeSummary = (x.summary || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');

      return `
        <a class="letter-card" href="${href}" target="_blank" rel="noopener">
          <img src="${cover}" alt="${safeTitle}">
          <div class="body">
            <div class="meta">${meta}</div>
            <div class="title">${safeTitle}</div>
            <div class="desc">${safeSummary}</div>
          </div>
        </a>
      `;
    }).join('');
  };

  yearPills.forEach(p => p.addEventListener('click', () => { state.year = p.dataset.value; setPills(); render(); }));
  quarterPills.forEach(p => p.addEventListener('click', () => { state.quarter = p.dataset.value; setPills(); render(); }));

  setPills();
  render();
}

function computePerf(series, base){
  const toPct = (nav) => (nav / base - 1) * 100;
  const out = series.map(d => ({
    date: d.date,
    fund: toPct(d.fund),
    sp500: toPct(d.sp500),
    brk: toPct(d.brk),
    fundNav: d.fund
  }));
  return out;
}

function calcSimpleReturn(navStart, navEnd){
  if (!navStart || !navEnd) return null;
  return (navEnd / navStart - 1) * 100;
}

function maxDrawdown(navSeries){
  let peak = -Infinity;
  let maxDd = 0;
  for (const v of navSeries){
    if (v > peak) peak = v;
    const dd = (v / peak - 1) * 100;
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd;
}

async function loadPerformance(){
  const canvasFull = q('#perfChart');
  const canvasMini = q('#perfMini');
  const statsBox = q('#perfStats');

  if (!canvasFull && !canvasMini) return;

  if (typeof Chart === 'undefined'){
    console.warn('Chart.js not loaded. Add Chart.js <script> before assets/js/site.js');
    return;
  }

  let payload;
  try {
    const res = await fetch('data/performance.json', { cache: 'no-store' });
    payload = await res.json();
  } catch(e){
    const target = canvasFull || canvasMini;
    if (target && target.parentElement){
      target.parentElement.innerHTML = `<div class="note">Unable to load <code>data/performance.json</code>.</div>`;
    }
    return;
  }

  const base = payload.base || 100;
  const series = Array.isArray(payload.series) ? payload.series : [];
  if (!series.length) return;

  const perf = computePerf(series, base);

  // compute basic stats from NAV
  const nav = series.map(d => d.fund);
  const latest = nav[nav.length-1];
  const start = nav[0];

  const rSince = calcSimpleReturn(start, latest);
  const r4 = nav.length >= 5 ? calcSimpleReturn(nav[nav.length-5], latest) : null; // ~1 month if weekly
  const r12 = nav.length >= 13 ? calcSimpleReturn(nav[nav.length-13], latest) : null; // ~3 months
  const dd = maxDrawdown(nav);

  if (statsBox){
    statsBox.innerHTML = `
      <div class="stat"><div class="k">Since start</div><div class="v">${formatPct(rSince)}</div></div>
      <div class="stat"><div class="k">~1M</div><div class="v">${formatPct(r4)}</div></div>
      <div class="stat"><div class="k">~3M</div><div class="v">${formatPct(r12)}</div></div>
      <div class="stat"><div class="k">Max drawdown</div><div class="v">${formatPct(dd)}</div></div>
    `;
  }

  const buildChart = (canvas, points, title) => {
    const ctx = canvas.getContext('2d');

    const labels = points.map(d => d.date);
    const dataset = (key, label, borderColor) => ({
      label,
      data: points.map(d => d[key]),
      borderColor,
      backgroundColor: 'transparent',
      tension: 0.25,
      borderWidth: 2,
      pointRadius: 0
    });

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          dataset('fund', 'Fund', '#2457ff'),
          dataset('sp500', 'S&P 500', '#ef4444'),
          dataset('brk', 'BRK', '#ffb000')
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: { display: !!title, text: title },
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatPct(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => v + '%'
            },
            grid: { color: '#eef0f5' }
          },
          x: {
            ticks: { maxTicksLimit: 8 },
            grid: { display: false }
          }
        }
      }
    });
  };

  if (canvasMini){
    const slice = perf.slice(Math.max(0, perf.length - 14)); // last ~3 months weekly
    buildChart(canvasMini, slice, '');
  }

  if (canvasFull){
    buildChart(canvasFull, perf, '');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupActiveNav();
  loadLetters();
  loadPerformance();
});
