import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
}

test("CLIENT abre chamado, anexa arquivo, responde e mantém histórico após refresh", async ({ page }) => {
  await login(page, "cliente.alpha@demo.7support.local", "demo-alpha");
  await expect(page.getByText("Chamados abertos")).toBeVisible();
  await page.getByRole("link", { name: "Novo chamado" }).first().click();
  await expect(page.getByLabel("E-mail para contato")).toHaveValue("cliente.alpha@demo.7support.local");
  await expect(page.getByLabel("E-mail para contato")).toHaveAttribute("readonly", "");
  await page.getByLabel("Produto autorizado").selectOption("product-commander");
  await page.getByLabel("Tipo de solicitação").selectOption("INCIDENT");
  await page.getByLabel("Assunto").fill("Incidente de validação");
  await page.getByLabel("Descrição").fill("Falha ao abrir o projeto de teste.");
  await page.getByLabel("Impacto").selectOption("BLOCKING");
  await page.getByLabel("Selecionar anexos").setInputFiles({ name: "evidencia.txt", mimeType: "text/plain", buffer: Buffer.from("evidencia local") });
  await page.getByRole("button", { name: "Abrir chamado" }).click();
  await expect(page.getByText("Incidente de validação")).toBeVisible();
  await expect(page.getByText("Falha ao abrir o projeto de teste.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Baixar evidencia.txt" })).toBeVisible();
  await expect(page.getByText(/CS-\d{6}/).first()).toBeVisible();
  await page.getByLabel("Mensagem").fill("Envio mais informações para o suporte.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page.getByText("Envio mais informações para o suporte.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Envio mais informações para o suporte.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Baixar evidencia.txt" })).toBeVisible();
});

test("lista filtra, drawer abre detalhe e outro cliente não vê o registro", async ({ page }) => {
  await login(page, "cliente.alpha@demo.7support.local", "demo-alpha");
  await page.getByRole("link", { name: "Meus chamados" }).click();
  await expect(page.getByText("7Finance")).toHaveCount(0);
  await page.getByLabel("Status").selectOption("WAITING_CUSTOMER");
  await expect(page.getByText("Acesso de um novo integrante")).toBeVisible();
  await page.getByLabel("Busca").fill("código inexistente");
  await expect(page.getByText("0 chamados encontrados")).toBeVisible();
  await page.getByLabel("Busca").fill("");
  await page.getByRole("button", { name: /Visualizar CS-/ }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Abrir chamado completo");
  await page.getByRole("link", { name: "Abrir chamado completo" }).click();
  const alphaTicketPath = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await login(page, "cliente.beta@demo.7support.local", "demo-beta");
  await expect(page.getByText("7Commander")).toHaveCount(0);
  await page.goto(alphaTicketPath);
  await expect(page.getByRole("alert")).toContainText("Chamado não encontrado");
});
