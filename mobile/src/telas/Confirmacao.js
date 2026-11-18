import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/cliente';
import { data, STATUS_CONSENTIMENTO } from '../dominio/formatar';
import { Aviso, Botao, Carregando, Cartao, Etapas, Secundario, Tela, Texto } from '../componentes/UI';

export default function Confirmacao({ route, navigation }) {
  const requisicao = useRef(null);
  const [consentimento, setConsentimento] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    let ativo = true;
    if (!requisicao.current) requisicao.current = api.retornoBanco(route.params.retorno);
    requisicao.current.then(c => { if (ativo) setConsentimento(c); }).catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [route.params.retorno]);
  function voltar(tela) { navigation.reset({ index: 0, routes: [{ name: 'Principal', params: { screen: tela } }] }); }
  async function confirmar() {
    setErro('');
    try { await api.confirmarConsentimento(consentimento.id); voltar('Início'); } catch (e) { setErro(e.message); }
  }
  return <Tela titulo="Confirmar conexão" subtitulo="Última etapa: revise o que foi autorizado no banco antes de ativar.">
    <Etapas atual={3} /><Aviso mensagem={erro} />{!consentimento && !erro && <Carregando />}
    {consentimento?.status === 'AUTORIZADO' && <Cartao><Texto tipo="subtitulo">O {consentimento.banco} confirmou a sua identidade</Texto><Secundario>Confira os dados antes de ativar o compartilhamento.</Secundario>
      <Texto>Instituição: {consentimento.banco}</Texto><Texto>Permissões: {consentimento.permissoes.join(', ')}</Texto><Texto>Válido até: {data(consentimento.expiraEm)}</Texto><Texto>Status: {STATUS_CONSENTIMENTO[consentimento.status]}</Texto>
      <Aviso tipo="info" mensagem="Se você não reconhece este pedido, não confirme. Esta verificação protege contra fraudes de redirecionamento." /><Botao titulo="Confirmar e ativar" onPress={confirmar} /><Botao secundario titulo="Cancelar" onPress={() => voltar('Open Finance')} />
    </Cartao>}
    {consentimento?.status === 'REJEITADO' && <Aviso mensagem="Você não autorizou o compartilhamento no banco. Nenhum dado foi conectado." />}
    {(erro || consentimento?.status === 'REJEITADO') && <Botao secundario titulo="Voltar ao Open Finance" onPress={() => voltar('Open Finance')} />}
  </Tela>;
}
