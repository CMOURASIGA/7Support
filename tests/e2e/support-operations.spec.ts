import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("SUPPORT opera fila, audit trail e separa nota interna de resposta pública", async ({ page }) => {
  await login(page, "suporte@demo.7support.local", "demo-suporte");
  await expect(page.getByText("Sem responsável").first()).toBeVisible();
  await page.goto("/support/queue");
  await expect(page.getByRole("heading", { name: "Fila de atendimento", level: 2 })).toBeVisible();
  await page.getByLabel("Busca").fill("CS-000001");
  await expect(page.getByRole("row").filter({ hasText: "Cliente Beta" })).toHaveCount(0);
  await page.getByRole("button", { name: "Visualizar resumo CS-000001" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Cliente Alpha");
  await page.getByRole("link", { name: "Abrir chamado completo" }).click();
  await page.getByRole("button", { name: "Assumir chamado" }).click();
  await page.getByLabel("Transferir responsável").selectOption("operator-marina");
  await page.getByLabel("Prioridade").selectOption("HIGH");
  await page.getByLabel("Categoria").selectOption("INCIDENT");
  await page.getByRole("button", { name: "Nota interna" }).click();
  await expect(page.getByText("Nota interna. O cliente não verá esta mensagem nem seus anexos.")).toBeVisible();
  await page.getByLabel("Texto da nota interna").fill("Investigação reservada");
  await page.getByRole("button", { name: "Salvar nota interna" }).click();
  await expect(page.getByText("Investigação reservada")).toBeVisible();
  await page.getByRole("button", { name: "Resposta ao cliente" }).click();
  await page.getByLabel("Texto da resposta pública").fill("Atualização pública do suporte");
  await page.getByRole("button", { name: "Enviar resposta ao cliente" }).click();
  await page.reload();
  await expect(page.getByText("Investigação reservada")).toBeVisible();
  await expect(page.getByText("Marina Costa").first()).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").at(-1);
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await login(page, "cliente.alpha@demo.7support.local", "demo-alpha");
  await page.goto(`/support/tickets/${id}`);
  await expect(page).toHaveURL(/\/forbidden/);
  await page.goto(`/tickets/${id}`);
  await expect(page.getByText("Atualização pública do suporte")).toBeVisible();
  await expect(page.getByText("Investigação reservada")).toHaveCount(0);
});

test("ADMIN acessa fila e CLIENT não acessa superfícies internas", async ({ page }) => {
  await login(page, "admin@demo.7support.local", "demo-admin");
  await page.goto("/support/tickets");
  await expect(page.getByRole("heading", { name: "Todos os chamados", level: 2 })).toBeVisible();
  await expect(page.getByText("CS-000007").first()).toBeVisible();
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await login(page, "cliente.beta@demo.7support.local", "demo-beta");
  await page.goto("/support/queue");
  await expect(page).toHaveURL(/\/forbidden/);
});
