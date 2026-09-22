import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import Button from "../Button";
import EditorPosseImovel from "./EditorPosseImovel";
import { enderecoDoImovel, formatarPercentual, proprietariosParaEstado, somaPosse } from "../../utils/posse";

// Atribui um imóvel já cadastrado a um locador. Como a posse é partilhada, ao escolher o imóvel o usuário
// vê os proprietários atuais e redistribui os percentuais de todos no mesmo passo (soma máxima de 100%).
export default function FormularioAtribuirImovel({ locador, idsImoveisVinculados, onClose, onSuccess }) {
  const [imoveis, setImoveis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [imovelId, setImovelId] = useState("");

  // Chave estável: o pai recria o array a cada render, o que refaria a busca sem necessidade
  const chaveVinculados = idsImoveisVinculados.join(",");

  useEffect(() => {
    const carregarImoveis = async () => {
      try {
        const resposta = await api.get("/imoveis");
        const dados = resposta.data?.data || resposta.data || [];
        const jaVinculados = chaveVinculados ? chaveVinculados.split(",") : [];
        setImoveis(
          (Array.isArray(dados) ? dados : []).filter(
            (i) => i.status !== "INATIVO" && !jaVinculados.includes(String(i.id)),
          ),
        );
      } catch (erro) {
        console.error("Erro ao carregar imóveis para atribuição:", erro);
        setErroCarga(true);
      } finally {
        setCarregando(false);
      }
    };
    carregarImoveis();
  }, [chaveVinculados]);

  const imovelSelecionado = imoveis.find((i) => String(i.id) === String(imovelId));
  const proprietariosAtuais = imovelSelecionado?.propriedadeimovel || [];
  const totalAtual = somaPosse(proprietariosAtuais);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-700 mb-1">Imóvel</label>
        <select
          value={imovelId}
          onChange={(e) => setImovelId(e.target.value)}
          disabled={carregando}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
        >
          <option value="">
            {carregando ? "Carregando imóveis..." : "Selecione um imóvel cadastrado..."}
          </option>
          {imoveis.map((imovel) => (
            <option key={imovel.id} value={imovel.id}>
              {enderecoDoImovel(imovel)} · posse atual {formatarPercentual(somaPosse(imovel.propriedadeimovel))}
            </option>
          ))}
        </select>
        {erroCarga && (
          <p className="text-xs text-red-500 mt-1">Não foi possível carregar os imóveis.</p>
        )}
        {!carregando && !erroCarga && imoveis.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Não há imóveis disponíveis para atribuir a este locador.
          </p>
        )}
      </div>

      {imovelSelecionado ? (
        <>
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">
            Este imóvel já tem{" "}
            <span className="font-bold text-gray-900">{formatarPercentual(totalAtual)}</span> da posse
            atribuídos a {proprietariosAtuais.length}{" "}
            {proprietariosAtuais.length === 1 ? "proprietário" : "proprietários"}. Informe o percentual
            do locador e, se necessário, ajuste os demais para que a soma não passe de 100%.
          </p>

          <EditorPosseImovel
            key={imovelSelecionado.id}
            imovelId={imovelSelecionado.id}
            proprietariosIniciais={[
              ...proprietariosParaEstado(proprietariosAtuais),
              {
                idLocador: String(locador.id),
                nomeLocador: locador.nome,
                percentualParticipacao: "",
              },
            ]}
            idsTravados={[locador.id]}
            textoConfirmar="Atribuir imóvel"
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </>
      ) : (
        <div className="pt-4 flex justify-end border-t">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
