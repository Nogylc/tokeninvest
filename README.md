# ◆ TokenInvest

**MVP de investimentos tokenizados com Open Finance e DREX simulado**
Disciplina: Tecnologia Bancária (ECP6NA) · AP1 – 2º Bimestre

**Aplicação publicada:** https://tokeninvest.onrender.com  
**Conta de demonstração:** `demo@tokeninvest.com.br` / `Demo@2026` (Banco Rio simulado: senha `banco123`)

---

## 1. Informações do projeto

### O problema
O sistema financeiro tradicional ainda dificulta o acesso a investimentos para o pequeno investidor:

- **Ticket mínimo alto**: muitos produtos (imóveis, recebíveis, alguns CDBs) exigem valores altos para entrar.
- **Liquidez lenta**: resgates dependem de D+1, D+2 ou mais, e de **horário comercial**.
- **Processos fragmentados e centralizados**: o cliente precisa transferir dinheiro manualmente entre bancos e plataformas, com cadastros repetidos e muita fricção.

### A solução
O **TokenInvest** é uma plataforma em que o investidor:

1. **Conecta a conta bancária via Open Finance** (consentimento → autenticação no banco → confirmação);
2. **Converte reais em DREX** (Real Digital simulado, `dBRL`) por meio de um Pix iniciado pelo Open Finance;
3. **Compra frações (cotas) de ativos reais tokenizados** a partir de **R$ 10,00**: um CDB, recebíveis do agro e a fração de um imóvel;
4. **Vende as cotas a qualquer hora (24/7)** e recebe dBRL na hora (**liquidez imediata**), podendo resgatar de volta para a conta bancária.

Tudo que envolve titularidade e transações fica registrado em um **livro-razão distribuído (DLT)** por meio de **contratos inteligentes**.

### Conceitos aplicados

| Conceito | Onde aparece no sistema |
|---|---|
| **Open Finance** | Fluxo completo de Consentimento, Autenticação (no banco transmissor) e Confirmação, com OAuth2 Authorization Code + PKCE. Permissões específicas (`CONTAS_SALDO`, `PAGAMENTOS_PIX`) e prazo determinado. |
| **DREX** | Contrato `DrexSimulado` (`dBRL`): token que representa o Real Digital. Só o emissor (papel de instituição liquidante) cria e destrói tokens. |
| **Tokenização de ativos** | Contrato `AtivoTokenizado`: cada ativo real é dividido em cotas registradas on-chain, com compra e venda liquidadas em dBRL. |
| **Sandbox Regulatório** | Regras no contrato: só investidores **habilitados (KYC)** operam, há **limite de cotas por investidor**, limite de R$ 10.000 por depósito e um **botão de pausa** de emergência. |
| **LGPD** | Privacidade por design: CPF criptografado (AES-256-GCM), dados mascarados, nenhum dado pessoal na blockchain, exportação de dados, revogação de consentimento e exclusão da conta. |
| **APIs RESTful + JWT** | Backend Express com rotas JSON protegidas por JWT; frontend React consome a API por uma camada de integração isolada. |

---

## 2. Equipe e papéis

| Integrante | Papel | Responsabilidades |
|---|---|---|
| **Jhenifer de Andrade** | Analista de Ecossistema | Modelou a solução dentro das regras do Sandbox Regulatório; mapeou a lógica de negócio (domínio) e as integrações com o ecossistema Open Finance; organizou o planejamento das fases. |
| **Camily Vitória** | Guardian de Dados | Implementou e auditou os fluxos de consentimento, autenticação e confirmação; garantiu a aderência à LGPD (criptografia, mascaramento, direitos do titular, auditoria). |
| **Gabriel Silva** | Arquiteto Blockchain | Projetou e escreveu os contratos inteligentes (`DrexSimulado` e `AtivoTokenizado`), os testes dos contratos e a integração com a DLT. |
| **Vitor Costa** | Integrador de Sistemas (Frontend) | Construiu o frontend React, a camada de integração com a API REST (JWT) e o gerenciamento de estado das telas. |

---

## 3. Planejamento e execução

A equipe seguiu a metodologia PBL proposta no guia, começando pela **lógica de negócio e pelos contratos** e deixando a interface por último.

| Fase | Objetivo | O que foi entregue | Responsável principal |
|---|---|---|---|
| **1. Ecossistema e Inovação** | Entender Open Finance e Sandbox | Mapeamento das etapas Consentimento → Autenticação → Confirmação; máquina de estados do consentimento (`backend/src/domain/consentimento.js`); regras do Sandbox (KYC, limites, pausa). | Jhenifer |
| **2. Segurança e Leis** | LGPD e gestão de identidade | Criptografia de dados em repouso, JWT, PKCE + state, mascaramento, auditoria e direitos do titular (`backend/src/seguranca`, `services/privacidadeService.js`). | Camily |
| **3. Blockchain e DLTs** | Contratos de tokenização | `DrexSimulado.sol`, `AtivoTokenizado.sol` e 8 testes automatizados (`blockchain/`). | Gabriel |
| **4. Integração na prática** | API REST + frontend | API Express (JSON + JWT), banco simulado com OAuth2, frontend React consumindo a API (`frontend/`). | Vitor |

Organização: as tarefas ficaram num quadro com as 4 fases, e cada integrante trabalhou na sua camada. A ordem das fases reduziu o retrabalho, porque a interface foi construída em cima de regras já testadas.

---

## 4. Arquitetura e decisões de projeto

### 4.1 Visão geral

```
┌────────────────────┐   REST/JSON + JWT   ┌──────────────────────────────────────────┐
│  Frontend (React)  │ ──────────────────► │              Backend (Express)            │
│  paginas/  (telas) │                     │  http/        rotas e middleware JWT      │
│  api/cliente.js    │                     │  services/    casos de uso (aplicação)    │
│  dominio/formatar  │                     │  domain/      REGRAS DE NEGÓCIO (puras)   │
└─────────┬──────────┘                     │  seguranca/   AES-GCM, JWT, PKCE          │
          │ redirect (OAuth2)              │  infra/       repositórios, gateway DLT,  │
          ▼                                │               cliente Open Finance        │
┌────────────────────┐   REST/JSON OAuth2  └───────────┬──────────────────┬──────────┘
│ Banco Rio simulado │ ◄────────────────────────────────┘                  │ ethers.js
│ (instituição       │                                                     ▼
│  transmissora)     │                                   ┌───────────────────────────────┐
└────────────────────┘                                   │ DLT (Hardhat Network / EVM)   │
                                                         │  DrexSimulado (dBRL)          │
                                                         │  AtivoTokenizado (x3)         │
                                                         └───────────────────────────────┘
```

**Isolamento das camadas.** O guia pede que as regras da aplicação fiquem separadas da infraestrutura. Por isso:

- `backend/src/domain/` tem **só funções puras** (consentimento, valores, cadastro). Não importa Express, ethers nem banco de dados, e dá para testar sem subir nada.
- `backend/src/infra/` concentra tudo que é "externo": banco de dados (SQLite), blockchain e chamadas HTTP ao banco. Trocar o SQLite por um PostgreSQL, ou a rede Hardhat por uma rede DREX real, mexe só nessa pasta.
- `backend/src/http/` só traduz HTTP ↔ serviços.
- No frontend, as telas (`paginas/`) **nunca chamam `fetch` direto**: usam `api/cliente.js`.
- A DLT sobe dentro do próprio processo (Hardhat Network), e a compilação usa o `solc` em JavaScript. A equipe não precisa configurar nós, carteiras ou pipelines para rodar o MVP.

### 4.2 Contratos inteligentes (descentralização e DLT)

**`DrexSimulado.sol`**: token no padrão ERC-20 que representa o Real Digital (`dBRL`, 2 casas decimais = centavos).
- `emitir` / `resgatar`: só o **emissor** chama (papel de instituição liquidante). Representam reais entrando e saindo do ecossistema.
- `transfer`, `approve` e `transferFrom` seguem o padrão ERC-20, o que garante interoperabilidade.

**`AtivoTokenizado.sol`**: um contrato por ativo real.
- Guarda `totalCotas`, `precoCota`, `limitePorInvestidor` (todos `immutable`, ou seja, ninguém altera depois da publicação) e `cotasDe[endereço]` (a **titularidade on-chain**).
- `comprar(qtd)`: confere o KYC, a pausa e o limite do Sandbox, debita o dBRL do investidor (`transferFrom`) e registra as cotas.
- `vender(qtd)`: devolve as cotas e paga o dBRL **na hora**, usando a reserva do próprio contrato (liquidez 24/7).
- Os eventos `Compra` e `Venda` formam o **extrato imutável** que o app lê para mostrar o histórico.

**Atomicidade.** Se qualquer etapa da compra falhar (por exemplo, dBRL insuficiente), a transação inteira é revertida: o investidor não fica sem dinheiro e sem cotas ao mesmo tempo. O teste 8 (`blockchain/test/contratos.test.js`) prova isso.

**Carteiras custodiadas.** Cada usuário recebe uma carteira gerada no cadastro. A chave privada fica **criptografada (AES-256-GCM)** no backend, e o usuário não precisa lidar com seed phrase. Esse é o modelo usado em pilotos de DREX com instituições custodiantes.

### 4.3 Segurança, LGPD e autenticação

**Fluxo Open Finance implementado:**

```
1. CONSENTIMENTO   Usuário escolhe permissões + prazo (1 a 365 dias)
                   → backend cria o consentimento no banco (client_id/secret)
                   → gera state (anti-CSRF) e PKCE (code_challenge S256)
2. AUTENTICAÇÃO    Usuário é REDIRECIONADO ao Banco Rio e faz login LÁ
                   (o TokenInvest nunca vê a senha do banco)
                   → banco devolve um authorization code de uso único (2 min)
3. CONFIRMAÇÃO     Backend troca code + code_verifier por access_token (OAuth2)
                   → consentimento fica AUTORIZADO, mas só vira ATIVO
                     depois que o usuário CONFIRMA explicitamente no app
                     (requisito anti-fraude de redirecionamento)
```

Estados: `AGUARDANDO_AUTORIZACAO → AUTORIZADO → ATIVO → (REVOGADO | EXPIRADO)`, ou `REJEITADO`.
Cada uso (ler o saldo, fazer o Pix) passa por `exigirPermissao()`, que confere o status, o prazo e se a permissão foi concedida.

**Decisões de segurança:**

| Decisão | Por quê |
|---|---|
| **JWT (HS256, 30 min)** em `Authorization: Bearer` em todas as rotas privadas | Sessão sem estado no servidor; o token expira rápido. |
| Payload do JWT **sem dados pessoais** (só `sub`) | Um JWT pode ser decodificado por qualquer um. |
| **OAuth2 Authorization Code + PKCE + state** | Padrão do Open Finance Brasil (FAPI); impede interceptação do code e CSRF. |
| Senhas com **bcrypt** | Hash lento, resistente a força bruta. |
| **Bloqueio após 5 logins errados** e mensagem de erro genérica | Evita força bruta e enumeração de e-mails. |
| **CPF e chave da carteira com AES-256-GCM**; busca por HMAC | Proteção em repouso; o CPF nunca fica em texto puro. |
| **Nenhum dado pessoal on-chain** | A blockchain é imutável e o direito de eliminação da LGPD não funcionaria lá. Na cadeia ficam só endereço e valores (pseudonimização). |
| CPF **mascarado** nas telas e nas respostas (`***.982.247-**`) | Minimização de dados. |
| `helmet`, CORS restrito ao frontend e limite de 20 kb no corpo | Cabeçalhos seguros e menos superfície de ataque. |
| Erros tratados de forma central, **sem stack trace** | Não vaza informação interna. |
| **Trilha de auditoria** (quem, o quê, quando, sem dados pessoais) | Prestação de contas (art. 37 da LGPD). |

**Direitos do titular (LGPD, art. 18)** na tela *Privacidade*:
- acesso e portabilidade: baixar todos os dados em JSON;
- revogação do consentimento Open Finance a qualquer momento;
- eliminação da conta, que anonimiza os dados pessoais.

Em trânsito, a produção usaria HTTPS/TLS (no MVP local, roda em HTTP).

### 4.4 Integração das APIs REST com o frontend

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/cadastro` | Cria a conta (valida CPF, exige aceite da política) e devolve o JWT |
| POST | `/api/auth/login` | Login, devolve o JWT |
| GET | `/api/auth/eu` | Perfil (CPF mascarado) |
| POST | `/api/open-finance/consentimentos` | Etapa 1: cria o consentimento e devolve a URL do banco |
| POST | `/api/open-finance/retorno` | Etapa 2→3: recebe code + state e troca pelo token |
| POST | `/api/open-finance/consentimentos/:id/confirmar` | Etapa 3: confirmação explícita |
| DELETE | `/api/open-finance/consentimentos/:id` | Revoga o consentimento |
| GET | `/api/open-finance/saldo` | Saldo bancário (exige `CONTAS_SALDO`) |
| POST | `/api/carteira/depositar` | Pix → emissão de dBRL (exige `PAGAMENTOS_PIX`) |
| POST | `/api/carteira/resgatar` | Queima do dBRL → Pix |
| GET | `/api/carteira` | Saldo dBRL, cotas e extrato on-chain |
| GET | `/api/ativos` | Ativos tokenizados (lidos dos contratos) |
| POST | `/api/ativos/:id/comprar` / `vender` | Operações na DLT |
| GET | `/api/privacidade/meus-dados` | Exportação LGPD |
| DELETE | `/api/privacidade/conta` | Eliminação/anonimização |

O banco simulado tem a sua própria API em `/banco-simulado/api` (`/consentimentos`, `/autorizar`, `/token`, `/contas/saldo`, `/pix/enviar`, `/pix/receber`). O backend fala com ele **por HTTP**, como faria com um banco real.

No frontend, `src/api/cliente.js` coloca o JWT em toda requisição, converte as respostas JSON e trata o 401 (sessão expirada → volta ao login). As telas só recebem objetos prontos.

### 4.5 Persistência de dados

Nada se perde quando o servidor reinicia: cadastro, consentimentos Open Finance, saldo no Banco Rio, saldo em DREX, cotas e extrato continuam exatamente como estavam. Três "mundos" precisam ficar consistentes entre si, e cada um tem a sua estratégia.

**1. Banco de dados: SQLite com `sql.js`.**
O `sql.js` é o SQLite compilado para WebAssembly. Não depende de binário nativo nem de compilação, por isso roda igual no Windows, Mac, Linux e Render. O arquivo fica em `backend/data/tokeninvest.db` (pasta ignorada pelo git).

| Tabela | O que guarda |
|---|---|
| `usuarios` | cadastro (coluna `email` legível; JSON completo em `dados`, com CPF e chave da carteira **cifrados**) |
| `consentimentos` | consentimentos Open Finance do TokenInvest (status, validade, token do banco cifrado) |
| `auditoria` | trilha LGPD: quem fez o quê e quando, sem dados pessoais |
| `banco_contas`, `banco_consentimentos`, `banco_tokens` | o lado do **Banco Rio** (outra instituição), por isso tabelas separadas |
| `operacoes_blockchain` | diário de operações da DLT (ver item 3) |
| `configuracao` | metadados (data de criação, versão do esquema) |

Como o `sql.js` trabalha em memória, depois de cada escrita o módulo `backend/src/infra/bancoDeDados.js` exporta o banco e grava o arquivo de forma **atômica** (escreve num `.tmp` e renomeia). Assim o arquivo nunca fica pela metade, mesmo que o processo caia no meio. A interface dos repositórios continua **síncrona**, então os serviços e o domínio não mudaram.

**2. Segredos fixos.** O CPF e as chaves das carteiras são cifrados com `DATA_KEY`, os JWTs são assinados com `JWT_SECRET` e o Banco Rio reconhece o TokenInvest pelo `client_secret`. Se esses valores mudassem a cada execução, nada poderia ser decifrado depois do reinício. Regra (`backend/src/infra/segredos.js`): se a variável de ambiente existir, ela manda; se não, o segredo é gerado **uma vez** e guardado em `backend/data/segredos.json`, fora do arquivo `.db`. Em produção, esses valores viriam de variáveis de ambiente ou de um cofre de chaves (KMS/HSM).

**3. Blockchain consistente: diário de operações (event sourcing).**
A rede Hardhat roda em memória e não tem persistência. Em vez de tentar salvar o estado da EVM, o gateway (`backend/src/infra/blockchainGateway.js`) anota, em ordem, **toda operação que altera a cadeia e dá certo** na tabela `operacoes_blockchain`:

| Operação | Dados anotados |
|---|---|
| `CRIAR_CARTEIRA` | endereço (financiamento com ETH + habilitação KYC nos ativos) |
| `EMITIR` / `RESGATAR` | endereço, centavos |
| `COMPRAR` | endereço, ativo, quantidade, custo |
| `VENDER` | endereço, ativo, quantidade |

Operação que falha não entra no diário. No startup, depois de publicar os contratos (publicação **determinística**: mesma conta e mesma ordem geram os mesmos endereços), o servidor reexecuta o diário na mesma ordem, sem anotar de novo, e mostra no console `Blockchain restaurada: N operações reexecutadas`. Para `COMPRAR` e `VENDER` a chave privada vem do usuário dono do endereço, decifrada a partir do banco. A geração do par de chaves acontece só no cadastro; o que vai para o diário é a preparação da carteira na cadeia.

> **Limitação conhecida:** os hashes das transações e os números de bloco mudam depois de um reinício, porque os blocos são recriados. Saldos, cotas e o extrato (quem fez o quê, quanto e em que ordem) continuam iguais. Para hashes permanentes seria preciso uma rede com persistência própria (por exemplo, Hyperledger Besu), conectada por `RPC_URL`.

**Por que o CPF aparece cifrado dentro do banco (LGPD).** Quem abrir o `.db` vê o e-mail e um texto como `G0h1...` no lugar do CPF e da chave da carteira: são dados cifrados com AES-256-GCM, e a chave está no `segredos.json` (ou na variável de ambiente), não na tabela. A busca por CPF usa um HMAC (`cpf_hash`), então nem o backend precisa guardar o CPF em texto puro. O teste `backend/test/persistencia.test.js` confere que o CPF em texto puro não aparece no arquivo.

**Para ver as tabelas na apresentação.** No VS Code, instale a extensão **SQLite Viewer** (Florian Klampfer) e clique em `backend/data/tokeninvest.db`: ela abre cada tabela como uma planilha. Vale mostrar `usuarios` (CPF cifrado), `auditoria` (trilha LGPD) e `operacoes_blockchain` (o diário).

**Para começar do zero:**
```bash
npm run resetar-dados   # apaga backend/data/ (banco + segredos)
```

**Testes.** Os testes de API usam um banco temporário em `os.tmpdir()` (passado por `caminhoBanco` ou pela variável `DB_PATH`), então nunca sujam `backend/data/`. O `persistencia.test.js` sobe o servidor como processo filho, cadastra, faz o fluxo Open Finance, deposita R$ 500 e compra 10 cotas; depois **mata o processo**, sobe de novo com o mesmo banco, faz login e confere consentimento ativo, saldo do banco, saldo em DREX e as 10 cotas. Por fim vende 5 cotas e resgata R$ 100, o que prova que a blockchain ficou consistente.

> **Render (plano grátis):** o disco é temporário e é apagado a cada deploy ou reinício do serviço. Para persistir lá seria preciso um disco pago (Persistent Disk) montado em `backend/data` ou um banco externo (PostgreSQL, por exemplo). Localmente, a persistência funciona sem configuração.

---

## 5. Riscos, problemas enfrentados e viabilidade técnica

### Riscos dos smart contracts e como foram tratados

| Risco | Mitigação no código |
|---|---|
| **Fundos travados por falha lógica** (o contrato é imutável) | Regras simples e testadas (8 testes); reserva de dBRL dentro do contrato garante a recompra; `definirPausa` para emergências. |
| **Reentrância** na venda (envio de tokens antes de atualizar o saldo) | Padrão *checks-effects-interactions* + trava `semReentrancia`. |
| **Overflow / underflow** | Solidity 0.8+ reverte automaticamente. |
| **Controle de acesso** (alguém emitir dBRL ou habilitar a si mesmo) | Modificador `somenteEmissor` e erro customizado `SomenteEmissor` (testado). |
| **Preço/limites alterados depois** | `precoCota`, `totalCotas` e `limitePorInvestidor` são `immutable`. |
| **Inconsistência entre o banco e a blockchain** (Pix sai mas a emissão falha) | Transação de **compensação**: o backend estorna o Pix se a emissão de dBRL falhar (e vice-versa no resgate). |
| **Perda do estado da DLT ao reiniciar** (rede local em memória) | Diário de operações (event sourcing) reexecutado no startup; só operações bem-sucedidas são anotadas (seção 4.5). |
| **Imutabilidade x LGPD** | Nenhum dado pessoal na cadeia; a exclusão quebra o vínculo endereço ↔ pessoa. |

### Outros riscos mapeados
- **Fraude de redirecionamento / phishing no Open Finance**: tratada com a etapa de confirmação explícita, `redirect_uri` cadastrada, `state` de uso único e PKCE.
- **Custódia de chaves**: se o servidor for comprometido, as chaves estão cifradas, mas a chave mestra (`DATA_KEY`) precisaria de um cofre (HSM/KMS) em produção.
- **Regulatório (Sandbox BACEN/CVM)**: tokenização de valores mobiliários exige autorização da CVM; o MVP simula as restrições (KYC, limites, pausa).

### Problemas enfrentados
- Os ambientes da faculdade nem sempre conseguiam **baixar o compilador Solidity**. A solução foi compilar com o pacote `solc` (JavaScript) e rodar a rede Hardhat dentro do processo, sem configuração externa.
- O provedor do `ethers` guardava em cache uma estimativa de gás e repetia um erro antigo depois que o estado do contrato já tinha mudado. A equipe identificou o problema pelos testes e desativou o cache (`cacheTimeout: -1`).
- Equilibrar realismo e escopo: o banco e o DREX são **simulados**, mas seguem as mesmas interfaces (OAuth2, ERC-20) que um ambiente real usaria.

### Viabilidade técnica
O MVP é viável porque:
1. o **domínio é isolado**, então as regras não dependem da infraestrutura;
2. a **DLT roda localmente** com um comando;
3. os dados ficam num **SQLite em arquivo** (`sql.js`), sem servidor de banco para instalar ou configurar.

**Limitações conhecidas (próximos passos):**
- banco de dados externo (PostgreSQL) e rede com persistência própria, para ambientes com vários servidores;
- rede DREX real (Hyperledger Besu) no lugar do Hardhat;
- JWT em cookie `httpOnly` com refresh token;
- precificação dinâmica e distribuição de rendimentos;
- HTTPS e cofre de chaves.

---

## 6. Como rodar

**Pré-requisito:** Node.js 20 ou superior.

```bash
npm install      # instala backend, frontend e blockchain (workspaces)
npm run dev      # compila os contratos, sobe a API (3001) e o site (5173)
```

Abra **http://localhost:5173**.

**Testes automatizados** (8 testes de contrato + 12 testes de API: 8 do fluxo ponta a ponta e 4 de persistência com reinício do servidor):
```bash
npm test
```

### Roteiro de demonstração
1. **Cadastre-se** com um CPF válido (ex.: `529.982.247-25`) e aceite a política.
2. Vá em **Open Finance**, escolha as permissões e o prazo e clique em *Continuar*.
3. No **Banco Rio**, informe o mesmo CPF e a senha `banco123` e clique em *Autorizar*.
4. De volta ao app, **confirme** o consentimento.
5. Em **Início**, deposite R$ 500 (Pix → dBRL). O saldo do banco cai e o dBRL aparece.
6. Em **Investir**, compre cotas. Tente passar do limite do Sandbox para ver o bloqueio.
7. Em **Extrato**, veja os blocos e os hashes das transações.
8. Em **Privacidade**, baixe os seus dados e revogue o consentimento. O depósito passa a ser bloqueado.

> Os dados ficam em `backend/data/` e sobrevivem ao reinício do servidor, inclusive o estado da blockchain local (seção 4.5). Para começar do zero: `npm run resetar-dados`.

---

## 7. Estrutura de pastas

```
tokeninvest/
├── blockchain/            # Arquiteto Blockchain
│   ├── contracts/         # DrexSimulado.sol, AtivoTokenizado.sol
│   ├── scripts/compilar.js
│   ├── test/              # testes dos contratos
│   └── index.js           # sobe a DLT e publica os contratos
├── backend/
│   ├── src/domain/        # regras de negócio puras
│   ├── src/services/      # casos de uso (auth, open finance, investimento, privacidade)
│   ├── src/seguranca/     # AES-GCM, JWT, PKCE
│   ├── src/infra/         # SQLite (sql.js), segredos, repositórios, gateway blockchain
│   │                      # (com diário de operações), cliente Open Finance
│   ├── src/bancoSimulado/ # instituição transmissora simulada
│   ├── src/http/          # rotas REST
│   ├── data/              # tokeninvest.db + segredos.json (gerados; fora do git)
│   └── test/              # testes ponta a ponta da API e de persistência
└── frontend/
    └── src/{api,dominio,paginas,componentes}
```
