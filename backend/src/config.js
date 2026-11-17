// Configurações de infraestrutura (lidas do ambiente). Nenhuma regra de negócio aqui.
const path = require("path");

const PASTA_DADOS = path.join(__dirname, "..", "data");

module.exports = {
  porta: Number(process.env.PORT || 3001),
  origemFrontend: process.env.FRONTEND_URL || "http://localhost:5173",
  jwtExpiracao: "30m",
  clientIdOpenFinance: "tokeninvest-app",

  // Persistência: arquivo SQLite (sql.js). DB_PATH permite usar outro caminho (ex.: testes).
  caminhoBanco: process.env.DB_PATH || path.join(PASTA_DADOS, "tokeninvest.db"),

  // Segredos: preenchidos no startup por infra/segredos.js (variável de ambiente ou
  // gerados uma vez e guardados em backend/data/segredos.json). Antes disso ficam nulos
  // de propósito: nada deve cifrar ou assinar sem os segredos definitivos.
  jwtSegredo: process.env.JWT_SECRET || null,
  chaveCriptografia: process.env.DATA_KEY || null,
  clientSecretBanco: process.env.BANCO_CLIENT_SECRET || null,
};
