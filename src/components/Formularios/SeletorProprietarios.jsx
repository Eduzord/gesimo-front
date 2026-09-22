import React, { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { api } from "../../services/api";
import { nomeDoLocador } from "../../utils/posse";

// Converte "12,5" ou "12.5" em número. Retorna NaN se não for um número válido.
function paraNumero(valor) {
  return Number(String(valor ?? "").replace(",", "."));
}

export function calcularTotalPercentual(proprietarios) {
  return proprietarios.reduce((soma, p) => {
    const valor = paraNumero(p.percentualParticipacao);
    return soma + (Number.isFinite(valor) ? valor : 0);
  }, 0);
}

// Só é válido se TODAS as linhas tiverem um locador escolhido na lista (idLocador preenchido)
// e um percentual numérico maior que zero.
export function proprietariosSaoValidos(proprietarios) {
  return proprietarios.every((p) => {
    const percentual = paraNumero(p.percentualParticipacao);
    return p.idLocador && Number.isFinite(percentual) && percentual > 0;
  });
}

function corDoTotal(total) {
  if (total > 100) return "text-red-600";
  if (total === 100) return "text-green-600";
  if (total >= 50) return "text-amber-500";
  return "text-gray-400";
}

// Uma linha = um proprietário: campo de busca com autocomplete + seta para listar tudo + % + remover.
// Só aceita como válido um locador que exista na lista vinda do banco (busca/seta sempre usam essa lista).
// Uma linha "travada" mantém o locador fixo (só o percentual pode mudar) e não pode ser removida.
function LinhaProprietario({ item, index, locadores, idsUsados, travado, onAtualizar, onRemover }) {
  const [busca, setBusca] = useState(item.nomeLocador || "");
  const [listaAberta, setListaAberta] = useState(false);

  useEffect(() => {
    setBusca(item.nomeLocador || "");
  }, [item.nomeLocador]);

  // Esconde da lista quem já foi escolhido em outra linha, mas mantém o próprio selecionado
  const disponiveis = locadores.filter(
    (l) => !idsUsados.includes(String(l.id)) || String(l.id) === String(item.idLocador)
  );

  const termoBusca = busca.trim().toLowerCase();
  const sugestoes = termoBusca
    ? disponiveis.filter((l) => nomeDoLocador(l).toLowerCase().includes(termoBusca))
    : disponiveis;

  const selecionarLocador = (locador) => {
    setBusca(nomeDoLocador(locador));
    setListaAberta(false);
    onAtualizar(index, { idLocador: locador.id, nomeLocador: nomeDoLocador(locador) });
  };

  const aoDigitar = (valor) => {
    setBusca(valor);
    setListaAberta(true);
    // Se o usuário voltar a digitar, a seleção anterior deixa de valer até escolher de novo na lista
    if (item.idLocador) {
      onAtualizar(index, { idLocador: "", nomeLocador: "" });
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="relative flex-1">
        <div className="relative">
          <input
            type="text"
            value={busca}
            onChange={(e) => aoDigitar(e.target.value)}
            onFocus={() => setListaAberta(true)}
            onBlur={() => setTimeout(() => setListaAberta(false), 200)}
            placeholder="Digite o nome do locador..."
            disabled={travado}
            className={`w-full p-2 pr-9 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors disabled:cursor-not-allowed ${
              item.idLocador ? "border-green-300 bg-green-50/40" : "border-gray-300"
            }`}
          />
          {!travado && (
            <button
              type="button"
              onClick={() => setListaAberta((v) => !v)}
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              title="Ver todos os locadores ativos"
              tabIndex={-1}
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>

        {listaAberta && !travado && (
          <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {sugestoes.length === 0 ? (
              <li className="p-2 text-sm text-gray-400">Nenhum locador ativo encontrado</li>
            ) : (
              sugestoes.map((l) => (
                <li
                  key={l.id}
                  onMouseDown={() => selecionarLocador(l)}
                  className="p-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                >
                  {nomeDoLocador(l)}{" "}
                  <span className="text-gray-400 text-xs ml-2">(ID: {l.id})</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="relative w-28 shrink-0">
        <input
          type="text"
          inputMode="decimal"
          value={item.percentualParticipacao}
          onChange={(e) => {
            const valor = e.target.value;
            if (/^[0-9]*[.,]?[0-9]*$/.test(valor)) {
              onAtualizar(index, { percentualParticipacao: valor });
            }
          }}
          placeholder="0,00"
          className="w-full p-2 pr-7 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <span className="absolute right-2 top-2.5 text-gray-400 text-xs">%</span>
      </div>

      {travado ? (
        <div className="w-[34px] shrink-0" />
      ) : (
        <button
          type="button"
          onClick={() => onRemover(index)}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          title="Remover proprietário"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}

// Componente principal: lista de proprietários + mostrador do total de % de posse informado.
// "idsTravados": locadores cuja linha não pode ser trocada nem removida (ex.: o locador da tela em que o usuário está).
export default function SeletorProprietarios({ proprietarios, onChange, idsTravados = [] }) {
  const [locadores, setLocadores] = useState([]);

  useEffect(() => {
    const carregarLocadores = async () => {
      try {
        // A rota /locadores, sem filtro, já retorna só os locadores com status ATIVO por padrão
        const resposta = await api.get("/locadores");
        const dados = resposta.data?.data || resposta.data || [];
        setLocadores(Array.isArray(dados) ? dados : []);
      } catch (erro) {
        console.error("Erro ao carregar locadores para o seletor de proprietários:", erro);
      }
    };
    carregarLocadores();
  }, []);

  // Quando a lista de locadores chega, preenche o nome de proprietários que só vieram com o ID (edição)
  useEffect(() => {
    if (locadores.length === 0) return;

    let mudou = false;
    const atualizados = proprietarios.map((p) => {
      if (p.idLocador && !p.nomeLocador) {
        const encontrado = locadores.find((l) => String(l.id) === String(p.idLocador));
        mudou = true;
        // Locador inativo não vem na lista de ativos: mantém o vínculo com um nome genérico
        return { ...p, nomeLocador: encontrado ? nomeDoLocador(encontrado) : `Locador #${p.idLocador}` };
      }
      return p;
    });

    if (mudou) onChange(atualizados);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locadores]);

  const idsUsados = proprietarios.map((p) => String(p.idLocador)).filter(Boolean);
  const total = calcularTotalPercentual(proprietarios);
  const totalArredondado = Math.round(total * 100) / 100;
  const totalFormatado = totalArredondado.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const adicionar = () => {
    onChange([...proprietarios, { idLocador: "", nomeLocador: "", percentualParticipacao: "" }]);
  };

  const remover = (index) => {
    onChange(proprietarios.filter((_, i) => i !== index));
  };

  const atualizar = (index, campos) => {
    onChange(proprietarios.map((p, i) => (i === index ? { ...p, ...campos } : p)));
  };

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
        Proprietários (Posse Partilhada)
      </h3>

      <div className="flex flex-col gap-3">
        {proprietarios.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            Nenhum proprietário adicionado. Por padrão o imóvel fica sem dono vinculado.
          </p>
        )}

        {proprietarios.map((item, index) => (
          <LinhaProprietario
            key={index}
            index={index}
            item={item}
            locadores={locadores}
            idsUsados={idsUsados}
            travado={Boolean(item.idLocador) && idsTravados.map(String).includes(String(item.idLocador))}
            onAtualizar={atualizar}
            onRemover={remover}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={adicionar}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
      >
        <Plus size={16} /> Adicionar proprietário
      </button>

      {proprietarios.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">Total da posse informada</span>
          <span className={`text-sm font-bold transition-colors ${corDoTotal(totalArredondado)}`}>
            {totalFormatado}%
            {totalArredondado > 100 && " · excede 100%"}
            {totalArredondado < 100 && ` · faltam ${(100 - totalArredondado).toFixed(2).replace(".", ",")}%`}
            {totalArredondado === 100 && " · completo"}
          </span>
        </div>
      )}
    </div>
  );
}
