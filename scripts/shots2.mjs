// Capture interactive states missed in the first pass.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const API = 'http://localhost:3000/api';
const AUTH = 'http://localhost:5173';
const DEMO = 'http://localhost:5174';
const OUT = '../docs/evidence/raw';
mkdirSync(OUT, { recursive: true });
const KDBX = path.resolve(OUT, 'sample-vault.kdbx');

const email = 'linh.nh237455@sis.hust.edu.vn';
const password = 'Linh@2024';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiLogin() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}
async function shot(page, name, opts = {}) {
  await wait(opts.delay ?? 600);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.full ?? false });
  console.log('  shot', name);
}

const browser = await chromium.launch();
const { accessToken, refreshToken } = await apiLogin();

async function authPage(theme = 'dark', viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${AUTH}/login`, { waitUntil: 'networkidle' });
  await page.evaluate(([a, r, t]) => {
    localStorage.setItem('accessToken', a);
    localStorage.setItem('refreshToken', r);
    localStorage.setItem('theme', t);
  }, [accessToken, refreshToken, theme]);
  return { ctx, page };
}

// 1) Add-account modal (New button)
try {
  const { ctx, page } = await authPage();
  await page.goto(`${AUTH}/`, { waitUntil: 'networkidle' });
  await wait(1200);
  await page.locator('button:has-text("New")').first().click({ timeout: 3000 });
  await shot(page, 'auth-add-account', { delay: 900 });
  await ctx.close();
} catch (e) { console.log('add-account failed:', e.message); }

// 2) Manage mode
try {
  const { ctx, page } = await authPage();
  await page.goto(`${AUTH}/`, { waitUntil: 'networkidle' });
  await wait(1200);
  await page.locator('button:has-text("Manage")').first().click({ timeout: 3000 });
  await shot(page, 'auth-manage-mode', { delay: 800 });
  await ctx.close();
} catch (e) { console.log('manage failed:', e.message); }

// 3) Password generator tab in vault
try {
  const { ctx, page } = await authPage();
  await page.goto(`${AUTH}/vault`, { waitUntil: 'networkidle' });
  await wait(1000);
  await page.getByText('Password Generator', { exact: false }).first().click({ timeout: 3000 });
  await shot(page, 'auth-password-generator', { delay: 900 });
  await ctx.close();
} catch (e) { console.log('generator failed:', e.message); }

// 4) Vault import with kdbx loaded -> entries listed
try {
  const { ctx, page } = await authPage();
  await page.goto(`${AUTH}/vault`, { waitUntil: 'networkidle' });
  await wait(900);
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(KDBX);
  const pw = page.locator('input[type="password"]').first();
  await pw.fill('Linh@2024');
  await shot(page, 'auth-vault-filled', { delay: 500 });
  await page.locator('button:has-text("Open vault")').first().click({ timeout: 3000 });
  await wait(1800);
  await shot(page, 'auth-vault-entries', { delay: 600, full: true });
  await ctx.close();
} catch (e) { console.log('vault import failed:', e.message); }

// 5) Export tab
try {
  const { ctx, page } = await authPage();
  await page.goto(`${AUTH}/vault`, { waitUntil: 'networkidle' });
  await wait(900);
  await page.getByText('Export', { exact: false }).first().click({ timeout: 3000 });
  await shot(page, 'auth-vault-export', { delay: 800 });
  await ctx.close();
} catch (e) { console.log('export failed:', e.message); }

await browser.close();
console.log('DONE2');
