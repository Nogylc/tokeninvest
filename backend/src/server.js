// Ponto de entrada: monta as peças (injeção de dependências) e sobe o servidor.
//
// Ordem de inicialização (importa, porque uma etapa depende da anterior):
//   1. abre o banco de dados (SQLite / sql.js)
//   2. carrega ou gera os segredos fixos (JWT, DATA_KEY, client_secret do banco)
//   3. cria os repositórios
//   4. sobe a blockchain local e REEXECUTA o diário de operações
//   5. monta o banco simulado e os serviços
//   6. sobe o Express
const path = require("path");
const config = require("./config");
const catalogo = require("./catalogoAtivos");
const { abrirBancoDeDados } = require("./infra/bancoDeDados");
const { carregarSegredos } = require("./infra/segredos");
const { criarRepositorios } = require("./infra/repositorios");
const { criarBlockchainGateway } = require("./infra/blockchainGateway");
const { criarClienteOpenFinance } = require("./infra/clienteOpenFinance");
const { criarBancoSimulado } = require("./bancoSimulado");
const { decifrar } = require("./seguranca/criptografia");
const { criarAuthService } = require("./services/authService");
const { criarOpenFinanceService } = require("./services/openFinanceService");
const { criarInvestimentoService } = require("./services/investimentoService");
const { criarPrivacidadeService } = require("./services/privacidadeService");
const { criarApp } = require("./http/app");

async function iniciar({ porta = config.porta, caminhoBanco = config.caminhoBanco } = {}) {
  // 1 e 2. Banco de dados e segredos
  const bancoDeDados = await abrirBancoDeDados(caminhoBanco);
  carregarSegredos(config, path.join(path.dirname(caminhoBanco), "segredos.json"));
  console.log(`💾 Banco de dados: ${caminhoBanco}`);

  // 3. Repositórios
  const repos = criarRepositorios(bancoDeDados);

  // 4. Blockchain + diário
  console.log("⛓  Iniciando blockchain local e publicando contratos...");
  const blockchain = await criarBlockchainGateway(catalogo, {
    diario: repos.operacoesBlockchain,
    // Na reexecução, a chave privada vem do usuário dono do endereço (cifrada no banco)
    chavePrivadaDe: (endereco) => {
      const u = repos.usuarios.porEnderecoCarteira(endereco);
      return u?.carteira?.chaveCifrada ? decifrar(u.carteira.chaveCifrada) : null;
    },
  });
  const rede = await blockchain.infoRede();
  console.log(`   DREX simulado em ${rede.contratoDrex} (chainId ${rede.chainId})`);
  const r = await blockchain.restaurarDoDiario();
  console.log(
    `   Blockchain restaurada: ${r.reexecutadas} operações reexecutadas` +
      (r.ignoradas ? `, ${r.ignoradas} ignoradas` : "") +
      (r.falhas ? `, ${r.falhas} com falha` : "")
  );

  // 5. Banco simulado e serviços
  // Credenciais do TokenInvest cadastradas no banco (client_id / client_secret do OAuth2)
  const clientSecret = config.clientSecretBanco;
  const bancoRouter = criarBancoSimulado({
    bancoDeDados,
    clientes: {
      [config.clientIdOpenFinance]: {
        nome: "TokenInvest",
        secret: clientSecret,
        redirectUris: [`${config.origemFrontend}/open-finance/retorno`],
      },
    },
  });
  const banco = criarClienteOpenFinance({
    urlBanco: process.env.BANCO_URL || `http://127.0.0.1:${porta}/banco-simulado/api`,
    clientId: config.clientIdOpenFinance,
    clientSecret,
  });

  const auth = criarAuthService({ repos, blockchain });
  const openFinance = criarOpenFinanceService({ repos, banco, urlFrontend: config.origemFrontend });
  const investimentos = criarInvestimentoService({ repos, blockchain, openFinance, banco });
  const privacidade = criarPrivacidadeService({ repos, blockchain, openFinance });

  // 6. HTTP
  const app = criarApp({ servicos: { auth, openFinance, investimentos, privacidade }, bancoRouter, origemFrontend: config.origemFrontend });
  return new Promise((resolve) => {
    const servidor = app.listen(porta, () => {
      console.log(`🚀 API TokenInvest rodando em http://localhost:${porta}`);
      resolve(servidor);
    });
    servidor.on("close", () => bancoDeDados.fechar());
  });
}

if (require.main === module) iniciar();

module.exports = { iniciar };
