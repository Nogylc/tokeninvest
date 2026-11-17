import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, sessao } from "../api/cliente";
import { data, STATUS_CONSENTIMENTO } from "../dominio/formatar";
import { Aviso, Esqueleto, Selo, BotaoCopiar } from "../componentes/Layout";

// Direitos do titular (LGPD): acesso/portabilidade, revogação de consentimento e eliminação.
export default function Privacidade() {
  const navegar = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [lista, setLista] = useState([]);
  const [msg, setMsg] = useState({});

  const carregar = async () => {
    setUsuario(await api.eu());
    setLista(await api.consentimentos());
  };
  useEffect(() => { carregar(); }, []);

  async function revogar(id) {
    try {
      await api.revogarConsentimento(id);
      setMsg({ tipo: "ok", texto: "Consentimento revogado. O banco não compartilha mais seus dados." });
      carregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  }

  async function baixar() {
    const dados = await api.meusDados();
    const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "meus-dados-tokeninvest.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function excluir() {
    if (!window.confirm("Tem certeza? Seus dados pessoais serão eliminados.")) return;
    try {
      await api.excluirConta();
      sessao.limpar();
      navegar("/login");
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  }

  const encerrados = ["REVOGADO", "REJEITADO", "EXPIRADO"];

  return (
    <>
      <div className="pagina-cabecalho">
        <div>
          <h2>Privacidade e dados</h2>
          <p className="sub">Seus direitos como titular: acesso, portabilidade, revogação e exclusão.</p>
        </div>
      </div>
      <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>

      {!usuario ? (
        <div className="cartao">
          <Esqueleto largura={160} altura={18} />
          {[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="bloco" largura={`${80 - i * 10}%`} altura={14} style={{ marginTop: 14 }} />)}
        </div>
      ) : (
        <div className="cartao">
          <div className="secao-titulo">
            <h3>Dados que guardamos</h3>
            <button className="secundario pequeno" onClick={baixar}>Baixar meus dados</button>
          </div>
          <dl className="dados-lista">
            <dt>Nome</dt><dd>{usuario.nome}</dd>
            <dt>E-mail</dt><dd>{usuario.email}</dd>
            <dt>CPF</dt><dd>{usuario.cpf} <span className="pequeno">· armazenado criptografado (AES-256)</span></dd>
            <dt>Carteira</dt>
            <dd><span className="hash"><code>{usuario.carteira}</code><BotaoCopiar texto={usuario.carteira} rotulo="Copiar endereço da carteira" /></span></dd>
          </dl>
          <p className="pequeno espaco-cima">Nenhum dado pessoal é gravado na blockchain: lá ficam apenas o endereço da carteira e as transações.</p>
        </div>
      )}

      <div className="cartao sem-padding">
        <div className="cartao-topo"><h3>Consentimentos Open Finance</h3></div>
        {!usuario ? <p className="vazio"><Esqueleto largura={220} altura={14} /></p> : lista.length === 0 ? <p className="vazio">Nenhum consentimento registrado.</p> : (
          <table className="lista-movel">
            <thead><tr><th>Banco</th><th>Permissões</th><th>Status</th><th>Expira</th><th></th></tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td data-rotulo="Banco">{c.banco}</td>
                  <td data-rotulo="Permissões"><span className="pequeno">{c.permissoes.join(", ")}</span></td>
                  <td data-rotulo="Status"><Selo status={c.status}>{STATUS_CONSENTIMENTO[c.status]}</Selo></td>
                  <td data-rotulo="Expira" className="tabular">{data(c.expiraEm)}</td>
                  <td className="direita sem-rotulo">
                    {!encerrados.includes(c.status) && <button className="secundario pequeno" onClick={() => revogar(c.id)}>Revogar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="cartao zona-perigo">
        <h3>Excluir minha conta</h3>
        <p className="sub" style={{ margin: "6px 0 14px" }}>Antes de excluir, venda suas cotas e resgate o saldo em DREX. A exclusão é definitiva.</p>
        <button className="perigo" onClick={excluir}>Excluir conta</button>
      </div>
    </>
  );
}
