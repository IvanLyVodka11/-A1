// Capture real screenshots of the running apps for the report.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const API = 'http://localhost:3000/api';
const AUTH = 'http://localhost:5173';
const DEMO = 'http://localhost:5174';
const OUT = '../docs/evidence/raw';
mkdirSync(OUT, { recursive: true });

const email = 'linh.nh237455@sis.hust.edu.vn';
const password = 'Linh@2024';

async function apiLogin() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name, opts = {}) {
  await wait(opts.delay ?? 700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.full ?? false });
  console.log('  shot', name);
}

async function tryClick(page, texts) {
  for (const t of texts) {
    try {
      const el = page.getByText(t, { exact: false }).first();
      if (await el.count()) { await el.click({ timeout: 1500 }); return true; }
    } catch {}
    try {
      const el = page.locator(`button:has-text("${t}")`).first();
      if (await el.count()) { await el.click({ timeout: 1500 }); return true; }
    } catch {}
  }
  return false;
}

const browser = await chromium.launch();

// ─────────────── AUTHENTICATOR APP ───────────────
const { accessToken, refreshToken } = await apiLogin();
console.log('token ok:', !!accessToken);

async function authCtx(theme, viewport) {
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

// login & register (no auth)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${AUTH}/login`, { waitUntil: 'networkidle' });
  await shot(page, 'auth-login');
  await page.goto(`${AUTH}/register`, { waitUntil: 'networkidle' });
  await shot(page, 'auth-register');
  await ctx.close();
}

// dashboard dark
{
  const { ctx, page } = await authCtx('dark', { width: 1280, height: 900 });
  await page.goto(`${AUTH}/`, { waitUntil: 'networkidle' });
  await shot(page, 'auth-dashboard-dark', { delay: 1500 });
  // try opening add-account
  if (await tryClick(page, ['Thêm tài khoản', 'Add account', 'Thêm', 'Add', '+'])) {
    await shot(page, 'auth-add-account', { delay: 900 });
  }
  await ctx.close();
}

// dashboard light + mobile
{
  const { ctx, page } = await authCtx('light', { width: 1280, height: 900 });
  await page.goto(`${AUTH}/`, { waitUntil: 'networkidle' });
  await shot(page, 'auth-dashboard-light', { delay: 1500 });
  await ctx.close();
}
{
  const { ctx, page } = await authCtx('dark', { width: 402, height: 860 });
  await page.goto(`${AUTH}/`, { waitUntil: 'networkidle' });
  await shot(page, 'auth-dashboard-mobile', { delay: 1500, full: true });
  await ctx.close();
}

// settings
{
  const { ctx, page } = await authCtx('dark', { width: 1280, height: 900 });
  await page.goto(`${AUTH}/settings`, { waitUntil: 'networkidle' });
  await shot(page, 'auth-settings', { delay: 1200 });
  // password generator may live in settings — try to reveal
  if (await tryClick(page, ['Tạo mật khẩu', 'Generator', 'Password Generator', 'Sinh mật khẩu'])) {
    await shot(page, 'auth-password-generator', { delay: 900 });
  }
  await ctx.close();
}

// vault
{
  const { ctx, page } = await authCtx('dark', { width: 1280, height: 900 });
  await page.goto(`${AUTH}/vault`, { waitUntil: 'networkidle' });
  await shot(page, 'auth-vault', { delay: 1200 });
  await ctx.close();
}

// ─────────────── DEMO APP ───────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const [route, name] of [['/login','demo-login'],['/register','demo-register'],['/zk-login','demo-zklogin']]) {
    try {
      await page.goto(`${DEMO}${route}`, { waitUntil: 'networkidle' });
      await shot(page, name, { delay: 900 });
    } catch (e) { console.log('  demo route failed', route, e.message); }
  }
  await ctx.close();
}

await browser.close();
console.log('DONE');
