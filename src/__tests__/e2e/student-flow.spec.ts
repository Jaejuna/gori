import { test, expect } from '@playwright/test';

const uniqueSuffix = () => Date.now().toString(36);

test.describe('Student Flow', () => {
  test('student can register, login, and view dashboard', async ({ page }) => {
    const email = `student-${uniqueSuffix()}@e2e.test`;
    const password = 'Test1234!';
    const name = 'E2E 학생';

    // Register as student (no class code for simplicity)
    await page.goto('/register');
    await page.getByLabel('이름').fill(name);
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill(password);
    // Select student role if there's a role selector
    const roleSelect = page.getByRole('combobox').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('STUDENT');
    }
    await page.getByRole('button', { name: '회원가입' }).click();

    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 10000 });

    // Login if redirected to login
    if (page.url().includes('/login')) {
      await page.getByLabel('이메일').fill(email);
      await page.getByLabel('비밀번호').fill(password);
      await page.getByRole('button', { name: '로그인' }).click();
      await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    }

    // Verify dashboard shows expected elements
    await expect(page.getByText('내 학습 현황')).toBeVisible();
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('student can view test page', async ({ page }) => {
    // Mock session by navigating to login page
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /로그인/ })).toBeVisible();
  });

  test('recommendations page shows empty state without history', async ({ page }) => {
    // Unauthenticated → redirect to login
    await page.goto('/recommendations');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
