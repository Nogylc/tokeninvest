import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

export function useDados(carregar) {
  const carregarRef = useRef(carregar);
  useEffect(() => { carregarRef.current = carregar; }, [carregar]);
  const focado = useIsFocused();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    if (!focado) return;
    let ativo = true;
    Promise.resolve().then(() => {
      if (!ativo) return;
      setCarregando(true); setErro('');
      return carregarRef.current();
    }).then(value => { if (ativo) setDados(value); }).catch(e => { if (ativo) setErro(e.message); }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [focado, versao]);
  return { dados, erro, carregando, atualizar: () => setVersao(v => v + 1) };
}
