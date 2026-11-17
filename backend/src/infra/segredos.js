// INFRA: segredos fixos entre reinícios.
//
// Com persistência, os segredos NÃO podem mudar a cada execução: o CPF e as chaves
// das carteiras são cifrados com DATA_KEY, os JWTs são assinados com JWT_SECRET e o
// banco simulado reconhece o TokenInvest pelo client_secret.
//
// Regra: se a variável de ambiente existir, ela manda. Se não existir, o segredo é
// gerado UMA vez e guardado em backend/data/segredos.json (ao lado do .db, mas fora
// dele: assim quem abre o banco não vê a chave que decifra os dados).
// Em produção, estes valores devem vir de variáveis de ambiente ou de um cofre (KMS).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const NOMES = {
  jwtSegredo: "JWT_SECRET",
  chaveCriptografia: "DATA_KEY",
  clientSecretBanco: "BANCO_CLIENT_SECRET",
};

function carregarSegredos(config, caminhoArquivo) {
  let salvos = {};
  if (fs.existsSync(caminhoArquivo)) {
    try { salvos = JSON.parse(fs.readFileSync(caminhoArquivo, "utf8")); } catch { salvos = {}; }
  }

  let mudou = false;
  for (const [campo, variavel] of Object.entries(NOMES)) {
    if (process.env[variavel]) {
      config[campo] = process.env[variavel];
    } else if (salvos[variavel]) {
      config[campo] = salvos[variavel];
    } else {
      config[campo] = crypto.randomBytes(32).toString("hex");
      salvos[variavel] = config[campo];
      mudou = true;
    }
  }

  if (mudou) {
    fs.mkdirSync(path.dirname(caminhoArquivo), { recursive: true });
    const temporario = `${caminhoArquivo}.tmp`;
    fs.writeFileSync(temporario, JSON.stringify(salvos, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(temporario, caminhoArquivo);
  }
  return config;
}

module.exports = { carregarSegredos };
