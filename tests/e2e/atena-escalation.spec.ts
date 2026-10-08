import { expect, test, type Page } from "@playwright/test";
async function login(page: Page, role = "alpha") {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(role === "support" ? "suporte@demo.7support.local" : role === "admin" ? "admin@demo.7support.local" : "cliente.alpha@demo.7support.local");
  await page.getByLabel("Senha").fill(`demo-${role === "support" ? "suporte" : role}`);
  await page.getByRole("button", { name: "Entrar" }).click(); await expect(page).toHaveURL(/\/$/);
  await page.goto("/atena"); await page.getByRole("button", { name: "Nova conversa" }).click();
  await page.getByLabel("Sua pergunta").fill("Pergunta sem conhecimento xyz"); await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Não encontrei conteúdo suficiente na base autorizada para responder isso com segurança.")).toBeVisible();
}
test("revisão explícita, cancelamento, edição, criação, refresh e navegação CLIENT", async ({ page }, testInfo) => {
  await login(page);
  await page.getByRole("button", { name: "Abrir chamado", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Revisar abertura do chamado" });
  await expect(drawer.getByLabel("Produto", { exact: true })).toHaveAttribute("readonly", "");
  await expect(drawer.getByLabel("Assunto")).toHaveValue("Pergunta sem conhecimento xyz");
  await page.screenshot({ path: testInfo.outputPath("drawer-desktop.png") });
  await drawer.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText(/Chamado CS-\d+ criado/)).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir chamado", exact: true }).click();
  await drawer.getByLabel("Assunto").fill("Assunto revisado da Atena"); await drawer.getByLabel("Descrição").fill("Descrição aprovada pelo cliente");
  await drawer.getByRole("button", { name: "Confirmar abertura" }).click();
  const link = page.getByRole("link", { name: "Abrir chamado", exact: true });
  await expect(link).toBeVisible(); const href = await link.getAttribute("href"); expect(href).toMatch(/^\/tickets\//);
  await expect(page.getByRole("button", { name: "Abrir chamado", exact: true })).toHaveCount(0);
  await page.reload(); await page.getByRole("listitem").first().click(); await expect(link).toHaveAttribute("href", href!);
  await link.click(); await expect(page).toHaveURL(/\/tickets\/[^/]+$/);
  await expect(page.getByText("Assunto revisado da Atena", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Descrição aprovada pelo cliente", { exact: true })).toBeVisible();
});
for (const role of ["support", "admin"]) test(`${role} não recebe ação de escalada`, async ({ page }) => {
  await login(page, role); await expect(page.getByRole("button", { name: "Abrir chamado", exact: true })).toHaveCount(0);
});
test("drawer mobile preserva campos e confirmação sem overflow horizontal", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await login(page);
  await page.getByRole("button", { name: "Abrir chamado", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("drawer-mobile.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Confirmar abertura" })).toBeEnabled();
});
test("duas abas confirmam a mesma origem sem duplicar ticket ou notificação", async ({ page, context }) => {
  await login(page);
  const other = await context.newPage(); await other.goto("/atena"); await other.getByRole("listitem").first().click();
  await page.getByRole("button", { name: "Abrir chamado", exact: true }).click();
  await other.getByRole("button", { name: "Abrir chamado", exact: true }).click();
  await Promise.all([page.getByRole("button", { name: "Confirmar abertura" }).click(), other.getByRole("button", { name: "Confirmar abertura" }).click()]);
  await expect(page.getByRole("link", { name: "Abrir chamado", exact: true })).toBeVisible();
  await expect(other.getByRole("link", { name: "Abrir chamado", exact: true })).toBeVisible();
  expect(await other.getByRole("link", { name: "Abrir chamado", exact: true }).getAttribute("href")).toBe(await page.getByRole("link", { name: "Abrir chamado", exact: true }).getAttribute("href"));
  const count = await page.evaluate(() => {
    const tickets = JSON.parse(localStorage.getItem("7support.spec03.tickets.v1")!).tickets.filter((ticket: { origin?: { type: string } }) => ticket.origin?.type === "ATENA");
    const notifications = JSON.parse(localStorage.getItem("7support.spec05.notifications.v1")!).notifications.filter((item: { type: string; ticketId: string }) => item.type === "TICKET_CREATED" && item.ticketId === tickets[0].id);
    return { tickets: tickets.length, notifications: notifications.length };
  });
  expect(count).toEqual({ tickets: 1, notifications: 1 });
});
