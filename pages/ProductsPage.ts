import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ProductData {
  name: string;
  sku?: string;
  category?: string;
  price?: string;
  variants?: string;
}

export class ProductsPage extends BasePage {
  private merchantId: string = '';

  // Listing page
  readonly createProductBtn: Locator;
  readonly searchInput: Locator;
  readonly productListRows: Locator;

  // Create/Edit form
  readonly productNameInput: Locator;
  readonly productPriceInput: Locator;
  readonly productSkuInput: Locator;
  readonly createBtn: Locator;
  readonly updateBtn: Locator;

  // Modals
  readonly confirmDeleteBtn: Locator;

  constructor(page: Page) {
    super(page);

    // Listing page locators
    this.createProductBtn = page.locator("button.ant-btn-primary:has-text('Add product')");
    this.searchInput = page.locator("input[placeholder='Search']");
    this.productListRows = page.locator("tr.ant-table-row");

    // Form locators — shared between create and edit pages
    this.productNameInput = page.locator("input[placeholder='Short sleeve t-shirt']");
    this.productPriceInput = page.locator("input.ant-input-number-input").first();
    this.productSkuInput = page.locator("input[placeholder='Enter SKU']");

    // Save buttons differ between create and edit pages
    this.createBtn = page.locator("button:has-text('Create Product')");
    this.updateBtn = page.locator("button:has-text('Update Product'), button:has-text('Save Product'), button.ant-btn-primary[type='submit']");

    // Confirmation modals
    this.confirmDeleteBtn = page.locator(
      'button.ant-btn-primary:has-text("OK"), button:has-text("Delete"), .ant-popconfirm button.ant-btn-primary'
    );
  }

  async navigateToProducts(merchantId: string) {
    this.merchantId = merchantId;
    await this.page.goto(`/gk-pages/store/${merchantId}/products`);
    await this.waitForPageLoad();
    // Wait for the table or empty state to be visible
    await this.page.waitForSelector('tr.ant-table-row, .ant-empty', { timeout: 15000 }).catch(() => {});
  }

  private async goBackToListing() {
    await this.page.goto(`/gk-pages/store/${this.merchantId}/products`);
    await this.waitForPageLoad();
    await this.page.waitForSelector('tr.ant-table-row, .ant-empty', { timeout: 15000 }).catch(() => {});
  }

  async createProduct(data: ProductData) {
    await this.clickElement(this.createProductBtn);

    // Wait for the create form page to load
    await this.productNameInput.waitFor({ state: 'visible' });
    await this.fillInput(this.productNameInput, data.name);

    if (data.price) {
      await this.fillInput(this.productPriceInput, data.price);
    }

    // Fill SKU if provided (required field)
    if (data.sku) {
      // The SKU input may need scrolling into view
      await this.productSkuInput.scrollIntoViewIfNeeded();
      await this.fillInput(this.productSkuInput, data.sku);
    }

    await this.clickElement(this.createBtn);

    // Wait for URL to change away from /new (redirects to product detail page on success)
    // or handle staying on the same page if there's a validation error
    try {
      await this.page.waitForURL(/\/products\/(?!new)/, { timeout: 10000 });
    } catch {
      // Might stay on /new if there's an issue — navigate back to listing anyway
    }

    // Navigate back to the listing page so we can search/verify
    await this.goBackToListing();
  }

  async searchProduct(name: string) {
    // Ensure search input is visible and stable
    await this.searchInput.waitFor({ state: 'visible', timeout: 15000 });
    
    // Clear and fill using the robust method to avoid React state data wiping
    await this.robustFill(this.searchInput, name);
    
    await this.searchInput.press('Enter');
    
    // Wait for the table to refresh — instead of a static timeout, 
    // we wait for the pagination or table rows to update their state
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await Promise.all([
      this.page.waitForSelector('tr.ant-table-row, .ant-empty', { state: 'visible', timeout: 10000 }),
      this.waitForPageLoad()
    ]);
  }

  async getProductRow(name: string): Promise<Locator> {
    return this.productListRows.filter({ hasText: name }).first();
  }

  async updateProduct(searchName: string, newData: ProductData) {
    // Click on the product name link to navigate to its edit page
    const row = await this.getProductRow(searchName);
    const productLink = row.locator('a').first();
    await this.clickElement(productLink);

    // Guard: if session expired, the app redirects to the login page — fail fast with clarity
    await this.page.waitForURL(
      url => !url.toString().includes('/login') && !url.toString().includes('gokwik.co/?'),
      { timeout: 10000 }
    ).catch(() => {
      const current = this.page.url();
      if (current.includes('/login') || current.includes('gokwik.co/?')) {
        throw new Error(`Session expired: browser redirected to login page (${current}). Re-login is required.`);
      }
    });

    // Wait for edit form input to appear first...
    await this.productNameInput.waitFor({ state: 'visible' });

    // ...then wait for the loader overlay to fully disappear before interactions
    await this.waitForLoader(20000);

    // Extra stabilization: wait for the fixed navbar overlay to disappear too
    const fixedNav = this.page.locator('div.fixed.top-0.left-0.w-full.z-10');
    try {
      await fixedNav.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Nav overlay may be expected; continue
    }

    // Use the extremely robust fill to avoid React state data wiping
    await this.productNameInput.waitFor({ state: 'visible' });
    await this.robustFill(this.productNameInput, newData.name);

    // Scroll to the bottom to find the save button and bypass any floating elements
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(500);

    // Try finding the Update/Save button by common patterns — use force to bypass overlays
    const saveBtn = this.page.locator(
      "button:has-text('Update Product'), button:has-text('Save'), button:has-text('Update'), button.ant-btn-primary[type='submit']"
    ).first();
    await saveBtn.waitFor({ state: 'visible' });
    
    // Catch the API response to see if it's failing validation (e.g. unique SKU duplicate)
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('products') && ['PUT', 'PATCH', 'POST'].includes(response.request().method()),
      { timeout: 15000 }
    );

    // Use native DOM click to bypass ANY overlapping floating widgets (like the AI chat bubble) completely
    await saveBtn.evaluate((btn: HTMLElement) => btn.click());
    
    const response = await responsePromise;
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Update API failed with status ${response.status()}: ${body}`);
    }

    // Check for success message toast (Ant Design uses .ant-message)
    const successToast = this.page.locator('.ant-message-success, .ant-notification-notice-success').first();
    try {
      await successToast.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // It's okay if there's no toast, as long as we waited a bit
      await this.page.waitForTimeout(3000);
    }

    await this.goBackToListing();
  }

  async deleteProduct(name: string) {
    const row = await this.getProductRow(name);
    
    // Guard: Verify row exists before proceeding to avoid timeout hangs
    if (await row.count() === 0) {
      throw new Error(`Product "${name}" not found in listing. Cannot delete.`);
    }

    // Strategy 1: Checkbox + Bulk Action Delete
    const checkbox = row.locator('input[type="checkbox"], .ant-checkbox-input').first();
    if (await checkbox.isVisible()) {
      await this.clickElement(checkbox);
      
      const globalDeleteBtn = this.page.locator('button:has-text("Delete"), button:has-text("Delete Selected"), .anticon-delete, [aria-label="delete"]').filter({ hasNotText: 'Search' }).first();
      
      if (await globalDeleteBtn.isVisible()) {
        await this.clickElement(globalDeleteBtn);
        
        // Confirm deletion
        const confirmBtn = this.page.locator('.ant-popconfirm button.ant-btn-primary, .ant-modal-confirm-btns button.ant-btn-primary, button:has-text("OK"), button:has-text("Yes")').first();
        await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
        await confirmBtn.click();
        
        await this.waitForPageLoad();
        return;
      }
    }

    // Strategy 2: Click into product details/edit page and delete from there
    const productLink = row.locator('a').first();
    await this.clickElement(productLink);

    // Wait for form to mount
    await this.productNameInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.waitForLoader(30000); 

    const moreActionBtn = this.page.locator('button:has-text("More Action"), .ant-dropdown-trigger:has-text("More Action")').first();
    await moreActionBtn.waitFor({ state: 'visible', timeout: 15000 });
    
    const pageDeleteBtn = this.page.locator('.ant-dropdown-menu-item:has-text("Delete"), .ant-dropdown-menu li:has-text("Delete"), li:has-text("Delete")').first();
    
    // Attempt to open dropdown and find Delete
    for (let attempt = 0; attempt < 3; attempt++) {
      await moreActionBtn.evaluate((btn: HTMLElement) => btn.click());
      await this.page.waitForTimeout(1000);
      if (await pageDeleteBtn.isVisible()) break;
    }

    await pageDeleteBtn.waitFor({ state: 'visible', timeout: 5000 });
    await pageDeleteBtn.evaluate((btn: HTMLElement) => btn.click());

    try {
      const pageConfirmBtn = this.page.locator('.ant-modal-confirm-btns button.ant-btn-primary, button.ant-btn-primary:has-text("OK"), button.ant-btn-primary:has-text("Confirm"), button:has-text("Yes"), button.ant-btn-dangerous').first();
      await pageConfirmBtn.waitFor({ state: 'visible', timeout: 5000 });
      await pageConfirmBtn.click();
    } catch {
      // Might have redirected instantly
    }
    
    // Wait for the delete API response but don't hang if it's already done
    await this.page.waitForResponse(
      (response) => response.url().includes('products') && response.request().method() === 'DELETE',
      { timeout: 15000 }
    ).catch(() => null);

    // Final clean up navigation — wrapped in try/catch to avoid Target Closed errors on timeout
    try {
      if (this.page.url().includes('/edit')) {
        await this.goBackToListing();
      }
    } catch (e) { /* Ignore target closed */ }
  }

  async getProductStatus(name: string): Promise<string> {
    const row = await this.getProductRow(name);
    const statusEl = row.locator('.ant-badge, [class*="status"], [class*="Status"]').first();
    return await statusEl.innerText().catch(() => '');
  }
}
