import { useEffect, useState } from "react";
import { api } from "../api/cliente";
import { reais } from "../dominio/formatar";
import { Aviso, Esqueleto, Selo, BotaoCopiar } from "../componentes/Layout";
import { Icone } from "../componentes/Icones";

function EsqueletoAtivos() {
  return (
    <div className="grade grade-ativos">
      {[0, 1, 2].map((i) => (
        <div className="cartao cartao-ativo" key={i}>
          <Esqueleto largura="70%" altura={20} />
          <Esqueleto className="bloco" altura={14} />
          <Esqueleto className="bloco" largura="80%" altura={14} />
          <Esqueleto className="bloco" altura={6} style={{ marginTop: 8 }} />
          <Esqueleto className="bloco" altura={40} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

export default function Investir() {
  const [ativos, setAtivos] = useState(null);
  const [quantidades, setQuantidades] = useState({});
  const [msg, setMsg] = useState({});
  const [ocupado, setOcupado] = useState(false);

  const carregar = () => api.ativos().then(setAtivos).catch((e) => setMsg({ tipo: "erro", texto: e.message }));
  useEffect(() => { carregar(); }, []);

  const quantidadeDe = (a) => Math.max(1, Math.floor(Number(quantidades[a.id]) || 1));
  const definir = (a, q) => setQuantidades({ ...quantidades, [a.id]: Math.max(1, Math.floor(Number(q) || 1)) });

  async function operar(ativo, tipo) {
    const q = Number(quantidades[ativo.id] || 1);
    setOcupado(true);
    setMsg({});
    try {
      const r = tipo === "comprar" ? await api.comprar(ativo.id, q) : await api.vender(ativo.id, q);
      setMsg({
        tipo: "ok",
        texto: `${tipo === "comprar" ? "Compra" : "Venda"} de ${r.quantidade} ${ativo.simbolo} (${reais(r.valorCentavos)}) registrada no bloco #${r.transacao.bloco}.`,
      });
      await carregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="pagina-cabecalho">
        <div>
          <h2>Ativos tokenizados</h2>
          <p className="sub">Cada cota é um token registrado em contrato inteligente. Liquidação em DREX, 24 horas por dia.</p>
        </div>
      </div>
      <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>

      {ativos === null ? <EsqueletoAtivos /> : (
        <div className="grade grade-ativos">
          {ativos.map((a) => {
            const vendidas = a.totalCotas - a.cotasDisponiveis;
            const pct = a.totalCotas ? Math.min(100, Math.round((vendidas / a.totalCotas) * 100)) : 0;
            const q = quantidadeDe(a);
            const total = q * a.precoCotaCentavos;
            return (
              <div className="cartao cartao-ativo" key={a.id}>
                <div className="ativo-topo">
                  <h3>{a.nome}</h3>
                  <Selo status="simbolo">{a.simbolo}</Selo>
                </div>
                <p className="ativo-desc">{a.descricao}</p>

                <div className="ativo-metricas">
                  <div className="metrica"><span className="rotulo">Cota</span><strong>{reais(a.precoCotaCentavos)}</strong></div>
                  <div className="metrica destaque"><span className="rotulo">Rentabilidade</span><strong>{a.rentabilidadeEstimada}</strong></div>
                  <div className="metrica"><span className="rotulo">Minhas cotas</span><strong>{a.minhasCotas}</strong></div>
                  <div className="metrica"><span className="rotulo">Limite por CPF</span><strong>{a.limitePorInvestidor}</strong></div>
                </div>

                <div className="progresso" aria-label={`${vendidas} de ${a.totalCotas} cotas vendidas`}>
                  <div className="progresso-barra"><span style={{ width: `${pct}%` }} /></div>
                  <div className="progresso-legenda">
                    <span>{vendidas.toLocaleString("pt-BR")} de {a.totalCotas.toLocaleString("pt-BR")} cotas vendidas</span>
                    <span>{pct}%</span>
                  </div>
                </div>

                {a.pausado && <Aviso tipo="info">Negociação temporariamente pausada pelo emissor.</Aviso>}

                <div className="ativo-compra">
                  <div className="ativo-total">
                    <div className="quantidade" role="group" aria-label="Quantidade de cotas">
                      <button type="button" onClick={() => definir(a, q - 1)} disabled={q <= 1} aria-label="Diminuir"><Icone nome="menos" tamanho={16} /></button>
                      <input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={quantidades[a.id] || 1}
                        onChange={(e) => setQuantidades({ ...quantidades, [a.id]: e.target.value })}
                        onBlur={() => definir(a, quantidades[a.id])}
                        aria-label="Quantidade"
                      />
                      <button type="button" onClick={() => definir(a, q + 1)} aria-label="Aumentar"><Icone nome="mais" tamanho={16} /></button>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="rotulo">Total</span>
                      <div className="total-valor">{reais(total)}</div>
                    </div>
                  </div>
                  <div className="ativo-acoes">
                    <button disabled={ocupado || a.pausado} onClick={() => operar(a, "comprar")}>Comprar</button>
                    <button disabled={ocupado || !a.minhasCotas} className="secundario" onClick={() => operar(a, "vender")}>Vender</button>
                  </div>
                </div>

                <div className="ativo-rodape">
                  <span>Contrato</span>
                  <code>{`${a.enderecoContrato.slice(0, 10)}…${a.enderecoContrato.slice(-6)}`}</code>
                  <BotaoCopiar texto={a.enderecoContrato} rotulo="Copiar endereço do contrato" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
