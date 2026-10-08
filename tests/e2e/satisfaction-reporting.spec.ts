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
  await page.getByLabel("Assunto").fill("Homologação Satisfaction"); await page.getByLabel("Descrição").fill("Contexto real para avaliar atendimento");
  await page.getByRole("button", { name: "Abrir chamado", exact: true }).click(); await expect(page).toHaveURL(/\/tickets\/(?!new$)[^/]+$/);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}
async function resolve(page: Page, id: string) {
  await page.goto(`/support/tickets/${id}`); await page.getByLabel("Próximo status").selectOption("IN_PROGRESS");
  await expect(page.getByRole("button", { name: "Resolver chamado" })).toBeVisible();
  await page.getByLabel("Motivo da resolução ou reabertura").fill("Resolução para homologação");
  await page.getByRole("button", { name: "Resolver chamado" }).click();
  await expect(page.getByRole("button", { name: "Reabrir chamado" })).toBeVisible();
}
const panel = (page: Page) => page.getByRole("region", { name: "Avaliação do atendimento" });
test("CLIENT avalia Não sem reabrir; feedback imutável persiste; novo ciclo permite nova avaliação", async ({ page }, info) => {
  const id = await create(page); await expect(panel(page)).toHaveCount(0); await logout(page); await login(page, "support"); await resolve(page, id);
  await expect(panel(page).getByRole("button", { name: "Enviar avaliação" })).toHaveCount(0);
  await logout(page); await login(page); await page.goto(`/tickets/${id}`);
  await expect(panel(page).getByRole("button", { name: "Enviar avaliação" })).toBeDisabled();
  await panel(page).getByRole("radio", { name: "Não", exact: true }).check(); await panel(page).getByLabel("Nota do atendimento (opcional)").selectOption("3");
  await panel(page).getByLabel("Comentário (opcional)").fill("Feedback visual de homologação");
  await page.screenshot({ path: info.outputPath("satisfaction-client-form.png"), fullPage: true });
  await panel(page).getByRole("button", { name: "Enviar avaliação", exact: true }).click();
  await expect(panel(page).getByText("Problema resolvido: Não", { exact: true })).toBeVisible(); await expect(panel(page).getByRole("radio")).toHaveCount(0);
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem("7support.spec03.tickets.v1")!).tickets.find((t: { id: string }) => t.id === id).status, id)).toBe("RESOLVED");
  await page.reload(); await expect(panel(page).getByText("Feedback visual de homologação")).toBeVisible();
  await logout(page); await login(page, "support"); await page.goto(`/support/tickets/${id}`); await expect(panel(page).getByText("Feedback visual de homologação")).toBeVisible();
  await page.getByLabel("Motivo da resolução ou reabertura").fill("Novo ciclo autorizado"); await page.getByRole("button", { name: "Reabrir chamado" }).click(); await resolve(page, id);
  await logout(page); await login(page); await page.goto(`/tickets/${id}`); await panel(page).getByRole("radio", { name: "Sim", exact: true }).check(); await panel(page).getByRole("button", { name: "Enviar avaliação", exact: true }).click();
  await expect(panel(page).getByText("Avaliação enviada", { exact: false })).toHaveCount(2);
});
test("reabertura cancela avaliação ainda não enviada", async ({ page }) => {
  const id = await create(page); await logout(page); await login(page, "support"); await resolve(page, id);
  await page.getByLabel("Motivo da resolução ou reabertura").fill("Reabrir antes da avaliação"); await page.getByRole("button", { name: "Reabrir chamado" }).click();
  await expect(page.getByLabel("Próximo status")).toHaveValue(""); await logout(page); await login(page); await page.goto(`/tickets/${id}`);
  await expect(panel(page).getByText(/cancelada pela reabertura/)).toBeVisible(); await expect(panel(page).getByRole("radio")).toHaveCount(0);
});
test("duas abas CLIENT enviam um registro único", async ({ page, context }) => {
  const id = await create(page); await logout(page); await login(page, "support"); await resolve(page, id); await logout(page); await login(page);
  const other = await context.newPage(); await Promise.all([page.goto(`/tickets/${id}`), other.goto(`/tickets/${id}`)]);
  await Promise.all([panel(page).getByRole("radio", { name: "Sim", exact: true }).check(), panel(other).getByRole("radio", { name: "Sim", exact: true }).check()]);
  const buttons = await Promise.all([panel(page).getByRole("button", { name: "Enviar avaliação", exact: true }).elementHandle(), panel(other).getByRole("button", { name: "Enviar avaliação", exact: true }).elementHandle()]);
  await Promise.all(buttons.map(button => button!.evaluate(element => (element as HTMLButtonElement).click())));
  await expect(panel(page).getByText("Problema resolvido: Sim", { exact: true })).toBeVisible(); await expect(panel(other).getByText("Problema resolvido: Sim", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("7support.spec10.satisfaction.v1")!).feedback.length)).toBe(1); await other.close();
});
for (const role of ["support", "admin"]) test(`${role} consulta relatório de registros reais sem efeitos colaterais`, async ({ page }, info) => {
  const id = await create(page); await logout(page); await login(page, "support"); await resolve(page, id); await logout(page); await login(page);
  await page.goto(`/tickets/${id}`); await panel(page).getByRole("radio", { name: "Sim", exact: true }).check(); await panel(page).getByRole("button", { name: "Enviar avaliação", exact: true }).click(); await expect(panel(page).getByText("Problema resolvido: Sim", { exact: true })).toBeVisible();
  await logout(page); await login(page, role); await page.goto("/support/reports"); await expect(page.getByRole("heading", { name: "Relatórios", level: 2 })).toBeVisible();
  const filters = page.getByRole("form", { name: "Filtros dos relatórios" }); await filters.getByRole("combobox", { name: "Cliente", exact: true }).selectOption("client-alpha"); await filters.getByRole("combobox", { name: "Produto", exact: true }).selectOption("product-commander");
  const before = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
  await page.getByRole("button", { name: "Consultar relatório", exact: true }).click(); const result = page.getByRole("region", { name: "Resultado dos relatórios" });
  await expect(result.getByText(/Intervalo utilizado em UTC/)).toBeVisible(); await expect(result.getByText("Avaliações recebidas", { exact: true }).locator("..").getByRole("definition")).toHaveText("1");
  await expect(result.getByText("Taxa positiva SIM / (SIM + NÃO)").locator("..").getByRole("definition")).toHaveText("100%");
  expect(await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])))).toBe(before);
  await page.screenshot({ path: info.outputPath(`reporting-${role}-desktop.png`), fullPage: true });
  await filters.getByLabel("Data inicial").fill("2040-01-01"); await filters.getByLabel("Data final").fill("2040-01-02"); await page.getByRole("button", { name: "Consultar relatório", exact: true }).click(); await expect(result.getByText("Sem dados neste período.")).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 }); await expect(page.getByRole("complementary", { name: "Menu principal" })).not.toBeInViewport(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: info.outputPath(`reporting-${role}-mobile.png`), fullPage: true });
});
test("CLIENT não vê menu nem acessa relatório agregado", async ({ page }) => { await login(page); await expect(page.getByRole("link", { name: "Relatórios", exact: true })).toHaveCount(0); await page.goto("/support/reports"); await expect(page).toHaveURL(/\/forbidden/); });
