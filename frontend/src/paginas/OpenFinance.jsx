import { useEffect, useState } from "react";
import { api } from "../api/cliente";
import { data, STATUS_CONSENTIMENTO } from "../dominio/formatar";
import { Aviso, Etapas, Selo } from "../componentes/Layout";

// ETAPA 1 - CONSENTIMENTO: o usuário escolhe o que compartilhar e por quanto tempo.
export default function OpenFinance() {
  const [permissoesDisponiveis, setPermissoesDisponiveis] = useState({});
  const [escolhidas, setEscolhidas] = useState(["CONTAS_SALDO", "PAGAMENTOS_PIX"]);
  const [prazo, setPrazo] = useState(90);
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.permissoes().then(setPermissoesDisponiveis);
    api.consentimentos().then(setLista);
  }, []);

  const alternar = (p) => setEscolhidas(escolhidas.includes(p) ? escolhidas.filter((x) => x !== p) : [...escolhidas, p]);

  async function conectar() {
    setErro("");
    try {
      const { urlAutorizacao } = await api.criarConsentimento(escolhidas, Number(prazo));
      window.location.href = urlAutorizacao; // ETAPA 2: redireciona para o banco
    } catch (e) {
      setErro(e.message);
    }
  }

  const ativo = lista.find((c) => c.status === "ATIVO");

  return (
    <>
      <div className="pagina-cabecalho">
        <div>
          <h2>Conectar conta bancária</h2>
          <p className="sub">Compartilhamento de dados via Open Finance, com consentimento específico e prazo definido.</p>
        </div>
      </div>

      <Etapas atual={1} />

      {ativo && (
        <Aviso tipo="ok">
          Você já tem um consentimento ativo com o {ativo.banco}, válido até {data(ativo.expiraEm)}.
        </Aviso>
      )}

      <div className="cartao">
        <h3>O que o TokenInvest poderá acessar no Banco Rio</h3>
        <p className="sub" style={{ marginBottom: 14 }}>Marque apenas o que você autoriza. Cada permissão é independente.</p>
        {Object.entries(permissoesDisponiveis).map(([codigo, descricao]) => {
          const marcada = escolhidas.includes(codigo);
          return (
            <label key={codigo} className={`opcao ${marcada ? "marcada" : ""}`}>
              <input type="checkbox" checked={marcada} onChange={() => alternar(codigo)} />
              <span>
                <span className="opcao-titulo">{descricao}</span>
                <span className="opcao-desc" style={{ display: "block" }}>Permissão <code>{codigo}</code></span>
              </span>
            </label>
          );
        })}

        <label style={{ maxWidth: 260, marginTop: 6 }}>
          Validade do consentimento
          <select value={prazo} onChange={(e) => setPrazo(e.target.value)}>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
            <option value={180}>180 dias</option>
            <option value={365}>12 meses</option>
          </select>
        </label>

        <Aviso tipo="info">
          Você pode revogar este consentimento a qualquer momento em Privacidade. A senha do banco é digitada
          apenas no site do banco e nunca chega ao TokenInvest.
        </Aviso>
        <Aviso>{erro}</Aviso>

        <div className="botoes">
          <button onClick={conectar} disabled={!escolhidas.length}>
            Continuar para o Banco Rio
          </button>
        </div>
      </div>

      {lista.length > 0 && (
        <div className="cartao sem-padding">
          <div className="cartao-topo"><h3>Histórico de consentimentos</h3></div>
          <table className="lista-movel">
            <thead><tr><th>Banco</th><th>Permissões</th><th>Status</th><th>Expira</th></tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td data-rotulo="Banco">{c.banco}</td>
                  <td data-rotulo="Permissões"><span className="pequeno">{c.permissoes.join(", ")}</span></td>
                  <td data-rotulo="Status"><Selo status={c.status}>{STATUS_CONSENTIMENTO[c.status]}</Selo></td>
                  <td data-rotulo="Expira" className="tabular">{data(c.expiraEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
