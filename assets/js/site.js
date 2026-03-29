function q(selector, scope = document) {
  return scope.querySelector(selector);
}

function qa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function setYear() {
  qa('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
}

function setupActiveNav() {
  const links = qa('.nav-links a[href^="#"]');
  if (!links.length || document.body.classList.contains('performance-page')) {
    return;
  }

  const sections = links
    .map((link) => ({ link, id: link.getAttribute('href').slice(1) }))
    .map((item) => ({ ...item, section: document.getElementById(item.id) }))
    .filter((item) => item.section);

  if (!sections.length) {
    return;
  }

  const activate = (currentId) => {
    links.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
    });
  };

  const onScroll = () => {
    const top = window.scrollY + 120;
    let current = sections[0].id;

    sections.forEach((item) => {
      if (item.section.offsetTop <= top) {
        current = item.id;
      }
    });

    activate(current);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function setupRevealAnimations() {
  const items = qa('[data-reveal]');
  if (!items.length) {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
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
    {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px'
    }
  );

  items.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 40, 180)}ms`;
    observer.observe(item);
  });
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((line) => line.some((value) => String(value).trim() !== ''));
}

function normalizeHeader(header) {
  return String(header || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findCol(headers, candidates) {
  const normalizedHeaders = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalizedHeaders.indexOf(normalizeHeader(candidate));
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

function parseNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return Number.NaN;
  }

  const cleaned = raw.replace(/[%$,]/g, '').replace(/\s+/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseDateValue(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map((part) => parseInt(part, 10));
    return new Date(Date.UTC(year, month - 1, day));
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [month, day, year] = raw.split('/').map((part) => parseInt(part, 10));
    return new Date(Date.UTC(year, month - 1, day));
  }

  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatISODate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateCN(date) {
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

function formatPct(decimal, digits = 2) {
  if (!Number.isFinite(decimal)) {
    return '—';
  }

  const sign = decimal > 0 ? '+' : '';
  return `${sign}${(decimal * 100).toFixed(digits)}%`;
}

function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `$${value.toFixed(2)}`;
}

function computeMaxDrawdown(indexSeries) {
  let peak = -Infinity;
  let maxDrawdown = 0;

  indexSeries.forEach((value) => {
    if (!Number.isFinite(value)) {
      return;
    }

    if (value > peak) {
      peak = value;
    }

    if (peak > 0) {
      const drawdown = value / peak - 1;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  });

  return maxDrawdown;
}

function returnOverDays(dates, indexSeries, days) {
  const lastIndex = dates.length - 1;
  const targetTime = dates[lastIndex].getTime() - days * 86400000;
  let anchor = 0;

  for (let index = lastIndex; index >= 0; index -= 1) {
    if (dates[index].getTime() <= targetTime) {
      anchor = index;
      break;
    }
  }

  const start = indexSeries[anchor];
  const end = indexSeries[lastIndex];
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) {
    return Number.NaN;
  }

  return end / start - 1;
}

function fillField(attribute, value) {
  qa(`[${attribute}]`).forEach((node) => {
    node.textContent = value;
  });
}

function renderPreviewChart(labels, fundRet, spRet, brkRet) {
  const canvas = q('#perfMini');
  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  if (window.__ovalPreviewChart) {
    window.__ovalPreviewChart.destroy();
  }

  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue('--accent').trim() || '#133a66';
  const accentTwo = styles.getPropertyValue('--accent-2').trim() || '#c28f43';
  const accentThree = styles.getPropertyValue('--accent-3').trim() || '#7b9ab8';

  window.__ovalPreviewChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Fund',
          data: fundRet,
          borderColor: accent,
          backgroundColor: 'transparent',
          borderWidth: 2.4,
          pointRadius: 0,
          tension: 0.28
        },
        {
          label: 'S&P 500',
          data: spRet,
          borderColor: accentThree,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.28
        },
        {
          label: 'BRK',
          data: brkRet,
          borderColor: accentTwo,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.28
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 14,
            color: '#3b4756'
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 5,
            color: '#66707d'
          },
          grid: {
            display: false
          }
        },
        y: {
          ticks: {
            color: '#66707d',
            callback(value) {
              return `${Number(value).toFixed(0)}%`;
            }
          },
          grid: {
            color: 'rgba(16, 24, 32, 0.08)'
          }
        }
      }
    }
  });
}

async function loadHomePerformance() {
  const needsPerformance =
    q('#perfMini') ||
    qa('[data-perf-since]').length ||
    qa('[data-perf-nav]').length ||
    qa('[data-perf-mdd]').length ||
    qa('[data-perf-date]').length ||
    qa('[data-perf-date-long]').length ||
    qa('[data-perf-quarter]').length ||
    qa('[data-perf-benchmark]').length ||
    qa('[data-perf-status]').length;

  if (!needsPerformance) {
    return;
  }

  fillField('data-perf-status', '正在加载业绩数据...');

  try {
    const response = await fetch('data/performance.csv', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rows = parseCSV(await response.text());
    if (rows.length < 2) {
      throw new Error('CSV is empty');
    }

    const headers = rows[0];
    const idxDate = findCol(headers, ['Date', '日期']);
    const idxSharePrice = findCol(headers, ['Share Price', 'SharePrice', 'NAV', 'Unit Price', '单位净值']);
    const idxSP = findCol(headers, ['SP500', 'S&P 500', 'SP 500', 'SPX']);
    const idxBRK = findCol(headers, ['BRK', 'BRK.B', 'BRK B']);

    if ([idxDate, idxSharePrice, idxSP, idxBRK].some((index) => index === -1)) {
      throw new Error('Missing required columns');
    }

    const dates = [];
    const fundPrice = [];
    const sp = [];
    const brk = [];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const date = parseDateValue(row[idxDate]);
      const fund = parseNumber(row[idxSharePrice]);
      const spValue = parseNumber(row[idxSP]);
      const brkValue = parseNumber(row[idxBRK]);

      if (!date || !Number.isFinite(fund) || !Number.isFinite(spValue) || !Number.isFinite(brkValue)) {
        continue;
      }

      dates.push(date);
      fundPrice.push(fund);
      sp.push(spValue);
      brk.push(brkValue);
    }

    if (dates.length < 2) {
      throw new Error('Not enough usable rows');
    }

    const order = dates
      .map((date, index) => ({ time: date.getTime(), index }))
      .sort((left, right) => left.time - right.time)
      .map((item) => item.index);

    const orderedDates = order.map((index) => dates[index]);
    const orderedFund = order.map((index) => fundPrice[index]);
    const orderedSp = order.map((index) => sp[index]);
    const orderedBrk = order.map((index) => brk[index]);

    const baseFund = orderedFund[0];
    const baseSp = orderedSp[0];
    const baseBrk = orderedBrk[0];
    const fundIndex = orderedFund.map((value) => (value / baseFund) * 100);
    const spIndex = orderedSp.map((value) => (value / baseSp) * 100);
    const brkIndex = orderedBrk.map((value) => (value / baseBrk) * 100);

    const sinceStart = fundIndex.at(-1) / 100 - 1;
    const quarter = returnOverDays(orderedDates, fundIndex, 90);
    const maxDrawdown = computeMaxDrawdown(fundIndex);
    const latestDate = orderedDates.at(-1);
    const spSinceStart = spIndex.at(-1) / 100 - 1;
    const brkSinceStart = brkIndex.at(-1) / 100 - 1;

    fillField('data-perf-since', formatPct(sinceStart));
    fillField('data-perf-quarter', formatPct(quarter));
    fillField('data-perf-nav', formatMoney(orderedFund.at(-1)));
    fillField('data-perf-mdd', formatPct(maxDrawdown));
    fillField('data-perf-date', formatISODate(latestDate));
    fillField('data-perf-date-long', formatDateCN(latestDate));
    fillField(
      'data-perf-benchmark',
      `Since inception comparison: Fund ${formatPct(sinceStart)} · S&P 500 ${formatPct(spSinceStart)} · BRK ${formatPct(brkSinceStart)}`
    );
    fillField('data-perf-status', `已加载 ${orderedDates.length} 条记录，最新日期 ${formatISODate(latestDate)}`);

    const labels = orderedDates.map((date) => formatISODate(date));
    const fundRet = fundIndex.map((value) => value - 100);
    const spRet = spIndex.map((value) => value - 100);
    const brkRet = brkIndex.map((value) => value - 100);
    renderPreviewChart(labels, fundRet, spRet, brkRet);
  } catch (error) {
    console.error(error);
    fillField('data-perf-status', '业绩数据暂时不可用');
  }
}

window.OvalSite = {
  parseCSV,
  findCol,
  parseNumber,
  parseDateValue,
  formatISODate,
  formatDateCN,
  formatPct,
  formatMoney,
  computeMaxDrawdown,
  returnOverDays
};

document.addEventListener('DOMContentLoaded', () => {
  setYear();
  setupActiveNav();
  setupRevealAnimations();
  loadHomePerformance();
});
