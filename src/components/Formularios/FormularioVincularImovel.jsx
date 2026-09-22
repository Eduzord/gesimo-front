import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import Button from "../Button";
import FormularioContrato from "./FormularioContrato";
import { enderecoDoImovel, nomeDoLocador } from "../../utils/posse";

// Vincula um locatário a um imóvel por meio de um contrato de locação. Só aparecem imóveis DISPONIVEL
// que já tenham proprietários, porque o locador do contrato precisa ser um deles.
export default function FormularioVincularImovel({ locatario, onClose, onSuccess }) {
  const [imoveis, setImoveis] = useState([]);
  const [locadores, setLocadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [imovelId, setImovelId] = useState("");

  useEffect(() => {
    const carregar = async () => {
      try {
        const [respostaImoveis, respostaLocadores] = await Promise.all([
          api.get("/imoveis"),
          api.get("/locadores"),
        ]);
        const dadosImoveis = respostaImoveis.data?.data || respostaImoveis.data || [];
        const dadosLocadores = respostaLocadores.data?.data || respostaLocadores.data || [];

        setImoveis(
          (Array.isArray(dadosImoveis) ? dadosImoveis : []).filter(
            (i) => i.status === "DISPONIVEL" && (i.propriedadeimovel || []).length > 0,
          ),
        );
        setLocadores(Array.isArray(dadosLocadores) ? dadosLocadores : []);
      } catch (erro) {
        console.error("Erro ao carregar imóveis para vínculo do locatário:", erro);
        setErroCarga(true);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  const imovelSelecionado = imoveis.find((i) => String(i.id) === String(imovelId));

  const proprietarios = (imovelSelecionado?.propriedadeimovel || []).map((p) => {
    const locador = locadores.find((l) => String(l.id) === String(p.idLocador));
    return {
      id: p.idLocador,
      nome: locador ? nomeDoLocador(locador) : `Locador #${p.idLocador}`,
      percentual: p.percentualParticipacao,
    };
  });

  return (
    <div className="space-y-2">
      <div className="px-6 pt-6">
        <label className="block text-sm text-gray-700 mb-1">Imóvel</label>
        <select
          value={imovelId}
          onChange={(e) => setImovelId(e.target.value)}
          disabled={carregando}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
        >
          <option value="">
            {carregando ? "Carregando imóveis..." : "Selecione um imóvel disponível..."}
          </option>
          {imoveis.map((imovel) => (
            <option key={imovel.id} value={imovel.id}>
              {enderecoDoImovel(imovel)}
            </option>
          ))}
        </select>
        {erroCarga && (
          <p className="text-xs text-red-500 mt-1">Não foi possível carregar os imóveis.</p>
        )}
        {!carregando && !erroCarga && imoveis.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Não há imóveis disponíveis com proprietário cadastrado para alugar.
          </p>
        )}
      </div>

      {imovelSelecionado ? (
        <FormularioContrato
          key={imovelSelecionado.id}
          imovelId={imovelSelecionado.id}
          proprietarios={proprietarios}
          locatarioFixo={locatario}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      ) : (
        <div className="px-6 pb-6 pt-4 flex justify-end">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
