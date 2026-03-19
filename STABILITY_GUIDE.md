# Framework Stability & Troubleshooting Guide

This document outlines the advanced technical challenges encountered while automating the Gokwik CRM Admin Panel and the robust solutions implemented to ensure a 100% stable test suite.

## 1. Handling "Target Closed" Errors
**Challenge:** The QA sandbox environment occasionally experiences high latency or frozen loading states. Standard Playwright `waitFor` actions would hit the global timeout, causing the runner to kill the browser and throw a cryptic `Target Closed` error.

**Solution:** 
- **Existence Guards**: Implemented `if (await row.count() === 0)` checks before any pointer interactions. This ensures the framework fails with a descriptive business error ("Product not found") instead of a low-level browser crash.
- **Dynamic Syncing**: Replaced static `waitForTimeout` calls with `waitForLoadState('networkidle')` and `waitForResponse` interceptions. This allows the framework to proceed as fast as the backend responds while still being resilient to delays.

## 2. React State & Hydration Protection
**Challenge:** As a modern React SPA, the dashboard often performs re-renders during hydration or when API data returns. Standard Playwright `.fill()` actions can be wiped if a re-render occurs mid-type.

**Solution:**
- **`robustFill` Utility**: Designed a custom injector in `BasePage.ts` that directly modifies the `HTMLInputElement.prototype.value` and dispatches synthetic `input` and `change` events. This guarantees the React state is updated atomically, bypassing the risk of character loss during re-renders.

## 3. Intercepting Floating Overlays
**Challenge:** The dashboard features a persistent AI chat widget and transparent loading spinners that often reside in a higher z-index, intercepting standard Playwright clicks even with `{ force: true }`.

**Solution:**
- **Native DOM Execution**: Utilized `page.evaluate(() => element.click())` for critical actions like "Save" and "More Actions". By executing the click directly in the browser's main thread rather than simulating a pointer event, we bypass intercepting visual layers entirely.

## 4. Single-Session Serial Execution
**Challenge:** The Products module heavily mutates state (CRUD). Running tests in parallel or re-logging for every test caused session conflicts and authentication rate-limiting.

**Solution:**
- **Worker Isolation**: Configured `workers: 1` and `mode: 'serial'` in `playwright.config.ts`.
- **Session Reuse**: Used `test.beforeAll` to log in once per suite and reuse the `sharedPage` context, reducing total execution time by ~60% and ensuring data integrity across the Create -> Update -> Delete flow.
