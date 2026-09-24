import { expect, test } from "@playwright/test";

test("carrega o shell da fundação", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Central de atendimento" })).toBeVisible();
  await expect(page.getByText("Chamados recentes")).toBeVisible();
});

test("healthcheck responde operacional", async ({ request }) => {
  const response = await request.get("/api/health");
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({ status: "ok", service: "7support" });
});
