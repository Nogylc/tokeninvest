import { useEffect, useState } from "react";
import { api } from "../api/cliente";
import { reais, encurtar, TIPO_TRANSACAO } from "../dominio/formatar";
import { Esqueleto, BotaoCopiar } from "../componentes/Layout";

// Entradas de dBRL na carteira: depósito e venda de cotas. Saídas: resgate e compra.
const ENTRADAS = new Set(["DEPOSITO_DREX", "VENDA"]);

function EsqueletoExtrato() {
  return (
    <>
      <div className="cartao">
        <Esqueleto largura={120} altura={18} />
        {[0, 1].map((i) => <Esqueleto key={i} className="bloco" altura={16} style={{ marginTop: 14 }} />)}
      </div>
      <div className="cartao">
        <Esqueleto largura={200} altura={18} />
        {[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="bloco" altura={16} style={{ marginTop: 14 }} />)}
      </div>
    </>
  );
}

// Extrato lido diretamente dos eventos gravados na blockchain (livro-razão imutável).
export default function Extrato() {
  const [c, setC] = useState(null);
  useEffect(() => { api.carteira().then(setC); }, []);

  return (
    <>
      <div className="pagina-cabecalho">
        <div>
          <h2>Extrato</h2>
          <p className="sub">Posição atual e todas as transações registradas na rede.</p>
        </div>
      </div>

      {!c ? <EsqueletoExtrato /> : (
        <>
          <div className="cartao sem-padding">
            <div className="cartao-topo"><h3>Meus ativos</h3></div>
            {c.ativos.filter((a) => a.minhasCotas > 0).length === 0 ? (
              <p className="vazio">Você ainda não possui cotas.</p>
            ) : (
              <table className="lista-movel">
                <thead><tr><th>Ativo</th><th className="direita">Cotas</th><th className="direita">Valor</th></tr></thead>
                <tbody>
                  {c.ativos.filter((a) => a.minhasCotas > 0).map((a) => (
                    <tr key={a.id}>
                      <td data-rotulo="Ativo">{a.nome}</td>
                      <td data-rotulo="Cotas" className="direita tabular">{a.minhasCotas}</td>
                      <td data-rotulo="Valor" className="direita tabular"><strong>{reais(a.minhasCotas * a.precoCotaCentavos)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="cartao sem-padding">
            <div className="cartao-topo">
              <h3>Transações</h3>
              <span className="pequeno">{c.extrato.length} registro(s) na DLT</span>
            </div>
            {c.extrato.length === 0 ? (
              <p className="vazio">Nenhuma transação ainda.</p>
            ) : (
              <table className="lista-movel">
                <thead>
                  <tr><th>Operação</th><th>Bloco</th><th className="direita">Valor</th><th>Hash</th></tr>
                </thead>
                <tbody>
                  {c.extrato.map((t) => {
                    const entrada = ENTRADAS.has(t.tipo);
                    return (
                      <tr key={t.hash + t.tipo}>
                        <td data-rotulo="Operação" className="principal">
                          <div className="op-celula">
                            <div className="op-texto">
                              <span>{TIPO_TRANSACAO[t.tipo]}</span>
                              <small>{t.cotas ? `${t.cotas} cota(s) · ${t.ativo}` : "dBRL"}</small>
                            </div>
                          </div>
                        </td>
                        <td data-rotulo="Bloco" className="tabular">#{t.bloco}</td>
                        <td data-rotulo="Valor" className={`direita tabular ${entrada ? "valor-entrada" : "valor-saida"}`}>
                          {entrada ? "+" : "−"} {reais(t.valorCentavos)}
                        </td>
                        <td data-rotulo="Hash">
                          <span className="hash">
                            <code title={t.hash}>{encurtar(t.hash)}</code>
                            <BotaoCopiar texto={t.hash} rotulo="Copiar hash da transação" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
