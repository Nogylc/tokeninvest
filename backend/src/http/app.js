// CAMADA HTTP: rotas REST (JSON). Só traduz HTTP <-> serviços; nenhuma regra de negócio aqui.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { validarJwt } = require("../seguranca/tokens");
const { ErroDominio } = require("../domain/consentimento");

function criarApp({ servicos, bancoRouter, origemFrontend }) {
  const { auth, openFinance, investimentos, privacidade } = servicos;
  const app = express();

  // Site (frontend) já compilado: em produção o próprio backend entrega as telas
  const pastaSite = path.join(__dirname, "..", "..", "..", "frontend", "dist");
  const indexHtml = path.join(pastaSite, "index.html");
  const temSite = fs.existsSync(indexHtml);

  // CSP: libera só o que o site usa. O script inline do index.html (tema claro/escuro)
  // é liberado pelo hash exato dele, sem precisar de 'unsafe-inline'.
  const hashesScripts = [];
  if (temSite) {
    const html = fs.readFileSync(indexHtml, "utf8");
    for (const [, codigo] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      hashesScripts.push(`'sha256-${crypto.createHash("sha256").update(codigo).digest("base64")}'`);
    }
  }
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'", ...hashesScripts],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
          "img-src": ["'self'", "data:"],
        },
      },
    })
  ); // cabeçalhos de segurança HTTP
  app.use(cors({ origin: origemFrontend })); // só o nosso frontend pode chamar a API
  app.use(express.json({ limit: "20kb" }));

  // Middleware de autenticação: exige "Authorization: Bearer <JWT>"
  function autenticado(req, res, next) {
    const [tipo, token] = (req.headers.authorization || "").split(" ");
    if (tipo !== "Bearer" || !token) return res.status(401).json({ erro: "Token ausente." });
    try {
      req.usuarioId = validarJwt(token).sub;
      next();
    } catch {
      res.status(401).json({ erro: "Sessão expirada ou token inválido. Faça login novamente." });
    }
  }

  // Envolve handlers async e padroniza a resposta JSON
  const rota = (fn, status = 200) => async (req, res, next) => {
    try {
      const r = await fn(req);
      if (status === 204) res.status(204).end(); else res.status(status).json(r);
    } catch (e) {
      next(e);
    }
  };

  // ---------- Saúde ----------
  app.get("/api/saude", (req, res) => res.json({ status: "ok" }));

  // ---------- Autenticação ----------
  app.post("/api/auth/cadastro", rota((req) => auth.cadastrar(req.body), 201));
  app.post("/api/auth/login", rota((req) => auth.login(req.body)));
  app.get("/api/auth/eu", autenticado, rota((req) => auth.perfil(req.usuarioId)));

  // ---------- Open Finance ----------
  app.get("/api/open-finance/permissoes", rota(() => openFinance.permissoes));
  app.get("/api/open-finance/consentimentos", autenticado, rota((req) => openFinance.listar(req.usuarioId)));
  app.post("/api/open-finance/consentimentos", autenticado, rota((req) => openFinance.iniciar(req.usuarioId, req.body), 201));
  app.post("/api/open-finance/retorno", autenticado, rota((req) => openFinance.retorno(req.usuarioId, req.body)));
  app.post("/api/open-finance/consentimentos/:id/confirmar", autenticado, rota((req) => openFinance.confirmar(req.usuarioId, req.params.id)));
  app.delete("/api/open-finance/consentimentos/:id", autenticado, rota((req) => openFinance.revogar(req.usuarioId, req.params.id)));
  app.get("/api/open-finance/saldo", autenticado, rota((req) => openFinance.saldoBancario(req.usuarioId)));

  // ---------- Carteira DREX e ativos tokenizados ----------
  app.get("/api/carteira", autenticado, rota((req) => investimentos.resumo(req.usuarioId)));
  app.post("/api/carteira/depositar", autenticado, rota((req) => investimentos.depositar(req.usuarioId, req.body.valor)));
  app.post("/api/carteira/resgatar", autenticado, rota((req) => investimentos.resgatar(req.usuarioId, req.body.valor)));
  app.get("/api/ativos", autenticado, rota((req) => investimentos.listarAtivos(req.usuarioId)));
  app.post("/api/ativos/:id/comprar", autenticado, rota((req) => investimentos.comprar(req.usuarioId, req.params.id, req.body.quantidade)));
  app.post("/api/ativos/:id/vender", autenticado, rota((req) => investimentos.vender(req.usuarioId, req.params.id, req.body.quantidade)));

  // ---------- Privacidade (LGPD) ----------
  app.get("/api/privacidade/meus-dados", autenticado, rota((req) => privacidade.meusDados(req.usuarioId)));
  app.delete("/api/privacidade/conta", autenticado, rota((req) => privacidade.excluirConta(req.usuarioId)));

  // ---------- Banco simulado (outra instituição) ----------
  app.use("/banco-simulado/api", bancoRouter);

  // Rota de API inexistente: sempre JSON
  app.use(["/api", "/banco-simulado/api"], (req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

  // Site: arquivos estáticos + fallback de SPA (React Router cuida das rotas no navegador)
  if (temSite) {
    app.use(express.static(pastaSite, { index: false, maxAge: "1h" }));
    app.get("*", (req, res) => res.sendFile(indexHtml));
  }

  app.use((req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

  // Tratamento central de erros: nunca devolve stack trace nem dados sensíveis
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ErroDominio) return res.status(err.status).json({ erro: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido." });
    console.error("[erro interno]", err.message);
    res.status(500).json({ erro: "Erro interno. Tente novamente." });
  });

  return app;
}

module.exports = { criarApp };
