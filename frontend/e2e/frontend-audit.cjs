/**
 * Smoke real do build Angular com TestBrowserAuditServer.
 * Execute apenas com a API descartável em 8086 e o build local em 4206.
 * O harness Go exige DB_NAME=box_frontend_audit_* e nunca usa bd_box.
 * Playwright é opcional: PLAYWRIGHT_MODULE ou npm exec --package=playwright@1.56.1.
 * Este script não salva produtos, pedidos ou alterações comerciais.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function playwright() {
  if (process.env.PLAYWRIGHT_MODULE)
    return require(process.env.PLAYWRIGHT_MODULE);
  try {
    return require("playwright");
  } catch {
    for (const entry of (process.env.PATH || "").split(path.delimiter)) {
      const candidate = path.resolve(entry, "..", "playwright");
      if (fs.existsSync(path.join(candidate, "package.json")))
        return require(candidate);
    }
    throw new Error(
      "Execute com npm exec --package=playwright@1.56.1 -- node frontend/e2e/frontend-audit.cjs",
    );
  }
}

const app = "http://127.0.0.1:4206";
const api = "http://127.0.0.1:8086";
const output = path.resolve(
  process.env.AUDIT_SCREENSHOT_DIR || ".artifacts/frontend-audit/current",
);
const widths = [1440, 1024, 768, 390];
const { chromium } = playwright();
let scenario = "inicialização";

async function capture(page, name, fullPage = true) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage });
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    chromiumSandbox: true,
  });
  const errors = [];
  let injectingFailure = false;
  const checks = [];
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("http://localhost:8080/**", async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace("http://localhost:8080", api),
      });
      await route.fulfill({ response });
    });
    scenario = "autenticação do fixture isolado";
    const login = await context.request.post(`${api}/login`, {
      data: { email: "admin@audit.example.test", password: "AuditOnly2026!" },
    });
    assert.equal(login.status(), 200);
    const auth = await login.json();
    assert.equal(auth.name, "Admin Auditoria");
    assert.equal(auth.role, "admin");
    await context.addInitScript((auth) => {
      sessionStorage.setItem("authToken", auth.token);
      sessionStorage.setItem("userName", auth.name);
      sessionStorage.setItem("userRole", auth.role);
    }, auth);
    const page = await context.newPage();
    page.on("pageerror", () => errors.push(scenario));
    page.on("console", (message) => {
      if (message.type() === "error" && !injectingFailure)
        errors.push(scenario);
    });
    const screens = [
      ["dashboard", "/admin/dashboard"],
      ["reports", "/admin/relatorios"],
      ["products", "/admin/produtos"],
      ["orders", "/admin/pedidos"],
      ["customers", "/admin/clientes"],
      ["reviews", "/admin/avaliacoes"],
      ["shipping", "/admin/cadastros/faixas-cep"],
      ["promotions", "/admin/promocoes"],
      ["categories", "/admin/cadastros/categorias"],
      ["brands", "/admin/cadastros/marcas"],
    ];
    if (process.env.AUDIT_PAGES) {
      assert(
        process.env.AUDIT_PAGES.split(",").every((name) =>
          screens.some(([screen]) => screen === name),
        ),
        "Página desconhecida no filtro do smoke.",
      );
    }
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [name, route] of screens.filter(
        ([name]) =>
          !process.env.AUDIT_PAGES ||
          process.env.AUDIT_PAGES.split(",").includes(name),
      )) {
        scenario = `${name} em ${width}px`;
        await page.goto(app + route, { waitUntil: "networkidle" });
        assert.equal(new URL(page.url()).pathname, route);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await capture(page, `${name}-${width}`);
        checks.push(scenario);
      }
    }
    scenario = "aliases, IDs e parâmetros";
    for (const [old, canonical] of [
      ["/home?audit=1#newsletter-title", "/inicio"],
      ["/product-register", "/admin/produtos/novo"],
      ["/image-upload/2?q=sku", "/admin/produtos/2/imagens"],
      ["/admin/products/2/images?q=sku", "/admin/produtos/2/imagens"],
      ["/admin/products/2/variants", "/admin/produtos/2/variacoes"],
      ["/admin/customers/2?tab=orders", "/admin/clientes/2"],
      ["/admin/metrics?period=7d", "/admin/dashboard"],
    ]) {
      await page.goto(app + old, { waitUntil: "networkidle" });
      const actual = new URL(page.url());
      const previous = new URL(app + old);
      assert.equal(actual.pathname, canonical);
      assert.equal(actual.search, previous.search);
      assert.equal(actual.hash, previous.hash);
    }
    checks.push(scenario);
    scenario = "menu mobile por teclado";
    await page.goto(`${app}/admin/produtos`, { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 390, height: 1000 });
    const menu = page.getByRole("button", { name: "Abrir menu", exact: true });
    await menu.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("link", { name: "Dashboard", exact: true })
      .waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    assert(
      await menu.evaluate((element) => element === document.activeElement),
    );
    checks.push(scenario);
    scenario = "falha HTTP e recuperação";
    injectingFailure = true;
    const products = "http://localhost:8080/admin/products?*";
    await page.route(products, (route) =>
      route.fulfill({
        status: 503,
        json: {
          message: "Não foi possível consultar os produtos. Tente novamente.",
        },
      }),
    );
    await page.reload({ waitUntil: "networkidle" });
    await page
      .getByRole("heading", {
        name: "Não foi possível carregar a listagem",
        exact: true,
      })
      .waitFor();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await capture(page, `products-error-${width}`);
    }
    await page.unroute(products);
    await page
      .getByRole("button", { name: "Tentar novamente", exact: true })
      .click();
    await page.locator(".table-wrap").waitFor();
    injectingFailure = false;
    checks.push(scenario);
    assert.equal(
      errors.length,
      0,
      "Erro de console ou JavaScript durante o smoke.",
    );
    console.log(
      JSON.stringify(
        {
          approved: checks.length,
          javascriptOrConsoleErrors: errors.length,
          output,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch(() => {
  console.error(
    `Falha no cenário: ${scenario}. Nenhum dado do principal deve ser utilizado neste teste.`,
  );
  process.exitCode = 1;
});
