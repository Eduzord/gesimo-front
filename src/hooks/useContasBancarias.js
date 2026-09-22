import { useCallback, useEffect, useState } from "react";
import { listarContasBancarias } from "../services/contaBancaria";
import { mensagemDeErro } from "../utils/erros";

// Mesmo padrão de useTabelasIrrf.js: estado {dados, carregando, erro} + recarregar()
export default function useContasBancarias(status) {
  const [estado, setEstado] = useState({ contas: [], carregando: true, erro: null });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setEstado((atual) => ({ ...atual, carregando: true }));

    listarContasBancarias(status)
      .then((contas) => {
        if (ativo) setEstado({ contas: Array.isArray(contas) ? contas : [], carregando: false, erro: null });
      })
      .catch((erro) => {
        console.error("Erro ao carregar as contas bancárias:", erro);
        if (ativo) {
          setEstado((atual) => ({ ...atual, carregando: false, erro: mensagemDeErro(erro, "Não foi possível carregar as contas bancárias.") }));
        }
      });

    return () => {
      ativo = false;
    };
  }, [status, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);

  return { ...estado, recarregar };
}
