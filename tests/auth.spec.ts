import { test, expect } from '../utils/fixtures';

test.describe('Authentication and Merchant Switching', () => {
  test('Login and switch to correct merchant', async ({ loginPage, dashboardPage, page }) => {
    // 1. Navigation & Login
    await loginPage.navigate();
    await loginPage.login(
      process.env.TEST_EMAIL!,
      process.env.TEST_PASSWORD!,
      process.env.TEST_OTP!
    );

    // Ensure successful redirection away from /login
    await expect(page).not.toHaveURL(/.*\/login.*/);

    // 2. Switch merchant from the top-right dropdown
    await dashboardPage.switchMerchant(process.env.MERCHANT_ID!);

    // Validate merchant switch by verifying the switcher button now shows the merchant name
    // The merchant name associated with 19h577u3p4be is "Weryzee QA"
    await expect(dashboardPage.merchantDropdownToggle).toContainText('Weryzee QA');
  });
});
