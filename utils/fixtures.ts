import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProductsPage } from '../pages/ProductsPage';

type AppFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  productsPage: ProductsPage;
};

export const test = base.extend<AppFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
});

export { expect } from '@playwright/test';
