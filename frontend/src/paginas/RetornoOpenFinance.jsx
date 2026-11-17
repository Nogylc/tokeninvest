import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/cliente";
import { data, STATUS_CONSENTIMENTO } from "../dominio/formatar";
import { Aviso, Etapas, Selo, Esqueleto } from "../componentes/Layout";

// ETAPA 3 - CONFIRMAÇÃO: de volta ao TokenInvest, o usuário confirma explicitamente.
export default function RetornoOpenFinance() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const [consentimento, setConsentimento] = useState(null);
  const [erro, setErro] = useState("");
  const jaEnviou = useRef(false);

  useEffect(() => {
    if (jaEnviou.current) return; // o "code" só pode ser usado uma vez
    jaEnviou.current = true;
    api
      .retornoBanco({ code: params.get("code"), state: params.get("state"), error: params.get("error") })
      .then(setConsentimento)
      .catch((e) => setErro(e.message));
  }, [params]);

  async function confirmar() {
    try {
      await api.confirmarConsentimento(consentimento.id);
      navegar("/");
    } catch (e) {
      setErro(e.message);
    }
  }

  const carregando = !consentimento && !erro;

  return (
    <>
      <div className="pagina-cabecalho">
        <div>
          <h2>Confirmar conexão</h2>
          <p className="sub">Última etapa: revise o que foi autorizado no banco antes de ativar.</p>
        </div>
      </div>

      <Etapas atual={3} />

      <Aviso>{erro}</Aviso>
      {consentimento?.status === "REJEITADO" && (
        <div className="cartao">
          <Aviso>Você não autorizou o compartilhamento no banco. Nenhum dado foi conectado.</Aviso>
          <button className="secundario" onClick={() => navegar("/open-finance")}>Voltar</button>
        </div>
      )}

      {carregando && (
        <div className="cartao">
          <Esqueleto largura="60%" altura={18} />
          <Esqueleto className="bloco" altura={14} style={{ marginTop: 16 }} />
          <Esqueleto className="bloco" largura="70%" altura={14} style={{ marginTop: 10 }} />
          <Esqueleto className="bloco" largura="50%" altura={14} style={{ marginTop: 10 }} />
        </div>
      )}

      {consentimento?.status === "AUTORIZADO" && (
        <div className="cartao">
          <h3 style={{ marginBottom: 6 }}>O {consentimento.banco} confirmou a sua identidade</h3>
          <p className="sub" style={{ marginBottom: 16 }}>Confira os dados antes de ativar o compartilhamento.</p>
          <dl className="detalhes" style={{ maxWidth: 480 }}>
            <dt>Instituição</dt><dd>{consentimento.banco}</dd>
            <dt>Permissões</dt><dd>{consentimento.permissoes.join(", ")}</dd>
            <dt>Válido até</dt><dd>{data(consentimento.expiraEm)}</dd>
            <dt>Status</dt><dd><Selo status={consentimento.status}>{STATUS_CONSENTIMENTO[consentimento.status]}</Selo></dd>
          </dl>
          <Aviso tipo="info">Se você não reconhece este pedido, não confirme. Esta verificação protege contra fraudes de redirecionamento.</Aviso>
          <div className="botoes">
            <button onClick={confirmar}>Confirmar e ativar</button>
            <button className="secundario" onClick={() => navegar("/open-finance")}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
