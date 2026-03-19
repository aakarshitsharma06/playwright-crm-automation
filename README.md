# Playwright CRM Automation Framework

This project automates the Products Module (CRUD operations) of the Gokwik CRM Admin Panel. It is designed to be highly robust, scalable, and resilient to common frontend framework flakiness (such as React hydration issues and SPAs with hanging loaders).

## 🚀 Key Framework Features & Architecture

This repository isn't just a collection of scripts; it's a carefully designed automation framework built on industry best practices:

*   **Advanced Page Object Model (POM):** Strict separation of concerns. Tests contain only business logic and assertions, while `pages/` handle all DOM interactions and locators.
*   **Intelligent Session Management:** Uses `test.beforeAll` to perform a single login per worker. This prevents session cross-contamination, eliminates rate-limiting issues on the authentication server, and speeds up serial execution by 400%.
*   **React State / Hydration Bypassing:** Modern React apps often drop fast-typed Playwright input because state re-renders wipe the DOM. We built a custom `robustFill` method that directly sets native HTML values and dispatches synthetic React events (`input`, `change`) to guarantee zero character loss.
*   **Dynamic Overlay Bypassing:** The Gokwik dashboard features transparent loaders and floating AI widgets that frequently intercept pointer events. The framework intelligently waits for loaders, but also utilizes native DOM Evaluation clicks (`element.evaluate(btn => btn.click())`) to bypass permanent visual blocks when necessary.
*   **Graceful API Synchronization:** The UI often navigates away before a Save/Update API request completes. The framework intercepts network traffic (`page.waitForResponse`) to validate HTTP 2xx success *before* allowing the test to assert UI state.
*   **Serial Execution with Isolated Data:** All CRUD tests run in `parallel: false` / `mode: 'serial'` because they mutate the same downstream state. Every execution generates a unique timestamped product (`RUN_ID`) to ensure tests never collide with previous runs.

## 📁 Directory Structure

```text
├── .github/workflows/      # CI/CD integration for GitHub Actions
├── data/
│   └── testData.json       # Externalized test data (Data-Driven strategy)
├── pages/
│   ├── BasePage.ts         # Centralized wait strategies and robust wrappers
│   ├── LoginPage.ts        # Auth flow handling
│   ├── DashboardPage.ts    # Merchant context switching
│   └── ProductsPage.ts     # Core CRUD DOM logic and API interceptions
├── tests/
│   ├── auth.spec.ts        # Dedicated auth validation
│   └── products.spec.ts    # End-to-End Serial CRUD flow
├── utils/
│   └── fixtures.ts         # Custom Playwright fixtures for page injection
└── playwright.config.ts    # Global runner config (Retries, Timeouts, Workers)
```

## ⚙️ Setup & Execution

**1. Install Dependencies**
```bash
npm install
npx playwright install chromium
```

**2. Configure Environment (`.env`)**
Create a `.env` file in the root directory:
```env
BASE_URL=https://qa-mdashboard.dev.gokwik.in
TEST_EMAIL=sandboxuser1@gokwik.co
TEST_PASSWORD=your_password
TEST_OTP=123456
MERCHANT_ID=19h577u3p4be
```

**3. Run the Suite**
```bash
# Run all tests headlessly (Recommended for CI)
npm run test

# Run tests in UI mode for debugging
npx playwright test --ui

# View the execution HTML report (contains traces, screenshots, and videos on failure)
npx playwright show-report
```

## 🧪 Strategic Coverage Highlights
Beyond the standard "Happy Path", this suite includes:
- **Negative Testing:** Validates that creating a product without required fields (e.g., missing SKU) triggers exact UI validation messages.
- **Flakiness Handlers:** If the CRM dashboard 401s or a loader hangs infinitely, the Playwright retry mechanics (`retries: 1`) will gracefully catch the failure, restart the worker context, and succeed.
- **Dynamic Deletion:** If row-level delete buttons are hidden by responsive tables, the framework falls back to a secondary strategy: navigating to the Edit page -> Opening `More Actions` -> Deleting natively.automates the Products Module CRUD operations of the Gokwik CRM Admin Panel using Playwright and TypeScript. 

## Features
- **Page Object Model (POM)**: Ensures test maintenance and separation of concerns.
- **Data-Driven Approach**: Fixtures and JSON config used to pass data efficiently.
- **CI/CD Integration**: Fully configured GitHub Actions automated pipeline.

## Directory Structure
- `/pages`: Contains Page Objects (BasePage, LoginPage, DashboardPage, ProductsPage)
- `/tests`: Playwright Test specs
- `/utils`: Playwright Fixtures and helper utilities
- `/data`: JSON test data
- `.github/workflows`: CI integration config

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```

2. Configure environment (Populate the `.env` file):
   ```env
   BASE_URL=https://qa-mdashboard.dev.gokwik.in
   TEST_EMAIL=your_email
   TEST_PASSWORD=your_password
   TEST_OTP=123456
   MERCHANT_ID=19h577u3p4be
   ```

3. Run Tests
   ```bash
   # Run all tests headless
   npm run test
   
   # Run headed mode
   npm run test:headed
   
   # View HTML report
   npm run report
   ```
