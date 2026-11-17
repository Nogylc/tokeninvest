import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBanco } from "../api/cliente";
import { data } from "../dominio/formatar";
import { Aviso, Esqueleto } from "../componentes/Layout";

// ETAPA 2 - AUTENTICAÇÃO: esta tela representa o site/app do BANCO (outra instituição).
export default function BancoSimulado() {
  const [params] = useSearchParams();
  const [pedido, setPedido] = useState(null);
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const consentId = params.get("consent_id");
  useEffect(() => {
    apiBanco.consentimento(consentId).then(setPedido).catch((e) => setErro(e.message));
  }, [consentId]);

  async function decidir(aprovar) {
    setErro("");
    try {
      const { redirectUrl } = await apiBanco.autorizar({
        consentId, cpf, senha, aprovar,
        redirect_uri: params.get("redirect_uri"),
        state: params.get("state"),
        code_challenge: params.get("code_challenge"),
      });
      window.location.href = redirectUrl; // volta para o TokenInvest
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div className="banco">
      <header className="banco-topo">
        <div className="banco-topo-interno">
          <div className="banco-marca">Banco Rio</div>
          <div className="banco-topo-direita">Internet Banking</div>
        </div>
      </header>

      <main className="banco-conteudo">
        <div className="banco-cartao">
          {!pedido ? (
            erro ? <Aviso>{erro}</Aviso> : (
              <>
                <Esqueleto largura="70%" altura={22} />
                <Esqueleto className="bloco" altura={14} style={{ marginTop: 14 }} />
                <Esqueleto className="bloco" altura={90} style={{ marginTop: 16 }} />
                <Esqueleto className="bloco" altura={42} style={{ marginTop: 16 }} />
              </>
            )
          ) : (
            <>
              <h2>Autorizar compartilhamento de dados</h2>
              <p className="banco-sub">
                <strong>{pedido.instituicaoReceptora}</strong> solicita acesso às informações abaixo, conforme as regras do Open Finance.
              </p>

              <div className="banco-bloco">
                <span className="rotulo">Dados solicitados</span>
                <ul>
                  {pedido.permissoes.map((p) => <li key={p}>{p}</li>)}
                </ul>
                <p className="banco-validade">Válido até <strong>{data(pedido.expiraEm)}</strong>. Você pode cancelar a qualquer momento.</p>
              </div>

              <p className="banco-sub" style={{ marginBottom: 14 }}>Para continuar, identifique-se com os dados da sua conta Banco Rio.</p>
              <label>CPF<input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" autoComplete="username" /></label>
              <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" /></label>
              <p className="dica">Ambiente de demonstração: senha <code>banco123</code>.</p>

              {erro && <Aviso>{erro}</Aviso>}

              <div className="botoes">
                <button onClick={() => decidir(true)}>Autorizar</button>
                <button className="secundario" onClick={() => decidir(false)}>Não autorizar</button>
              </div>
              <p className="banco-seguro">Conexão segura. O Banco Rio nunca compartilha sua senha com terceiros.</p>
            </>
          )}
        </div>
      </main>

      <footer className="banco-rodape">Banco Rio S.A. · Ambiente de demonstração · Ouvidoria 0800 000 0000</footer>
    </div>
  );
}
