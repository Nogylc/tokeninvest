// INFRA: banco de dados SQLite via sql.js (SQLite compilado para WebAssembly).
// Não depende de binários nativos: funciona igual no Windows, Mac, Linux e Render.
//
// Como funciona:
//  - o arquivo .db é lido para a memória uma vez, no startup;
//  - as consultas são SÍNCRONAS (o sql.js é síncrono depois de inicializado), o que
//    permite manter a interface síncrona dos repositórios;
//  - depois de cada escrita, o banco inteiro é exportado e gravado no disco de forma
//    atômica (escreve num .tmp e renomeia), para o arquivo nunca ficar pela metade.
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    email TEXT,
    cpf_hash TEXT,
    endereco_carteira TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    dados TEXT NOT NULL            -- JSON completo (CPF e chave da carteira cifrados)
  );
  CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);
  CREATE INDEX IF NOT EXISTS idx_usuarios_cpf_hash ON usuarios (cpf_hash);
  CREATE INDEX IF NOT EXISTS idx_usuarios_carteira ON usuarios (endereco_carteira);

  CREATE TABLE IF NOT EXISTS consentimentos (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    banco TEXT,
    status TEXT NOT NULL,
    expira_em TEXT,
    dados TEXT NOT NULL            -- JSON completo (token do banco cifrado)
  );
  CREATE INDEX IF NOT EXISTS idx_consentimentos_usuario ON consentimentos (usuario_id);

  CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    em TEXT NOT NULL,
    usuario_id TEXT NOT NULL,
    acao TEXT NOT NULL,
    detalhe TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria (usuario_id);

  -- Banco simulado (Banco Rio): outra instituição, por isso tabelas separadas
  CREATE TABLE IF NOT EXISTS banco_contas (
    cpf_hash TEXT PRIMARY KEY,
    saldo INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS banco_consentimentos (
    id TEXT PRIMARY KEY,
    cpf_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    expira_em TEXT,
    dados TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS banco_tokens (
    token TEXT PRIMARY KEY,
    consent_id TEXT NOT NULL,
    expira INTEGER NOT NULL
  );

  -- Diário de operações da blockchain (event sourcing): reexecutado no startup
  CREATE TABLE IF NOT EXISTS operacoes_blockchain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    em TEXT NOT NULL,
    tipo TEXT NOT NULL,
    endereco TEXT,
    dados TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS configuracao (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );
`;

async function abrirBancoDeDados(caminho) {
  const SQL = await initSqlJs();
  fs.mkdirSync(path.dirname(caminho), { recursive: true });

  const existente = fs.existsSync(caminho) ? fs.readFileSync(caminho) : null;
  const db = existente && existente.length > 0 ? new SQL.Database(existente) : new SQL.Database();
  db.exec(ESQUEMA);

  let salvamentosSuspensos = 0;

  /** Grava o banco no disco de forma atômica. */
  function salvar() {
    const dados = Buffer.from(db.export());
    const temporario = `${caminho}.tmp`;
    fs.writeFileSync(temporario, dados);
    fs.renameSync(temporario, caminho);
  }

  /** SELECT: devolve um array de objetos (uma linha = um objeto). */
  function consultar(sql, params = []) {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const linhas = [];
      while (stmt.step()) linhas.push(stmt.getAsObject());
      return linhas;
    } finally {
      stmt.free();
    }
  }

  const primeiro = (sql, params) => consultar(sql, params)[0] || null;

  /** INSERT/UPDATE/DELETE: executa e persiste no disco. */
  function executar(sql, params = []) {
    db.run(sql, params);
    if (salvamentosSuspensos === 0) salvar();
  }

  /** Várias escritas com um único salvamento no final. */
  function emLote(fn) {
    salvamentosSuspensos += 1;
    try {
      return fn();
    } finally {
      salvamentosSuspensos -= 1;
      if (salvamentosSuspensos === 0) salvar();
    }
  }

  function fechar() {
    salvar();
    db.close();
  }

  if (!primeiro("SELECT valor FROM configuracao WHERE chave = 'criado_em'")) {
    db.run("INSERT INTO configuracao (chave, valor) VALUES ('criado_em', ?)", [new Date().toISOString()]);
    db.run("INSERT OR REPLACE INTO configuracao (chave, valor) VALUES ('versao_esquema', '1')");
  }
  salvar(); // garante que o arquivo exista já com o esquema

  return { caminho, consultar, primeiro, executar, emLote, fechar };
}

module.exports = { abrirBancoDeDados };
