import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly nextButton: Locator;
  readonly otpInput: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator("input[placeholder='example@email.com']");
    this.passwordInput = page.locator("input[type='password']");
    this.nextButton = page.locator("button.ant-btn.next");
    this.otpInput = page.locator("input[placeholder='******']");
  }

  async navigate() {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async login(email: string, password?: string, otp: string = '123456') {
    // Step 1: Email
    await this.fillInput(this.emailInput, email);
    await this.clickElement(this.nextButton);

    // Step 2: Password - wait for field to appear after step transition
    if (password) {
      await this.passwordInput.waitFor({ state: 'visible' });
      await this.fillInput(this.passwordInput, password);
      await this.clickElement(this.nextButton);
    }
    
    // Step 3: OTP
    await this.otpInput.waitFor({ state: 'visible' });
    await this.fillInput(this.otpInput, otp);
    
    await this.clickElement(this.nextButton);
    await this.waitForPageLoad();
  }
}
