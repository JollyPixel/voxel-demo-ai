import { chromium } from '../../editor/node_modules/@playwright/test/index.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto(`http://localhost:5173/${process.argv[2] ?? ''}`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#loading', { state: 'detached', timeout: 120000 });
await page.waitForTimeout(1000);
if (process.argv.includes('--clean')) {
  await page.keyboard.press('F3');
  await page.locator('jolly-controls').evaluate(element => { element.style.display = 'none'; });
  await page.locator('jolly-stats').evaluate(element => { element.style.display = 'none'; }).catch(() => {});
}
await page.screenshot({ path: `demo-${(process.argv[2] ?? 'overview').replace(/[^a-z0-9]/gi, '-')}.png` });
console.log({ title: await page.title(), loading: await page.locator('#loading').count(), panes: await page.locator('jolly-pane').count(), errors });
await browser.close();
if (errors.length) process.exitCode = 1;

