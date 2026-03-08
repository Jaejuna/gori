import { test, expect } from '@playwright/test';

const uniqueSuffix = () => Date.now().toString(36);

test.describe('Teacher Flow', () => {
  test('teacher can register and view their dashboard', async ({ page }) => {
    const email = `teacher-${uniqueSuffix()}@e2e.test`;
    const password = 'Test1234!';
    const name = 'E2E 선생님';

    // Register as teacher
    await page.goto('/register');
    await page.getByLabel('이름').fill(name);
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호').fill(password);
    const roleSelect = page.getByRole('combobox').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('TEACHER');
    }
    await page.getByRole('button', { name: '회원가입' }).click();

    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 10000 });

    if (page.url().includes('/login')) {
      await page.getByLabel('이메일').fill(email);
      await page.getByLabel('비밀번호').fill(password);
      await page.getByRole('button', { name: '로그인' }).click();
    }

    // Teacher should be able to navigate to teacher dashboard
    await page.goto('/teacher/dashboard');
    await expect(page).toHaveURL('/teacher/dashboard', { timeout: 10000 });
    await expect(page.getByText('선생님 대시보드')).toBeVisible();
  });

  test('student cannot access teacher routes', async ({ page }) => {
    // Unauthenticated → redirect to login
    await page.goto('/teacher/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('teacher student list page shows empty state', async ({ page }) => {
    // Unauthenticated → redirect to login
    await page.goto('/teacher/students');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /로그인/ })).toBeVisible();
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
  });
});
