// Teste de PERSISTÊNCIA: sobe o servidor, usa o sistema, DERRUBA o processo e sobe
// de novo com o mesmo banco. Tudo (cadastro, consentimento, saldo do banco, DREX,
// cotas) precisa estar como ficou, e a blockchain precisa aceitar novas operações.
//
// O servidor roda como PROCESSO FILHO porque a rede Hardhat em memória não pode ser
// reiniciada duas vezes dentro do mesmo processo.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");

const PORTA = 3098;
const API = `http://127.0.0.1:${PORTA}`;
const PASTA_TMP = fs.mkdtempSync(path.join(os.tmpdir(), "tokeninvest-persistencia-"));
const DB_PATH = path.join(PASTA_TMP, "teste.db");
const SERVER_JS = path.join(__dirname, "..", "src", "server.js");

const CPF = "52998224725";
const CONTA = { nome: "Bia Persistente", email: "bia@teste.com", cpf: "529.982.247-25", senha: "senha12345", aceiteTermos: true };

let servidor; // processo filho
let saida = ""; // stdout/stderr do filho (para conferir a mensagem de restauração)
let token;

async function chamar(metodo, caminho, corpo, tk = token) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, corpo: r.status === 204 ? null : await r.json() };
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function subirServidor() {
  saida = "";
  servidor = spawn(process.execPath, [SERVER_JS], {
    env: { ...process.env, PORT: String(PORTA), DB_PATH },
    stdio: ["ignore", "pipe", "pipe"],
  });
  servidor.stdout.on("data", (d) => { saida += d; });
  servidor.stderr.on("data", (d) => { saida += d; });
  const limite = Date.now() + 90000;
  while (Date.now() < limite) {
    if ((servidor.exitCode !== null || servidor.signalCode !== null)) throw new Error("Servidor terminou antes de ficar pronto:\n" + saida);
    try {
      const r = await fetch(`${API}/api/saude`);
      if (r.ok) return;
    } catch { /* ainda subindo */ }
    await espera(300);
  }
  throw new Error("Servidor não ficou pronto a tempo:\n" + saida);
}

function derrubarServidor() {
  return new Promise((resolve) => {
    if (!servidor || (servidor.exitCode !== null || servidor.signalCode !== null)) return resolve();
    servidor.once("exit", () => resolve());
    servidor.kill();
  });
}

before(async () => { await subirServidor(); });
after(async () => {
  await derrubarServidor();
  fs.rmSync(PASTA_TMP, { recursive: true, force: true });
});

test("1ª execução: cadastro, Open Finance, depósito de R$ 500 e compra de 10 cotas", async () => {
  const cad = await chamar("POST", "/api/auth/cadastro", CONTA);
  assert.equal(cad.status, 201);
  token = cad.corpo.token;

  // Fluxo Open Finance completo
  const ini = await chamar("POST", "/api/open-finance/consentimentos", { permissoes: ["CONTAS_SALDO", "PAGAMENTOS_PIX"], prazoDias: 90 });
  assert.equal(ini.status, 201);
  const p = Object.fromEntries(new URL(ini.corpo.urlAutorizacao).searchParams);
  const banco = await chamar("POST", "/banco-simulado/api/autorizar", {
    consentId: p.consent_id, cpf: CPF, senha: "banco123", aprovar: true,
    redirect_uri: p.redirect_uri, state: p.state, code_challenge: p.code_challenge,
  }, null);
  assert.equal(banco.status, 200);
  const volta = new URL(banco.corpo.redirectUrl);
  const ret = await chamar("POST", "/api/open-finance/retorno", { code: volta.searchParams.get("code"), state: volta.searchParams.get("state") });
  assert.equal(ret.corpo.status, "AUTORIZADO");
  const conf = await chamar("POST", `/api/open-finance/consentimentos/${ret.corpo.id}/confirmar`);
  assert.equal(conf.corpo.status, "ATIVO");

  // Depósito de R$ 500 e compra de 10 cotas do CDB (R$ 10 cada)
  const dep = await chamar("POST", "/api/carteira/depositar", { valor: 500 });
  assert.equal(dep.status, 200);
  const compra = await chamar("POST", "/api/ativos/cdb-rio-2027/comprar", { quantidade: 10 });
  assert.equal(compra.status, 200);

  const c = await chamar("GET", "/api/carteira");
  assert.equal(c.corpo.saldoDrexCentavos, 40000);
  assert.equal(c.corpo.ativos[0].minhasCotas, 10);
  assert.equal((await chamar("GET", "/api/open-finance/saldo")).corpo.saldoCentavos, 450000);
  assert.ok(fs.existsSync(DB_PATH), "o arquivo do banco deve existir");
});

test("reinício: servidor cai e sobe de novo com o mesmo banco", async () => {
  await derrubarServidor();
  assert.ok(servidor.exitCode !== null || servidor.signalCode !== null, "o processo deveria ter terminado");
  await subirServidor();
  assert.match(saida, /Blockchain restaurada: \d+ operações reexecutadas/);
  const n = Number(saida.match(/Blockchain restaurada: (\d+)/)[1]);
  assert.ok(n >= 3, `esperava pelo menos CRIAR_CARTEIRA, EMITIR e COMPRAR no diário, veio ${n}`);
  assert.doesNotMatch(saida, /com falha/);
});

test("2ª execução: login funciona e os dados estão como ficaram", async () => {
  const login = await chamar("POST", "/api/auth/login", { email: CONTA.email, senha: CONTA.senha }, null);
  assert.equal(login.status, 200);
  token = login.corpo.token;
  assert.match(login.corpo.usuario.cpf, /^\*\*\*\.982\.247-\*\*$/);

  // O JWT antigo também continua válido (segredo fixo entre execuções)
  const eu = await chamar("GET", "/api/auth/eu");
  assert.equal(eu.status, 200);

  const lista = await chamar("GET", "/api/open-finance/consentimentos");
  assert.ok(lista.corpo.some((c) => c.status === "ATIVO"), "o consentimento deve continuar ATIVO");

  assert.equal((await chamar("GET", "/api/open-finance/saldo")).corpo.saldoCentavos, 450000, "saldo do banco simulado");

  const c = await chamar("GET", "/api/carteira");
  assert.equal(c.corpo.saldoDrexCentavos, 40000, "saldo em DREX");
  assert.equal(c.corpo.ativos.length, 1);
  assert.equal(c.corpo.ativos[0].id, "cdb-rio-2027");
  assert.equal(c.corpo.ativos[0].minhasCotas, 10, "as 10 cotas continuam lá");
  assert.ok(c.corpo.extrato.some((e) => e.tipo === "DEPOSITO_DREX"), "extrato reconstruído da blockchain");
  assert.ok(c.corpo.extrato.some((e) => e.tipo === "COMPRA"));

  // O CPF fica cifrado no arquivo do banco (LGPD)
  const arquivo = fs.readFileSync(DB_PATH, "latin1");
  assert.ok(!arquivo.includes(CPF), "o CPF em texto puro não pode aparecer no .db");
});

test("depois do reinício ainda dá para vender 5 cotas (blockchain consistente)", async () => {
  const venda = await chamar("POST", "/api/ativos/cdb-rio-2027/vender", { quantidade: 5 });
  assert.equal(venda.status, 200, JSON.stringify(venda.corpo));
  const c = await chamar("GET", "/api/carteira");
  assert.equal(c.corpo.ativos[0].minhasCotas, 5);
  assert.equal(c.corpo.saldoDrexCentavos, 45000);

  // e também resgatar para o banco (Pix de volta)
  const resgate = await chamar("POST", "/api/carteira/resgatar", { valor: 100 });
  assert.equal(resgate.status, 200, JSON.stringify(resgate.corpo));
  assert.equal((await chamar("GET", "/api/open-finance/saldo")).corpo.saldoCentavos, 460000);
});
