const DAY_MS = 86_400_000;

const COLORS = {
  ink: '#13161c',
  muted: '#707783',
  line: 'rgba(19, 22, 28, 0.10)',
  green: '#2457d6',
  greenFill: 'rgba(36, 87, 214, 0.10)',
  blue: '#2d7d87',
  gold: '#b37b27',
  red: '#c2494d',
  redFill: 'rgba(194, 73, 77, 0.12)'
};

const chartRegistry = new Map();

function query(selector, scope = document) {
  return scope.querySelector(selector);
}

function queryAll(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function setYear() {
  queryAll('[data-year]').forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
}

function setupNavigation() {
  const toggle = query('.nav-toggle');
  const nav = query('.site-nav');

  if (!toggle || !nav) {
    return;
  }

  const setOpen = (isOpen) => {
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? '关闭导航' : '打开导航');
    nav.classList.toggle('open', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) {
      setOpen(false);
    }
  });
}

function setupActiveNavigation() {
  if (document.body.dataset.page !== 'home') {
    return;
  }

  const links = queryAll('.site-nav a[href^="#"]');
  const sections = links
    .map((link) => ({ link, section: document.getElementById(link.getAttribute('href').slice(1)) }))
    .filter((item) => item.section);

  if (!sections.length || !('IntersectionObserver' in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

      if (!visible) {
        return;
      }

      links.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`);
      });
    },
    { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.2, 0.5] }
  );

  sections.forEach(({ section }) => observer.observe(section));
}

function setupReveal() {
  const elements = queryAll('[data-reveal]');

  if (!elements.length) {
    return;
  }

  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -48px 0px', threshold: 0.08 }
  );

  elements.forEach((element) => observer.observe(element));
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((items) => items.some((item) => String(item).trim() !== ''));
}

function normalizeHeader(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function columnIndex(headers, candidates) {
  const normalized = headers.map(normalizeHeader);
  return candidates.reduce((found, candidate) => {
    if (found !== -1) {
      return found;
    }
    return normalized.indexOf(normalizeHeader(candidate));
  }, -1);
}

function parseNumber(value) {
  const parsed = Number(String(value ?? '').replace(/[%$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseDate(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function formatDateShort(date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function formatPct(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

function formatNav(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `$${value.toFixed(2)}`;
}

function fillFields(attribute, value) {
  queryAll(`[${attribute}]`).forEach((element) => {
    element.textContent = value;
  });
}

function returnOverDays(points, days) {
  const latest = points.at(-1);
  const target = latest.date.getTime() - days * DAY_MS;
  let anchor = points[0];

  points.forEach((point) => {
    if (point.date.getTime() <= target) {
      anchor = point;
    }
  });

  return latest.fund / anchor.fund - 1;
}

function returnYearToDate(points) {
  const latestYear = points.at(-1).date.getUTCFullYear();
  const anchor = points.find((point) => point.date.getUTCFullYear() === latestYear);
  return anchor ? points.at(-1).fund / anchor.fund - 1 : Number.NaN;
}

function drawdownSeries(points) {
  let peak = Number.NEGATIVE_INFINITY;
  return points.map((point) => {
    peak = Math.max(peak, point.fund);
    return point.fund / peak - 1;
  });
}

function maxDrawdown(points) {
  return Math.min(...drawdownSeries(points));
}

function relativeSeries(points, key) {
  const base = points[0][key];
  return points.map((point) => point[key] / base - 1);
}

async function loadPerformanceData() {
  const response = await fetch('data/performance.csv', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load performance data: HTTP ${response.status}`);
  }

  const rows = parseCSV(await response.text());
  if (rows.length < 2) {
    throw new Error('Performance data is empty');
  }

  const headers = rows[0];
  const indexes = {
    date: columnIndex(headers, ['Date', '日期']),
    fund: columnIndex(headers, ['Share Price', 'NAV', 'Unit Price', '单位净值']),
    sp: columnIndex(headers, ['SP500', 'S&P 500', 'SPX']),
    gld: columnIndex(headers, ['GLD'])
  };

  if (Object.values(indexes).some((index) => index === -1)) {
    throw new Error('Performance data is missing a required column');
  }

  const points = rows
    .slice(1)
    .map((row) => ({
      date: parseDate(row[indexes.date]),
      fund: parseNumber(row[indexes.fund]),
      sp: parseNumber(row[indexes.sp]),
      gld: parseNumber(row[indexes.gld])
    }))
    .filter(
      (point) =>
        point.date &&
        Number.isFinite(point.fund) &&
        Number.isFinite(point.sp) &&
        Number.isFinite(point.gld)
    )
    .sort((left, right) => left.date.getTime() - right.date.getTime());

  if (points.length < 2) {
    throw new Error('Performance data does not contain enough valid rows');
  }

  return points;
}

function populatePerformanceFields(points) {
  const latest = points.at(-1);
  const fundSince = latest.fund / points[0].fund - 1;
  const spSince = latest.sp / points[0].sp - 1;
  const gldSince = latest.gld / points[0].gld - 1;

  fillFields('data-perf-nav', formatNav(latest.fund));
  fillFields('data-perf-since', formatPct(fundSince));
  fillFields('data-perf-sp', formatPct(spSince));
  fillFields('data-perf-gld', formatPct(gldSince));
  fillFields('data-perf-ytd', formatPct(returnYearToDate(points)));
  fillFields('data-perf-quarter', formatPct(returnOverDays(points, 90)));
  fillFields('data-perf-mdd', formatPct(maxDrawdown(points)));
  fillFields('data-perf-date', formatDate(latest.date));
  fillFields('data-perf-status', `${points.length} 条记录 · 更新于 ${formatDate(latest.date)}`);
}

function configureCharts() {
  if (typeof Chart === 'undefined') {
    return false;
  }

  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = COLORS.muted;
  Chart.defaults.animation = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 450 };
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;
  return true;
}

function replaceChart(key, canvas, config) {
  if (!canvas || typeof Chart === 'undefined') {
    return null;
  }

  if (chartRegistry.has(key)) {
    chartRegistry.get(key).destroy();
  }

  const chart = new Chart(canvas, config);
  chartRegistry.set(key, chart);
  return chart;
}

function baseScales(yFormatter) {
  return {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: {
        color: COLORS.muted,
        maxRotation: 0,
        maxTicksLimit: window.innerWidth < 620 ? 5 : 8,
        font: { size: 10 }
      }
    },
    y: {
      border: { display: false },
      grid: { color: COLORS.line, drawTicks: false },
      ticks: {
        color: COLORS.muted,
        padding: 10,
        callback: yFormatter,
        font: { size: 10 }
      }
    }
  };
}

function renderHomeNavChart(points) {
  const canvas = query('#homeNavChart');
  if (!canvas) {
    return;
  }

  replaceChart('home-nav', canvas, {
    type: 'line',
    data: {
      labels: points.map((point) => formatDateShort(point.date)),
      datasets: [
        {
          label: 'Oval Fund NAV',
          data: points.map((point) => point.fund),
          borderColor: COLORS.green,
          backgroundColor: COLORS.greenFill,
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: COLORS.green,
          tension: 0.2
        }
      ]
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            label(context) {
              return `单位净值 ${formatNav(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { display: false }
        },
        y: {
          border: { display: false },
          grid: { color: COLORS.line, drawTicks: false },
          ticks: { display: false }
        }
      }
    }
  });
}

function returnDatasets(points) {
  return [
    {
      label: 'Oval Fund',
      data: relativeSeries(points, 'fund').map((value) => value * 100),
      borderColor: COLORS.green,
      backgroundColor: 'transparent',
      borderWidth: 2.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.18
    },
    {
      label: 'S&P 500',
      data: relativeSeries(points, 'sp').map((value) => value * 100),
      borderColor: COLORS.blue,
      backgroundColor: 'transparent',
      borderWidth: 1.8,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.18
    },
    {
      label: 'GLD',
      data: relativeSeries(points, 'gld').map((value) => value * 100),
      borderColor: COLORS.gold,
      backgroundColor: 'transparent',
      borderWidth: 1.8,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.18
    }
  ];
}

function returnChartConfig(points, showLegend) {
  return {
    type: 'line',
    data: {
      labels: points.map((point) => formatDateShort(point.date)),
      datasets: returnDatasets(points)
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          align: 'start',
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: 28,
            boxHeight: 2,
            padding: 18,
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              const sign = context.parsed.y > 0 ? '+' : '';
              return `${context.dataset.label} ${sign}${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: baseScales((value) => `${Number(value).toFixed(0)}%`)
    }
  };
}

function renderHomeReturnChart(points) {
  const canvas = query('#homeReturnChart');
  if (canvas) {
    replaceChart('home-return', canvas, returnChartConfig(points, true));
  }
}

function pointsForRange(points, range) {
  if (range === 'all') {
    return points;
  }

  const days = Number(range);
  const cutoff = points.at(-1).date.getTime() - days * DAY_MS;
  let startIndex = 0;

  points.forEach((point, index) => {
    if (point.date.getTime() <= cutoff) {
      startIndex = index;
    }
  });

  return points.slice(startIndex);
}

function renderPerformanceReturnChart(points, range = 'all') {
  const canvas = query('#performanceReturnChart');
  const visiblePoints = pointsForRange(points, range);

  const latest = visiblePoints.at(-1);
  const first = visiblePoints[0];
  fillFields('data-range-fund', formatPct(latest.fund / first.fund - 1));
  fillFields('data-range-sp', formatPct(latest.sp / first.sp - 1));
  fillFields('data-range-gld', formatPct(latest.gld / first.gld - 1));

  if (canvas) {
    replaceChart('performance-return', canvas, returnChartConfig(visiblePoints, false));
  }
}

function renderDrawdownChart(points) {
  const canvas = query('#performanceDrawdownChart');
  if (!canvas) {
    return;
  }

  replaceChart('performance-drawdown', canvas, {
    type: 'line',
    data: {
      labels: points.map((point) => formatDateShort(point.date)),
      datasets: [
        {
          label: 'Drawdown',
          data: drawdownSeries(points).map((value) => value * 100),
          borderColor: COLORS.red,
          backgroundColor: COLORS.redFill,
          fill: true,
          borderWidth: 1.8,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.14
        }
      ]
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            label(context) {
              return `回撤 ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: baseScales((value) => `${Number(value).toFixed(0)}%`)
    }
  });
}

function renderRecentTable(points) {
  const body = query('#recentPerformanceRows');
  if (!body) {
    return;
  }

  const rows = points.slice(-8).reverse();
  const firstFund = points[0].fund;

  body.innerHTML = rows
    .map((point) => {
      const originalIndex = points.indexOf(point);
      const previous = originalIndex > 0 ? points[originalIndex - 1] : null;
      const change = previous ? point.fund / previous.fund - 1 : Number.NaN;
      const cumulative = point.fund / firstFund - 1;
      const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : '';
      const cumulativeClass = cumulative > 0 ? 'positive' : cumulative < 0 ? 'negative' : '';

      return `
        <tr>
          <td>${formatDate(point.date)}</td>
          <td>${formatNav(point.fund)}</td>
          <td class="${changeClass}">${formatPct(change)}</td>
          <td class="${cumulativeClass}">${formatPct(cumulative)}</td>
          <td>${point.sp.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
          <td>${point.gld.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    })
    .join('');
}

function setupRangeControl(points) {
  const buttons = queryAll('[data-range]');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => item.classList.toggle('active', item === button));
      renderPerformanceReturnChart(points, button.dataset.range);
    });
  });
}

async function initializePerformance() {
  const needsData = query('[data-perf-nav]') || query('#recentPerformanceRows');
  if (!needsData) {
    return;
  }

  try {
    const points = await loadPerformanceData();
    populatePerformanceFields(points);

    if (!configureCharts()) {
      fillFields('data-perf-status', '数据已加载 · 图表组件暂时不可用');
      renderRecentTable(points);
      return;
    }

    if (document.body.dataset.page === 'home') {
      renderHomeNavChart(points);
      renderHomeReturnChart(points);
    }

    if (document.body.dataset.page === 'performance') {
      renderPerformanceReturnChart(points);
      renderDrawdownChart(points);
      renderRecentTable(points);
      setupRangeControl(points);
    }
  } catch (error) {
    console.error(error);
    fillFields('data-perf-status', '数据暂时无法读取');
    const tableBody = query('#recentPerformanceRows');
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="6">数据暂时无法读取，请稍后再试。</td></tr>';
    }
  }
}

async function loadJSON(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: HTTP ${response.status}`);
  }
  return response.json();
}

function formatHoldingPrice(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatHoldingDate(value) {
  return value ? value.replaceAll('-', '.') : '—';
}

function formatVolume(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function returnClass(value) {
  if (value > 0) {
    return 'positive';
  }
  if (value < 0) {
    return 'negative';
  }
  return '';
}

function holdingSnapshot(dataset) {
  const bars = dataset.bars;
  const latest = bars.at(-1);
  const previous = bars.at(-2);
  return {
    latest,
    dailyReturn: previous ? latest.close / previous.close - 1 : Number.NaN,
    periodReturn: bars.length > 1 ? latest.close / bars[0].close - 1 : Number.NaN
  };
}

function createHoldingCard(holding, dataset) {
  const snapshot = holdingSnapshot(dataset);
  const card = document.createElement('a');
  card.className = 'holding-card';
  card.href = `holding.html?symbol=${encodeURIComponent(holding.symbol)}`;
  card.style.setProperty('--holding-accent', holding.accent || COLORS.green);
  card.setAttribute('aria-label', `${holding.name} (${holding.symbol}) 日线 K 线`);

  const top = document.createElement('div');
  top.className = 'holding-card-top';

  const ticker = document.createElement('span');
  ticker.className = 'holding-card-ticker';
  ticker.textContent = holding.symbol;

  const category = document.createElement('span');
  category.textContent = `${holding.category} / ${holding.exchange}`;

  const arrow = document.createElement('span');
  arrow.className = 'holding-card-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';

  top.append(ticker, category, arrow);

  const name = document.createElement('h3');
  name.textContent = holding.name;

  const quote = document.createElement('div');
  quote.className = 'holding-card-quote';

  const price = document.createElement('strong');
  price.textContent = formatHoldingPrice(snapshot.latest.close);

  const periodReturn = document.createElement('span');
  periodReturn.className = `holding-card-return ${returnClass(snapshot.periodReturn)}`.trim();
  periodReturn.textContent = formatPct(snapshot.periodReturn);

  quote.append(price, periodReturn);

  const footer = document.createElement('div');
  footer.className = 'holding-card-footer';
  const date = document.createElement('span');
  date.textContent = `收盘于 ${formatHoldingDate(snapshot.latest.time)}`;
  const period = document.createElement('span');
  period.textContent = '近一年';
  footer.append(date, period);

  card.append(top, name, quote, footer);
  return card;
}

async function renderHomeHoldings(holdings) {
  const list = query('[data-holdings-list]');
  if (!list) {
    return;
  }

  const results = await Promise.allSettled(
    holdings.map(async (holding) => ({ holding, dataset: await loadJSON(holding.data) }))
  );
  list.replaceChildren();

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.dataset?.bars?.length > 1) {
      list.append(createHoldingCard(result.value.holding, result.value.dataset));
    }
  });

  if (!list.children.length) {
    const message = document.createElement('p');
    message.className = 'data-loading';
    message.textContent = '持仓数据暂时无法读取';
    list.append(message);
  }
}

function renderHoldingSwitcher(holdings, activeSymbol) {
  const switcher = query('[data-holding-switcher]');
  if (!switcher) {
    return;
  }

  switcher.replaceChildren();
  holdings.forEach((holding) => {
    const link = document.createElement('a');
    link.className = `holding-switch-link${holding.symbol === activeSymbol ? ' active' : ''}`;
    link.href = `holding.html?symbol=${encodeURIComponent(holding.symbol)}`;

    const symbol = document.createElement('strong');
    symbol.textContent = holding.symbol;
    const name = document.createElement('span');
    name.textContent = holding.name;
    const arrow = document.createElement('i');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = holding.symbol === activeSymbol ? '•' : '↗';

    link.append(symbol, name, arrow);
    switcher.append(link);
  });
}

function updateHoldingChartFields(bar) {
  fillFields('data-chart-open', formatHoldingPrice(bar.open));
  fillFields('data-chart-high', formatHoldingPrice(bar.high));
  fillFields('data-chart-low', formatHoldingPrice(bar.low));
  fillFields('data-chart-close', formatHoldingPrice(bar.close));
  fillFields('data-chart-volume', formatVolume(bar.volume));
}

function holdingRangeStart(bars, days) {
  if (days === 'all') {
    return bars[0].time;
  }

  const cutoff = new Date(`${bars.at(-1).time}T00:00:00Z`).getTime() - Number(days) * DAY_MS;
  const match = bars.find((bar) => new Date(`${bar.time}T00:00:00Z`).getTime() >= cutoff);
  return (match || bars[0]).time;
}

function createHoldingChart(bars) {
  const container = query('#holdingChart');
  const status = query('[data-holding-status]');
  if (!container) {
    return;
  }

  if (typeof LightweightCharts === 'undefined') {
    if (status) {
      status.textContent = 'K 线组件暂时无法加载';
    }
    return;
  }

  container.replaceChildren();
  const chart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { type: LightweightCharts.ColorType.Solid, color: '#ffffff' },
      textColor: COLORS.muted,
      fontFamily: getComputedStyle(document.body).fontFamily,
      attributionLogo: false
    },
    grid: {
      vertLines: { color: 'rgba(19, 22, 28, 0.045)' },
      horzLines: { color: 'rgba(19, 22, 28, 0.07)' }
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: 'rgba(36, 87, 214, 0.35)', labelBackgroundColor: COLORS.ink },
      horzLine: { color: 'rgba(36, 87, 214, 0.35)', labelBackgroundColor: COLORS.ink }
    },
    rightPriceScale: {
      borderColor: COLORS.line,
      scaleMargins: { top: 0.08, bottom: 0.25 }
    },
    timeScale: {
      borderColor: COLORS.line,
      rightOffset: 4,
      barSpacing: 7,
      minBarSpacing: 2.5,
      fixLeftEdge: true,
      fixRightEdge: true
    },
    handleScale: {
      axisPressedMouseMove: true,
      mouseWheel: true,
      pinch: true
    },
    handleScroll: {
      horzTouchDrag: true,
      mouseWheel: true,
      pressedMouseMove: true
    }
  });

  const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: COLORS.green,
    downColor: COLORS.red,
    borderVisible: false,
    wickUpColor: COLORS.green,
    wickDownColor: COLORS.red,
    priceLineVisible: false
  });

  const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    priceLineVisible: false,
    lastValueVisible: false
  });

  chart.priceScale('volume').applyOptions({
    borderVisible: false,
    scaleMargins: { top: 0.78, bottom: 0 }
  });

  candleSeries.setData(
    bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))
  );
  volumeSeries.setData(
    bars.map(({ time, volume, open, close }) => ({
      time,
      value: volume,
      color: close >= open ? 'rgba(36, 87, 214, 0.34)' : 'rgba(194, 73, 77, 0.30)'
    }))
  );

  const barsByTime = new Map(bars.map((bar) => [bar.time, bar]));
  const showLatest = () => updateHoldingChartFields(bars.at(-1));
  showLatest();

  chart.subscribeCrosshairMove((parameter) => {
    if (!parameter.time) {
      showLatest();
      return;
    }

    const key = typeof parameter.time === 'string'
      ? parameter.time
      : `${parameter.time.year}-${String(parameter.time.month).padStart(2, '0')}-${String(parameter.time.day).padStart(2, '0')}`;
    const bar = barsByTime.get(key);
    if (bar) {
      updateHoldingChartFields(bar);
    }
  });

  let activeRange = 'all';
  const setRange = (range) => {
    activeRange = range;
    if (range === 'all') {
      chart.timeScale().fitContent();
      return;
    }
    chart.timeScale().setVisibleRange({
      from: holdingRangeStart(bars, range),
      to: bars.at(-1).time
    });
  };

  const rangeButtons = queryAll('[data-holding-range]');
  rangeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      rangeButtons.forEach((item) => item.classList.toggle('active', item === button));
      setRange(button.dataset.holdingRange);
    });
  });

  chart.timeScale().fitContent();

  const resizeObserver = new ResizeObserver(() => {
    chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    setRange(activeRange);
  });
  resizeObserver.observe(container);
}

function renderHoldingError(message) {
  const main = query('#main-content');
  if (!main) {
    return;
  }
  main.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'section';
  const content = document.createElement('div');
  content.className = 'container holding-error';
  const title = document.createElement('h1');
  title.textContent = '无法打开这个标的';
  const detail = document.createElement('p');
  detail.textContent = message;
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = 'index.html#holdings';
  link.textContent = '返回主要持仓';
  content.append(title, detail, link);
  section.append(content);
  main.append(section);
}

async function renderHoldingDetail(holdings) {
  if (document.body.dataset.page !== 'holding') {
    return;
  }

  const requested = new URLSearchParams(window.location.search).get('symbol');
  const symbol = (requested || holdings[0]?.symbol || '').toUpperCase();
  const holding = holdings.find((item) => item.symbol === symbol);
  if (!holding) {
    renderHoldingError('该标的不在当前主要持仓清单中。');
    return;
  }

  renderHoldingSwitcher(holdings, symbol);
  const dataset = await loadJSON(holding.data);
  if (!Array.isArray(dataset.bars) || dataset.bars.length < 2) {
    throw new Error(`${symbol}: insufficient OHLC data`);
  }

  const snapshot = holdingSnapshot(dataset);
  const changeAmount = snapshot.latest.close - dataset.bars.at(-2).close;
  const changeText = `${changeAmount > 0 ? '+' : ''}${changeAmount.toFixed(2)} (${formatPct(snapshot.dailyReturn)})`;

  document.title = `${holding.shortName} (${holding.symbol}) K线 | Oval Fund`;
  fillFields('data-holding-symbol', holding.symbol);
  fillFields('data-holding-name', holding.name);
  fillFields('data-holding-category', holding.category);
  fillFields('data-holding-exchange', holding.exchange);
  fillFields('data-holding-close', formatHoldingPrice(snapshot.latest.close));
  fillFields('data-holding-change', changeText);
  fillFields('data-holding-date', formatHoldingDate(snapshot.latest.time));

  queryAll('[data-holding-change]').forEach((element) => {
    element.className = `quote-change ${returnClass(snapshot.dailyReturn)}`.trim();
  });

  const source = query('[data-holding-source]');
  if (source) {
    source.href = dataset.sourceUrl || holding.sourceUrl;
  }

  const chart = query('#holdingChart');
  if (chart) {
    chart.setAttribute('aria-label', `${holding.name} (${holding.symbol}) 日线 K 线与成交量`);
  }
  createHoldingChart(dataset.bars);
}

async function initializeHoldings() {
  const needsHoldings = query('[data-holdings-list]') || document.body.dataset.page === 'holding';
  if (!needsHoldings) {
    return;
  }

  try {
    const config = await loadJSON('data/holdings.json');
    const holdings = Array.isArray(config.holdings) ? config.holdings : [];
    if (!holdings.length) {
      throw new Error('Holdings configuration is empty');
    }
    await Promise.all([renderHomeHoldings(holdings), renderHoldingDetail(holdings)]);
  } catch (error) {
    console.error(error);
    if (document.body.dataset.page === 'holding') {
      renderHoldingError('持仓行情数据暂时无法读取，请稍后再试。');
    }
    const list = query('[data-holdings-list]');
    if (list) {
      list.innerHTML = '<p class="data-loading">持仓数据暂时无法读取</p>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setYear();
  setupNavigation();
  setupActiveNavigation();
  setupReveal();
  initializePerformance();
  initializeHoldings();
});
