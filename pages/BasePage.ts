import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Wait for the full-page loader overlay to disappear */
  async waitForLoader(timeout = 15000) {
    const loader = this.page.locator('.loader-container');
    try {
      await loader.waitFor({ state: 'hidden', timeout });
    } catch {
      // If no loader appears, that's fine — continue
    }
  }

  async clickElement(locator: Locator) {
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async fillInput(locator: Locator, text: string) {
    await locator.waitFor({ state: 'visible' });
    await locator.fill(text);
  }

  /**
   * Extremely robust fill for React controlled inputs.
   * Handles React re-render data wiping by combining standard fill with evaluation checks.
   */
  async robustFill(locator: Locator, text: string) {
    await locator.waitFor({ state: 'visible' });
    for (let i = 0; i < 5; i++) {
      // Clear native way
      await locator.evaluate((node: HTMLInputElement) => { node.value = ''; });
      await locator.fill('');
      await this.page.waitForTimeout(200);

      // Fill using Playwright
      await locator.fill(text);
      await this.page.waitForTimeout(500);

      const val = await locator.inputValue();
      if (val === text) return;

      // Fallback: Dispatch native react events using prototype setter (React 16+ hack)
      await locator.evaluate((node: HTMLInputElement, val) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(node, val);
        } else {
          node.value = val;
        }
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
      }, text);
      await this.page.waitForTimeout(500);

      if (await locator.inputValue() === text) return;
    }

    // Capture screenshot for debugging before throwing
    await this.page.screenshot({ path: `robustFill-failure-${Date.now()}.png` });
    throw new Error(`robustFill failed: Expected "${text}", but got "${await locator.inputValue()}"`);
  }
}
