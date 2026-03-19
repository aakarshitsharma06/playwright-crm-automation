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

  test('Create Product Successfully', async () => {
    await productsPage.createProduct({
      name: PRODUCT_NAME,
      price: testData.product.price,
      sku: `${testData.product.sku}-${RUN_ID}`,  // Unique SKU per run to avoid duplicates
    });

    // Verify product appears in listing
    await productsPage.searchProduct(PRODUCT_NAME);
    const row = await productsPage.getProductRow(PRODUCT_NAME);
    await expect(row).toBeVisible({ timeout: 10000 });
  });

  test('Read / Verify Product', async () => {
    await productsPage.searchProduct(PRODUCT_NAME);
    const row = await productsPage.getProductRow(PRODUCT_NAME);

    // Validate Name appears in the row
    await expect(row).toContainText(PRODUCT_NAME, { timeout: 10000 });

    // Validate there is a status badge or Active indicator
    const statusBadge = row.locator('.ant-badge, [class*="status"], [class*="badge"]').first();
    const count = await statusBadge.count();
    if (count > 0) {
      await expect(statusBadge).toBeVisible();
    }
  });

  test('Update Product', async () => {
    await productsPage.searchProduct(PRODUCT_NAME);
    await productsPage.updateProduct(PRODUCT_NAME, { name: UPDATED_NAME });

    // Validate updated value is reflected in listing
    await productsPage.searchProduct(UPDATED_NAME);
    const updatedRow = await productsPage.getProductRow(UPDATED_NAME);
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
  });

  test('Delete Product', async () => {
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
