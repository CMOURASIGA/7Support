import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("CLIENT busca somente conteúdo publicado do produto autorizado", async ({ page }) => {
  await login(page, "cliente.alpha@demo.7support.local", "demo-alpha");
  await page.goto("/knowledge");
  await expect(page.getByRole("heading", { name: "Base de conhecimento", level: 2 })).toBeVisible();
  await expect(page.getByText("Como acompanhar um projeto")).toBeVisible();
  await expect(page.getByText("Falha conhecida na atualização de etapa")).toHaveCount(0);
  await expect(page.getByText("Onde consultar lançamentos")).toHaveCount(0);
  await page.getByLabel("Busca").fill("ATUALIZACOES");
  await expect(page.getByText("Como acompanhar um projeto")).toBeVisible();
  await page.getByLabel("Busca").fill("responsável estado anterior");
  await expect(page.getByText("Nada para exibir")).toBeVisible();
});

test("SUPPORT consulta todas as visibilidades publicadas sem ações administrativas", async ({ page }) => {
  await login(page, "suporte@demo.7support.local", "demo-suporte");
  await page.goto("/knowledge");
  await expect(page.getByText("Como acompanhar um projeto")).toBeVisible();
  await expect(page.getByText("Falha conhecida na atualização de etapa")).toBeVisible();
  await expect(page.getByText("Onde consultar lançamentos")).toBeVisible();
  await expect(page.getByRole("link", { name: "Novo conteúdo" })).toHaveCount(0);
  await page.getByLabel("Visibilidade").selectOption("INTERNAL");
  await expect(page.getByText("Falha conhecida na atualização de etapa")).toBeVisible();
  await expect(page.getByText("Onde consultar lançamentos")).toHaveCount(0);
});

test("ADMIN executa criação, revisão obrigatória, publicação, versão e arquivamento", async ({ page }) => {
  await login(page, "admin@demo.7support.local", "demo-admin");
  await page.goto("/knowledge");
  await page.getByRole("link", { name: "Novo conteúdo" }).click();
  await page.getByLabel("Produto").selectOption("product-commander");
  await page.getByLabel("Categoria").selectOption("PROCESS");
  await page.getByLabel("Título").fill("Processo criado no E2E");
  await page.getByLabel("Visibilidade").selectOption("BOTH");
  await page.getByLabel("Conteúdo").fill("Conteúdo fictício criado para validar o workflow editorial completo.");
  await page.getByRole("button", { name: "Criar rascunho" }).click();
  await expect(page).toHaveURL(/\/admin\/knowledge\/.+/);
  await expect(page.getByText("Rascunho").first()).toBeVisible();
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  await expect(page.getByText("Em revisão").first()).toBeVisible();
  await expect(page.getByText("Versão bloqueada para edição")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Publicado").first()).toBeVisible();
  await page.getByRole("button", { name: "Nova versão" }).click();
  await page.getByLabel("Conteúdo").fill("Conteúdo fictício revisado com uma alteração material para a versão 2.");
  await page.getByRole("button", { name: "Criar nova versão em rascunho" }).click();
  await expect(page.getByText("Versão 2")).toBeVisible();
  await expect(page.getByText("Rascunho").first()).toBeVisible();
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Arquivado").first()).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByText("Arquivado").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar nova versão" })).toBeVisible();
});

test("rotas administrativas permanecem proibidas para SUPPORT", async ({ page }) => {
  await login(page, "suporte@demo.7support.local", "demo-suporte");
  await page.goto("/admin/knowledge/new");
  await expect(page).toHaveURL(/\/forbidden/);
  await page.goto("/admin/knowledge/knowledge-commander-guide");
  await expect(page).toHaveURL(/\/forbidden/);
});
