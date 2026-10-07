import { expect, test } from "@playwright/test";

test.describe("SPEC 02 local identity", () => {
  test("rejects invalid login and persists a valid CLIENT session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("cliente.alpha@demo.7support.local");
    await page.getByLabel("Senha").fill("invalida");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Credenciais de demonstração inválidas" })).toContainText("Credenciais de demonstração inválidas");
    await page.getByLabel("Senha").fill("demo-alpha");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: /Olá, Cliente Alpha/ })).toBeVisible();
    await expect(page.getByText("7Commander", { exact: true })).toBeVisible();
    await expect(page.getByText("7Finance", { exact: true })).not.toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: /Olá, Cliente Alpha/ })).toBeVisible();
  });

  test("keeps CLIENT A and CLIENT B product contexts separate", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("cliente.alpha@demo.7support.local");
    await page.getByLabel("Senha").fill("demo-alpha");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: /Olá, Cliente Alpha/ })).toBeVisible();
    await expect(page.getByText("7Commander", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await page.getByLabel("E-mail").fill("cliente.beta@demo.7support.local");
    await page.getByLabel("Senha").fill("demo-beta");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: /Olá, Cliente Beta/ })).toBeVisible();
    await expect(page.getByText("7Finance", { exact: true })).toBeVisible();
    await expect(page.getByText("7Commander", { exact: true })).not.toBeVisible();
  });

  test("shows support and admin contexts and permits logout", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("suporte@demo.7support.local");
    await page.getByLabel("Senha").fill("demo-suporte");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Central de atendimento", level: 2 })).toBeVisible();
    await expect(page.getByText("SUPPORT", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page.getByRole("heading", { name: "Entrar no 7Support" })).toBeVisible();
  });
});
