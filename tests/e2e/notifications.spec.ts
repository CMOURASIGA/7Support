import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
}

async function createClientTicket(page: Page, subject: string) {
  await page.goto("/tickets/new");
  await page.getByLabel("Produto autorizado").selectOption("product-commander");
  await page.getByLabel("Tipo de solicitação").selectOption("INCIDENT");
  await page.getByLabel("Assunto").fill(subject);
  await page.getByLabel("Descrição").fill("Descrição pública para validar notificações.");
  await page.getByLabel("Impacto").selectOption("BLOCKING");
  await page.getByRole("button", { name: "Abrir chamado" }).click();
  await expect(page).toHaveURL(/\/tickets\/(?!new$)[^/]+$/);
}

test("CLIENT recebe confirmação, lê pelo drawer e preserva leitura após refresh", async ({ page }) => {
  await login(page, "cliente.alpha@demo.7support.local", "demo-alpha");
  await createClientTicket(page, "Notificação E2E");
  await expect(page.getByRole("button", { name: /Notificações, 1 não lida/ })).toBeVisible();
  await page.getByRole("button", { name: /Notificações, 1 não lida/ }).click();
  await expect(page.getByRole("dialog")).toContainText("aberto com sucesso");
  await page.getByRole("button", { name: /aberto com sucesso/ }).click();
  await page.getByRole("button", { name: "Marcar como lida" }).click();
  await page.goto("/notifications");
  await expect(page.getByText("0 não lidas")).toBeVisible();
  await page.reload();
  await expect(page.getByText("0 não lidas")).toBeVisible();
});

test("resposta pública notifica CLIENT e nota interna não vaza", async ({ page }) => {
  await login(page, "suporte@demo.7support.local", "demo-suporte");
  await page.goto("/support/queue");
  await page.getByLabel("Busca").fill("CS-000002");
  await page.getByRole("button", { name: "Visualizar resumo CS-000002" }).click();
  await page.getByRole("link", { name: "Abrir chamado completo" }).click();
  await page.getByRole("button", { name: "Nota interna" }).click();
  await page.getByLabel("Texto da nota interna").fill("Conteúdo reservado E2E");
  await page.getByRole("button", { name: "Salvar nota interna" }).click();
  await page.getByRole("button", { name: "Resposta ao cliente" }).click();
  await page.getByLabel("Texto da resposta pública").fill("Existe uma nova atualização pública.");
  await page.getByRole("button", { name: "Enviar resposta ao cliente" }).click();
  await logout(page);
  await login(page, "cliente.alpha@demo.7support.local", "demo-alpha");
  await page.goto("/notifications");
  await expect(page.getByText("Nova resposta em CS-000002")).toBeVisible();
  await expect(page.getByText("Conteúdo reservado E2E")).toHaveCount(0);
});

test("falha do provider local mantém a notificação e o isolamento Beta", async ({ page }) => {
  await login(page, "cliente.alpha@demo.7support.local", "demo-alpha");
  await page.goto("/notifications");
  await page.getByLabel("Simulação de entrega").selectOption("FAILURE");
  await createClientTicket(page, "Entrega local com falha");
  await page.goto("/notifications");
  await page.getByRole("button", { name: /aberto com sucesso/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Falha local");
  await page.getByRole("dialog").getByRole("button", { name: "Fechar painel" }).click();
  await logout(page);
  await login(page, "cliente.beta@demo.7support.local", "demo-beta");
  await page.goto("/notifications");
  await expect(page.getByText("Entrega local com falha")).toHaveCount(0);
});
