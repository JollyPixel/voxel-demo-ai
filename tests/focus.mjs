import { chromium } from '../../editor/node_modules/@playwright/test/index.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://localhost:5173/?pad=1');
await page.waitForSelector('#loading', { state: 'detached', timeout: 120000 });
console.log('inputs', await page.locator('input[type=checkbox]').count(), 'checkboxes', await page.locator('jolly-checkbox').count(), 'text', await page.locator('jolly-pane').allTextContents());
const checkbox = page.locator('input[type=checkbox]').first();
await checkbox.click();
await page.waitForTimeout(100);
const focused = await page.evaluate(() => document.activeElement?.id);
console.log({ focused, errors });
await browser.close();
if (focused !== 'scene' || errors.length) process.exitCode = 1;

