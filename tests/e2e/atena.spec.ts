import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/atena");
}
async function ask(page: Page, question: string) {
  await page.getByLabel("Sua pergunta").fill(question);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
}

test("CLIENT Alpha vê somente 7Commander, citação autorizada e resposta neutra", async ({ page }) => {
  await login(page, "cliente.alpha@demo.7support.local", "demo-alpha");
  await expect(page.getByLabel("Produto da nova conversa").locator("option")).toHaveCount(1);
  await expect(page.getByText("Diagnóstico local")).toHaveCount(0);
  await expect(page.getByText("Demonstração local")).toHaveCount(0);
  await page.getByRole("button", { name: "Nova conversa" }).click();
  await ask(page, "Como acompanhar um projeto?");
  await expect(page.getByText("Trechos da base autorizada", { exact: false })).toBeVisible();
  await page.getByTitle(/Abrir fonte Como acompanhar um projeto/).click();
  await expect(page.getByRole("dialog", { name: "Fonte autorizada" })).toContainText("últimas atualizações");
  await page.getByRole("dialog").getByRole("button", { name: "Fechar painel" }).click();
  await page.reload();
  await page.getByRole("listitem").filter({ hasText: "Conversa com Atena" }).click();
  await expect(page.getByTitle(/Abrir fonte Como acompanhar um projeto/)).toBeVisible();
  await ask(page, "responsável estado anterior");
  await expect(page.getByText("Não encontrei conteúdo suficiente na base autorizada para responder isso com segurança.")).toBeVisible();
  await expect(page.getByText("Falha conhecida na atualização de etapa")).toHaveCount(0);
});

test("CLIENT Beta recebe 7Finance e não vê conteúdo do 7Commander", async ({ page }) => {
  await login(page, "cliente.beta@demo.7support.local", "demo-beta");
  await expect(page.getByLabel("Produto da nova conversa").locator("option")).toHaveCount(1);
  await page.getByRole("button", { name: "Nova conversa" }).click();
  await ask(page, "Onde consultar lançamentos?");
  await expect(page.getByTitle(/Abrir fonte Onde consultar lançamentos/)).toBeVisible();
  await expect(page.getByText("Como acompanhar um projeto")).toHaveCount(0);
});

test("SUPPORT consulta publicação interna, não vê diagnóstico e arquiva", async ({ page }) => {
  await login(page, "suporte@demo.7support.local", "demo-suporte");
  await page.getByLabel("Produto da nova conversa").selectOption("product-commander");
  await page.getByRole("button", { name: "Nova conversa" }).click();
  await ask(page, "Falha conhecida na atualização de etapa");
  await expect(page.getByTitle(/Abrir fonte Falha conhecida na atualização de etapa/)).toBeVisible();
  await expect(page.getByText("Diagnóstico local")).toHaveCount(0);
  await expect(page.getByText("Demonstração local")).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Arquivar conversa" }).click();
  await expect(page.getByText("Nenhuma conversa ativa")).toBeVisible();
});

test("ADMIN simula fallback, falha total e retry manual sem duplicar mensagem", async ({ page }) => {
  await login(page, "admin@demo.7support.local", "demo-admin");
  await page.getByLabel("Produto da nova conversa").selectOption("product-commander");
  await page.getByRole("button", { name: "Nova conversa" }).click();
  await page.getByLabel("Cenário do provider").selectOption("FALLBACK_SUCCESS");
  await ask(page, "Como acompanhar um projeto?");
  await expect(page.getByText("FALLBACK_SUCCEEDED")).toBeVisible();
  await page.getByLabel("Cenário do provider").selectOption("TOTAL_FAILURE");
  await ask(page, "Como acompanhar um projeto?");
  await expect(page.getByText("Falha local")).toBeVisible();
  await page.getByLabel("Cenário do provider").selectOption("PRIMARY_SUCCESS");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByText("SUCCEEDED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Falha local")).toHaveCount(0);
  await expect(page.getByText("Como acompanhar um projeto?", { exact: true })).toHaveCount(2);
});
