import { test, expect, Page } from '@playwright/test';
import testData from '../data/testData.json';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProductsPage } from '../pages/ProductsPage';

// Unique name for this test run — shared across the serial CRUD suite
const RUN_ID = Date.now();
const PRODUCT_NAME = `${testData.product.name} ${RUN_ID}`;
const UPDATED_NAME = `${testData.product.updatedName} ${RUN_ID}`;

test.describe('Products Module CRUD Operations', () => {
  // Run sequentially since Create → Read → Update → Delete share state
  test.describe.configure({ mode: 'serial' });

  let sharedPage: Page;
  let productsPage: ProductsPage;

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage();
    const loginPage = new LoginPage(sharedPage);
    const dashboardPage = new DashboardPage(sharedPage);
    productsPage = new ProductsPage(sharedPage);

    // Login once for the entire suite
    await loginPage.navigate();
    await loginPage.login(
      process.env.TEST_EMAIL!,
      process.env.TEST_PASSWORD!,
      process.env.TEST_OTP!
    );
    await dashboardPage.switchMerchant(process.env.MERCHANT_ID!);
  });

  test.afterAll(async () => {
    await sharedPage.close();
  });

  test.beforeEach(async () => {
    // Just navigate to the listing page before each test instead of logging in
    await productsPage.navigateToProducts(process.env.MERCHANT_ID!);
  });

  test('Create Product Successfully @smoke @crud', async () => {
    // Intercept API response for the bonus: API Validation
    const responsePromise = productsPage.page.waitForResponse(
      (response) => response.url().includes('products') && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    await productsPage.createProduct({
      name: PRODUCT_NAME,
      price: testData.product.price,
      sku: `${testData.product.sku}-${RUN_ID}`,  // Unique SKU per run to avoid duplicates
    });

    const response = await responsePromise;
    expect(response.status()).toBeLessThan(400); // 200 or 201

    // Verify product appears in listing
    await productsPage.searchProduct(PRODUCT_NAME);
    const row = await productsPage.getProductRow(PRODUCT_NAME);
    await expect(row).toBeVisible({ timeout: 10000 });
  });

  test('Read / Verify Product @smoke', async () => {
    await productsPage.searchProduct(PRODUCT_NAME);
    const row = await productsPage.getProductRow(PRODUCT_NAME);

    // Validate Name appears in the row
    await expect(row).toContainText(PRODUCT_NAME, { timeout: 10000 });

    // Validate Status (Requirement: Status shows Active)
    await expect(row.locator('.ant-tag:has-text("Active"), .ant-badge:has-text("Active")')).toBeVisible();

    // Validate Variant count (Requirement: Validate variant count)
    await expect(row.locator('td:has-text("variants")')).toBeVisible();
  });

  test('Validate Pagination @bonus', async () => {
    // Navigate to products without search to see multiple items and pagination
    await productsPage.navigateToProducts(process.env.MERCHANT_ID!);
    
    // Check if pagination controls are present (Look for 'Show per page' dropdown or pagination class)
    const pagination = productsPage.page.locator('.ant-pagination, .ant-table-pagination, :text("Show per page")').first();
    await expect(pagination).toBeVisible({ timeout: 15000 });
  });

  test('Update Product @crud', async () => {
    await productsPage.searchProduct(PRODUCT_NAME);
    await productsPage.updateProduct(PRODUCT_NAME, { name: UPDATED_NAME });

    // Validate updated value is reflected in listing
    await productsPage.searchProduct(UPDATED_NAME);
    const updatedRow = await productsPage.getProductRow(UPDATED_NAME);
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
  });

  test('Delete Product @smoke @crud', async () => {
    await productsPage.navigateToProducts(process.env.MERCHANT_ID!);
    await productsPage.searchProduct(UPDATED_NAME);
    await productsPage.deleteProduct(UPDATED_NAME);

    // Validate product no longer appears in listing
    await productsPage.searchProduct(UPDATED_NAME);
    const deletedRow = await productsPage.getProductRow(UPDATED_NAME);
    await expect(deletedRow).toHaveCount(0);
  });

  test('Negative Scenario: Create product with missing required fields', async () => {
    await productsPage.createProductBtn.click();
    await productsPage.productNameInput.waitFor({ state: 'visible' });

    // Do NOT fill name — attempt to save
    await productsPage.createBtn.click();

    // Validation error should be visible
    const validationError = productsPage.page.locator(
      '.ant-form-item-explain-error, [class*="error-message"], :text("This field is required")'
    ).first();
    await expect(validationError).toBeVisible({ timeout: 5000 });
  });
});
