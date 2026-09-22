import { useCallback, useEffect, useState } from "react";
import { listarTabelasIrrf } from "../services/irrf";
import { mensagemDeErro } from "../utils/erros";

// Carrega as versões da tabela IRRF. "recarregar" busca de novo (ex.: depois de cadastrar/editar/excluir),
// mantendo a lista atual na tela até a resposta chegar.
export default function useTabelasIrrf() {
  const [estado, setEstado] = useState({ tabelas: [], carregando: true, erro: null });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    listarTabelasIrrf()
      .then((tabelas) => {
        if (ativo) setEstado({ tabelas: Array.isArray(tabelas) ? tabelas : [], carregando: false, erro: null });
      })
      .catch((erro) => {
        console.error("Erro ao carregar as tabelas IRRF:", erro);
        if (ativo) {
          setEstado((atual) => ({
            ...atual,
            carregando: false,
            erro: mensagemDeErro(erro, "Não foi possível carregar as tabelas IRRF."),
          }));
        }
      });

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);

  return { ...estado, recarregar };
}
