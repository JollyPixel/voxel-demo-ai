import { chromium } from '../../editor/node_modules/@playwright/test/index.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const scenarios = [
  ['greedy-on', '?greedy=1&shadows=1&copies=1'],
  ['greedy-off', '?greedy=0&shadows=1&copies=1'],
  ['shadows-off', '?greedy=1&shadows=0&copies=1'],
  ['four-copies', '?greedy=1&shadows=1&copies=4']
];
for (const [name, query] of scenarios) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const start = performance.now();
  await page.goto(`http://localhost:5173/${query}`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('#loading', { state: 'detached', timeout: 180000 });
    await page.waitForFunction(() => window.__tombMetrics?.fps > 0, undefined, { timeout: 60000 });
    await page.waitForTimeout(2500);
    const metrics = await page.evaluate(() => window.__tombMetrics ?? {});
    console.log(JSON.stringify({ name, totalMs: Math.round(performance.now() - start), metrics, errors }));
  } catch (error) {
    console.log(JSON.stringify({ name, error: String(error), errors }));
  }
  await page.close();
}
await browser.close();

