import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly merchantDropdownToggle: Locator;
  readonly merchantSearchInput: Locator;
  readonly setMerchantButton: Locator;

  constructor(page: Page) {
    super(page);
    this.merchantDropdownToggle = page.locator('button.ant-btn.w-80.shadow-lg');
    this.merchantSearchInput = page.locator('div.ant-modal-content input[type="text"]');
    this.setMerchantButton = page.locator("button.ant-btn-primary:has-text('Set Merchant')");
  }

  async switchMerchant(merchantId: string) {
    // Wait for dashboard to fully load, then click the merchant switcher
    await this.merchantDropdownToggle.waitFor({ state: 'visible' });
    await this.merchantDropdownToggle.click();
    
    // Wait for the modal search input to become visible before typing
    await this.merchantSearchInput.waitFor({ state: 'visible' });
    await this.fillInput(this.merchantSearchInput, merchantId);

    // Wait for search results to load (API can take 2-3s)
    // Target the specific radio for the searched merchantId
    const radio = this.page.locator(`label.ant-radio-wrapper:has-text("${merchantId}") input.ant-radio-input`);
    await radio.waitFor({ state: 'visible', timeout: 10000 });
    await radio.click();

    await this.clickElement(this.setMerchantButton);
    
    // Wait for the modal to close after merchant is set
    await this.page.locator('div.ant-modal-content').waitFor({ state: 'hidden', timeout: 10000 });
    await this.waitForPageLoad();
  }
}
