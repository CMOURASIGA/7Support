import { expect, test, type Page } from "@playwright/test";
async function login(page: Page, role = "alpha") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(role === "support" ? "suporte@demo.7support.local" : role === "admin" ? "admin@demo.7support.local" : "cliente.alpha@demo.7support.local");
  await page.getByLabel("Senha").fill(`demo-${role === "support" ? "suporte" : role}`);
  await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page).toHaveURL(/\/$/);
}
async function logout(page: Page) { await page.getByRole("button", { name: "Menu do usuário" }).click(); await page.getByRole("menuitem", { name: "Sair" }).click(); }
async function create(page: Page) {
  await login(page); await page.goto("/tickets/new"); await page.getByLabel("Produto autorizado").selectOption("product-commander");
  await page.getByLabel("Assunto").fill("Homologação SLA"); await page.getByLabel("Descrição").fill("Chamado para testar prazos");
  await page.getByRole("button", { name: "Abrir chamado", exact: true }).click(); await expect(page).toHaveURL(/\/tickets\/(?!new$)[^/]+$/);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}
test("ADMIN publica nova versão e laboratório prova limites sem espera real", async ({ page }, info) => {
  await login(page, "admin"); await page.goto("/admin/sla");
  await expect(page.getByRole("heading", { name: "Políticas SLA", exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Políticas SLA", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Nova política", exact: true }).click(); const drawer = page.getByRole("dialog");
  await drawer.getByLabel("Primeira resposta (minutos)").fill("3"); await drawer.getByLabel("Resolução (minutos)").fill("8");
  await page.screenshot({ path: info.outputPath("sla-policy-drawer.png") });
  await drawer.getByRole("button", { name: "Salvar rascunho" }).click(); await expect(drawer).toHaveCount(0);
  await page.getByRole("button", { name: "Publicar v2", exact: true }).click(); await expect(page.getByRole("button", { name: "Publicar v2", exact: true })).toHaveCount(0);
  const lab = page.getByRole("region", { name: "Laboratório SLA" });
  await lab.getByRole("button", { name: "Limite exato", exact: true }).click(); await expect(lab.getByText("No prazo", { exact: true })).toHaveCount(2);
  await lab.getByRole("button", { name: "Após o limite", exact: true }).click(); await expect(lab.getByText("Prazo excedido", { exact: true })).toBeVisible();
  await lab.getByRole("button", { name: "Aguardando cliente", exact: true }).click(); await expect(lab.getByText("Prazo pausado", { exact: true })).toBeVisible();
  await lab.getByRole("button", { name: "Resolvida sem resposta", exact: true }).click(); await expect(lab.getByText("Não atendida no prazo", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("sla-admin-laboratory.png"), fullPage: true });
  await page.reload(); await expect(page.getByText("v2 · Publicada")).toBeVisible();
});
for (const role of ["support", "alpha"]) test(`${role} não acessa configuração SLA`, async ({ page }) => {
  await login(page, role); await expect(page.getByRole("link", { name: "Políticas SLA", exact: true })).toHaveCount(0);
  await page.goto("/admin/sla"); await expect(page).toHaveURL(/\/forbidden/);
});
test("CLIENT vê resumo; duas abas reconciliam um ciclo; resposta e refresh preservam", async ({ page, context }, info) => {
  const id = await create(page); const clientPanel = page.getByRole("region", { name: "SLA do chamado" });
  await expect(clientPanel.getByText("Em andamento", { exact: true })).toHaveCount(2); await expect(clientPanel.getByText(/Política v/)).toHaveCount(0);
  await logout(page); await login(page, "support"); const other = await context.newPage();
  await Promise.all([page.goto(`/support/tickets/${id}`), other.goto(`/support/tickets/${id}`)]);
  await expect(page.getByRole("region", { name: "SLA do chamado" }).getByText(/Ciclo 1/)).toBeVisible();
  await expect(other.getByRole("region", { name: "SLA do chamado" }).getByText(/Ciclo 1/)).toBeVisible();
  const cycles = await page.evaluate(id => JSON.parse(localStorage.getItem("7support.spec09.sla-cycles.v1")!).cycles.filter((cycle: { ticketId: string }) => cycle.ticketId === id).length, id); expect(cycles).toBe(1);
  await page.getByLabel("Texto da resposta pública").fill("Primeira resposta com SLA"); await page.getByRole("button", { name: "Enviar resposta ao cliente", exact: true }).click();
  await expect(page.getByRole("region", { name: "SLA do chamado" }).getByText("Resultado: Atendida no prazo")).toBeVisible();
  await page.screenshot({ path: info.outputPath("sla-internal-detail.png"), fullPage: true });
  await other.close(); await logout(page); await login(page); await page.goto(`/tickets/${id}`); await page.reload();
  await expect(clientPanel.getByText("Atendida no prazo", { exact: true })).toBeVisible();
});
test("relógio do navegador controlado gera breach único, filtro e alerta ao responsável", async ({ page }) => {
  const start = new Date("2026-10-08T12:00:00Z"); await page.clock.install({ time: start }); await page.clock.setFixedTime(start);
  const id = await create(page); await logout(page); await login(page, "support"); await page.goto(`/support/tickets/${id}`);
  await page.getByRole("button", { name: "Assumir chamado", exact: true }).click();
  await page.clock.setFixedTime(new Date(start.getTime() + 121 * 60000)); await page.goto("/support/queue");
  await page.getByLabel("Situação SLA").selectOption("BREACHED"); await expect(page.getByRole("row").filter({ hasText: "Homologação SLA" })).toHaveCount(1);
  await expect(page.getByText(/1 com prazo excedido/)).toBeVisible(); await page.reload();
  const notices = await page.evaluate(id => JSON.parse(localStorage.getItem("7support.spec05.notifications.v1")!).notifications.filter((notice: { type: string; ticketId: string }) => notice.type === "SLA_BREACHED" && notice.ticketId === id), id);
  expect(notices).toHaveLength(1); expect(notices[0].userId).toBe("user-support");
});
test("ADMIN mobile apresenta política/drawer/laboratório sem overflow", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await login(page, "admin"); await page.goto("/admin/sla");
  await page.getByRole("button", { name: "Nova política", exact: true }).click(); await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("sla-policy-mobile.png") });
});
