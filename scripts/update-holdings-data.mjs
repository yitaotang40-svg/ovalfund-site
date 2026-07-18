import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(projectRoot, 'data', 'holdings.json');
const outputDirectory = path.join(projectRoot, 'data', 'holdings');

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parsePrice(value) {
  return Number(String(value).replace(/[$,]/g, ''));
}

function parseNasdaqDate(value) {
  const [month, day, year] = value.split('/').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function fetchBars(holding, fromDate, toDate) {
  const params = new URLSearchParams({
    assetclass: holding.assetClass,
    fromdate: fromDate,
    todate: toDate,
    limit: '5000'
  });
  const url = `https://api.nasdaq.com/api/quote/${holding.symbol}/historical?${params}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://www.nasdaq.com',
      Referer: 'https://www.nasdaq.com/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/137 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`${holding.symbol}: Nasdaq returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  const rows = payload?.data?.tradesTable?.rows;
  if (!Array.isArray(rows) || !rows.length) {
    const message = payload?.status?.bCodeMessage?.map((item) => item.errorMessage).join('; ');
    throw new Error(`${holding.symbol}: ${message || 'no historical rows returned'}`);
  }

  return rows
    .map((row) => ({
      time: parseNasdaqDate(row.date),
      open: parsePrice(row.open),
      high: parsePrice(row.high),
      low: parsePrice(row.low),
      close: parsePrice(row.close),
      volume: parsePrice(row.volume)
    }))
    .filter((bar) =>
      bar.time &&
      Number.isFinite(bar.open) &&
      Number.isFinite(bar.high) &&
      Number.isFinite(bar.low) &&
      Number.isFinite(bar.close) &&
      Number.isFinite(bar.volume)
    )
    .sort((left, right) => left.time.localeCompare(right.time));
}

const config = JSON.parse(await readFile(configPath, 'utf8'));
const toDate = new Date();
const fromDate = new Date(toDate);
fromDate.setUTCFullYear(fromDate.getUTCFullYear() - 1);
fromDate.setUTCDate(fromDate.getUTCDate() - 7);

await mkdir(outputDirectory, { recursive: true });

for (const holding of config.holdings) {
  const bars = await fetchBars(holding, formatDate(fromDate), formatDate(toDate));
  const output = {
    symbol: holding.symbol,
    source: 'Nasdaq',
    sourceUrl: holding.sourceUrl,
    updatedAt: bars.at(-1).time,
    bars
  };
  const outputPath = path.join(outputDirectory, `${holding.symbol.toLowerCase()}.json`);
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`${holding.symbol}: ${bars.length} bars through ${output.updatedAt}`);
}
