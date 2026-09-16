# Playwright_Project
# 🎭 Playwright Test Automation Framework

A modern, scalable end-to-end test automation framework for web applications, built with **Playwright** and **TypeScript**. Designed around current best practices — resilient locators, fixture-based architecture, parallel/sharded execution, and rich reporting — so tests stay fast, stable, and easy to maintain as the app grows.

---

## ✨ Key Features

- **TypeScript-first** — full type safety across pages, fixtures, and test data
- **Page Object Model (POM) + Fixtures** — no fragile inheritance chains; composition via Playwright's fixture system
- **Auto-waiting, web-first assertions** — no manual `sleep`/`wait` calls
- **Resilient locators** — `getByRole`, `getByTestId`, `getByLabel` over brittle CSS/XPath selectors
- **Parallel execution + sharding** — fast feedback locally and in CI
- **Storage state reuse** — log in once, reuse the session across tests (auth setup project)
- **API + UI hybrid testing** — seed/verify state via API calls, test flows via UI
- **Visual regression testing** — `toHaveScreenshot()` with per-browser baselines
- **Network interception & mocking** — `page.route()` for stubbing/mocking third-party calls
- **Component testing ready** — optional Playwright Component Testing setup
- **Accessibility checks** — integrated `@axe-core/playwright` scans
- **Multi-environment config** — `.env`-driven configuration (dev/staging/prod)
- **Rich reporting** — HTML report, trace viewer, and optional Allure integration
- **CI/CD ready** — GitHub Actions workflow with sharded matrix runs
- **Linting & formatting** — ESLint + Prettier + Husky pre-commit hooks
- **Tagging & test filtering** — `@smoke`, `@regression`, `@api` annotations for selective runs

---

## 📁 Project Structure

```
playwright-framework/
├── .github/
│   └── workflows/
│       └── playwright.yml          # CI pipeline (sharded matrix run)
├── tests/
│   ├── e2e/
│   │   ├── auth/
│   │   │   └── login.spec.ts
│   │   ├── checkout/
│   │   │   └── checkout.spec.ts
│   │   └── dashboard/
│   │       └── dashboard.spec.ts
│   ├── api/
│   │   └── users.api.spec.ts
│   └── visual/
│       └── homepage.visual.spec.ts
├── pages/
│   ├── base.page.ts                # Shared page behavior
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   └── checkout.page.ts
├── fixtures/
│   ├── base.fixtures.ts            # Extends test with POM instances
│   └── auth.fixtures.ts            # Authenticated session fixture
├── utils/
│   ├── api-client.ts
│   ├── test-data-factory.ts
│   └── env-config.ts
├── playwright/
│   └── .auth/                      # Stored auth states (gitignored)
├── test-results/                   # Traces, screenshots, videos (gitignored)
├── playwright-report/              # HTML report output (gitignored)
├── .env.example
├── playwright.config.ts
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm, yarn, or pnpm

### Installation

```bash
git clone <your-repo-url>
cd playwright-framework
npm install
npx playwright install --with-deps
```

### Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

```env
BASE_URL=https://staging.yourapp.com
API_URL=https://api.staging.yourapp.com
TEST_USER_EMAIL=test.user@example.com
TEST_USER_PASSWORD=changeme
```

---

## 🧪 Running Tests

```bash
# Run all tests (headless, all configured browsers)
npx playwright test

# Run in headed mode (see the browser)
npx playwright test --headed

# Run a single file
npx playwright test tests/e2e/auth/login.spec.ts

# Run tests by tag
npx playwright test --grep @smoke

# Run on a specific browser project
npx playwright test --project=chromium

# Run in parallel with a set number of workers
npx playwright test --workers=4

# Run in UI mode (interactive, best for debugging)
npx playwright test --ui

# Update visual regression baselines
npx playwright test --update-snapshots

# Open the last HTML report
npx playwright show-report
```

---

## ⚙️ Configuration Highlights (`playwright.config.ts`)

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } },
  ],
});
```

**Why these choices:**
- `trace: 'on-first-retry'` — full trace only when a test actually flakes/fails, keeping CI fast and cheap
- `storageState` + a `setup` project — authenticate once, reuse the session everywhere (no repeated logins)
- `fullyParallel: true` — every test file runs independently for max speed
- `retries` gated on `CI` — no silent flake-masking locally

---

## 🧱 Architecture Patterns

### 1. Fixtures over inheritance
Instead of a deep `BasePage` class hierarchy, page objects are injected via custom fixtures:

```ts
// fixtures/base.fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
});

export { expect } from '@playwright/test';
```

```ts
// tests/e2e/dashboard/dashboard.spec.ts
import { test, expect } from '../../../fixtures/base.fixtures';

test('user sees their name on the dashboard', async ({ dashboardPage }) => {
  await dashboardPage.goto();
  await expect(dashboardPage.welcomeBanner).toContainText('Welcome');
});
```

### 2. Locator strategy (priority order)
1. `getByRole()` — mirrors how users/assistive tech perceive the page
2. `getByLabel()` / `getByPlaceholder()` — form fields
3. `getByTestId()` — stable hooks (`data-testid`) for elements with no accessible role/text
4. CSS/XPath — last resort only

### 3. API-assisted setup
Use the API to create test preconditions instead of clicking through the UI every time:

```ts
test('checkout with pre-seeded cart', async ({ page, request }) => {
  await request.post('/api/cart', { data: { items: [{ sku: 'ABC123', qty: 1 }] } });
  await page.goto('/checkout');
  // ...assert checkout flow
});
```

---

## 🏷️ Test Tagging

```ts
test('user can log in @smoke @auth', async ({ page }) => { /* ... */ });
```

```bash
npx playwright test --grep @smoke        # fast subset for PR checks
npx playwright test --grep-invert @flaky # skip known-flaky tests
```

---

## 🔁 CI/CD (GitHub Actions example)

```yaml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ strategy.job-index }}
          path: playwright-report/
          retention-days: 14
```

Sharding splits the suite across parallel jobs so a full run finishes in a fraction of the time.

---

## 🐞 Debugging

```bash
npx playwright test --debug              # step through with the Playwright Inspector
npx playwright codegen <url>             # record actions and generate locators
npx playwright show-trace trace.zip      # inspect a trace file (DOM snapshots, network, console)
```

---

## ✅ Best Practices Followed in This Repo

- Prefer **web-first assertions** (`await expect(locator).toBeVisible()`) over manual checks — they auto-retry until timeout
- Never hardcode waits (`page.waitForTimeout()`) — rely on auto-waiting and explicit condition-based waits
- Keep tests **independent and idempotent** — no test should depend on another's execution order
- One logical assertion focus per test — smaller, targeted tests are easier to debug on failure
- Test data generated via factories (`utils/test-data-factory.ts`), not hardcoded magic strings
- Secrets and environment values via `.env`, never committed to source control

---

## 📦 Scripts (`package.json`)

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:smoke": "playwright test --grep @smoke",
    "test:headed": "playwright test --headed",
    "report": "playwright show-report",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write ."
  }
}
```

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Follow the existing POM + fixture patterns for new tests
3. Run `npm run lint` and `npm test` before opening a PR
4. Tag new tests appropriately (`@smoke`, `@regression`, etc.)

---

## 📄 License

MIT — see `LICENSE` for details.
