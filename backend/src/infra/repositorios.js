// INFRA: repositórios sobre o SQLite (sql.js). A interface é SÍNCRONA, igual à
// versão em memória, então os services não mudam. Cada registro é guardado como
// JSON na coluna "dados", com algumas colunas legíveis (email, status...) para
// consulta e para visualizar o arquivo .db numa apresentação.
function criarRepositorios(bd) {
  const dados = (linha) => (linha ? JSON.parse(linha.dados) : undefined);
  const ouNulo = (v) => (v === undefined ? null : v);

  const sessoesOAuth = new Map(); // state -> { consentimentoId, verifier, usuarioId } (dura poucos minutos)

  return {
    usuarios: {
      salvar: (u) => {
        bd.executar(
          `INSERT INTO usuarios (id, email, cpf_hash, endereco_carteira, ativo, dados)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             email = excluded.email, cpf_hash = excluded.cpf_hash,
             endereco_carteira = excluded.endereco_carteira, ativo = excluded.ativo, dados = excluded.dados`,
          [u.id, ouNulo(u.email), ouNulo(u.cpfHash), ouNulo(u.carteira?.endereco), u.ativo === false ? 0 : 1, JSON.stringify(u)]
        );
        return u;
      },
      porId: (id) => dados(bd.primeiro("SELECT dados FROM usuarios WHERE id = ?", [ouNulo(id)])),
      porEmail: (email) => dados(bd.primeiro("SELECT dados FROM usuarios WHERE email = ?", [ouNulo(email)])),
      porCpfHash: (h) => dados(bd.primeiro("SELECT dados FROM usuarios WHERE cpf_hash = ?", [ouNulo(h)])),
      porEnderecoCarteira: (endereco) =>
        dados(bd.primeiro("SELECT dados FROM usuarios WHERE endereco_carteira = ?", [ouNulo(endereco)])),
    },

    consentimentos: {
      salvar: (c) => {
        bd.executar(
          `INSERT INTO consentimentos (id, usuario_id, banco, status, expira_em, dados)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             usuario_id = excluded.usuario_id, banco = excluded.banco, status = excluded.status,
             expira_em = excluded.expira_em, dados = excluded.dados`,
          [c.id, c.usuarioId, ouNulo(c.banco), c.status, ouNulo(c.expiraEm), JSON.stringify(c)]
        );
        return c;
      },
      porId: (id) => dados(bd.primeiro("SELECT dados FROM consentimentos WHERE id = ?", [ouNulo(id)])),
      // ordem de criação (rowid), igual à ordem de inserção do Map
      doUsuario: (usuarioId) =>
        bd.consultar("SELECT dados FROM consentimentos WHERE usuario_id = ? ORDER BY rowid", [ouNulo(usuarioId)]).map(dados),
      ativoDoUsuario: (usuarioId) =>
        dados(bd.primeiro("SELECT dados FROM consentimentos WHERE usuario_id = ? AND status = 'ATIVO' ORDER BY rowid DESC LIMIT 1", [ouNulo(usuarioId)])),
    },

    sessoesOAuth: {
      salvar: (state, sessao) => sessoesOAuth.set(state, sessao),
      consumir: (state) => {
        const s = sessoesOAuth.get(state);
        sessoesOAuth.delete(state); // uso único
        return s;
      },
    },

    auditoria: {
      // LGPD: registro de QUEM fez O QUÊ e QUANDO, sem dados pessoais
      registrar: (usuarioId, acao, detalhe = "") =>
        bd.executar("INSERT INTO auditoria (em, usuario_id, acao, detalhe) VALUES (?, ?, ?, ?)", [new Date().toISOString(), usuarioId, acao, detalhe]),
      doUsuario: (usuarioId) =>
        bd.consultar("SELECT em, usuario_id AS usuarioId, acao, detalhe FROM auditoria WHERE usuario_id = ? ORDER BY id", [ouNulo(usuarioId)]),
    },

    // Diário de operações da blockchain (event sourcing). Só operações que deram certo.
    operacoesBlockchain: {
      registrar: (tipo, info) =>
        bd.executar("INSERT INTO operacoes_blockchain (em, tipo, endereco, dados) VALUES (?, ?, ?, ?)", [new Date().toISOString(), tipo, ouNulo(info.endereco), JSON.stringify(info)]),
      todas: () =>
        bd.consultar("SELECT id, em, tipo, dados FROM operacoes_blockchain ORDER BY id").map((l) => ({ id: l.id, em: l.em, tipo: l.tipo, ...JSON.parse(l.dados) })),
    },
  };
}

module.exports = { criarRepositorios };
