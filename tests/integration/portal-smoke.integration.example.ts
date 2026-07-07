import { expect, test } from "@playwright/test";

test("unauthenticated users are redirected from protected routes", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /login to the command portal/i })).toBeVisible();
});
