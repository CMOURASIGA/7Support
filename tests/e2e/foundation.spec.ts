import { expect, test } from "@playwright/test";

test("carrega o shell da fundação", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("suporte@demo.7support.local");
  await page.getByLabel("Senha").fill("demo-suporte");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Central de atendimento" })).toBeVisible();
  await expect(page.getByText("Chamados recentes")).toBeVisible();
});

test("navegação móvel e resumo usam gavetas acessíveis", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("cliente.alpha@demo.7support.local");
  await page.getByLabel("Senha").fill("demo-alpha");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Início" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar menu" }).first().click();
  await page.getByRole("button", { name: "Visualizar resumo" }).click();
  await expect(page.getByRole("dialog", { name: "Resumo de identidade" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Resumo de identidade" })).not.toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});

test("healthcheck responde operacional", async ({ request }) => {
  const response = await request.get("/api/health");
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toMatchObject({ status: "ok", service: "7support" });
});
