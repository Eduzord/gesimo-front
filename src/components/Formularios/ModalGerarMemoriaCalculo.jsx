import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Download, AlertTriangle } from "lucide-react";
import Button from "../Button";
import CampoDecimal from "../CampoDecimal";
import FormularioAplicarReajuste from "./FormularioAplicarReajuste";
import { api } from "../../services/api";
import {
  prepararMemoriaCalculo,
  gerarMemoriaCalculo,
  baixarMemoriaCalculoExcel,
} from "../../services/memoriaCalculo";
import { listarContasBancarias, buscarContaBancariaPadrao } from "../../services/contaBancaria";
import { nomeDoLocador } from "../../utils/posse";
import { formatarMoeda, formatarData } from "../../utils/formatacao";
import { mensagemDeErro } from "../../utils/erros";
import { baixarBlob } from "../../utils/download";
import {
  mesAtual,
  competenciaParaData,
  estaNoMesDeReajuste,
  estadoInicial,
  validarModal,
  montarPayload,
  novaDespesaExtraVazia,
  novoAjusteManualVazio,
  TIPOS_DESPESA,
} from "../../utils/memoriaCalculo";

const classeInput = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";
const rotuloTipoDespesa = (tipo) => TIPOS_DESPESA.find((t) => t.value === tipo)?.label || tipo;

export default function ModalGerarMemoriaCalculo({ imovelId, onClose, onGerado }) {
  const [anoMes, setAnoMes] = useState(mesAtual());
  const [preparacao, setPreparacao] = useState(null);
  const [nomesLocadores, setNomesLocadores] = useState({});
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [estado, setEstado] = useState(null);
  const [mostrarFormReajuste, setMostrarFormReajuste] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [errosValidacao, setErrosValidacao] = useState([]);
  const [erroGeracao, setErroGeracao] = useState(null);

  // Contas bancárias: carregadas uma vez (não dependem do mês escolhido)
  useEffect(() => {
    listarContasBancarias().then(setContas).catch((e) => console.error("Erro ao carregar contas bancárias:", e));
  }, []);

  // Preparação: recarrega sempre que o mês escolhido muda
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErroCarga(null);

    prepararMemoriaCalculo(imovelId, competenciaParaData(anoMes))
      .then(async (dados) => {
        if (!ativo) return;
        setPreparacao(dados);
        setEstado(estadoInicial(dados));
        setMostrarFormReajuste(false);

        // Resolve os nomes dos proprietários (mesmo padrão já usado em Imoveis/detalhes.jsx)
        const pares = await Promise.all(
          (dados.proprietarios ?? []).map(async (p) => {
            try {
              const resposta = await api.get(`/locadores/${p.idLocador}`);
              return [String(p.idLocador), nomeDoLocador(resposta.data?.data || resposta.data)];
            } catch {
              return [String(p.idLocador), `Locador #${p.idLocador}`];
            }
          }),
        );
        if (ativo) setNomesLocadores(Object.fromEntries(pares));
      })
      .catch((e) => {
        console.error("Erro ao preparar a memória de cálculo:", e);
        if (ativo) setErroCarga(mensagemDeErro(e, "Erro ao carregar os dados do imóvel."));
      })
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [imovelId, anoMes]);

  const proprietariosComNome = useMemo(
    () => (preparacao?.proprietarios ?? []).map((p) => ({ idLocador: p.idLocador, nome: nomesLocadores[String(p.idLocador)] || `Locador #${p.idLocador}` })),
    [preparacao, nomesLocadores],
  );

  const atualizarEstado = (campo, valor) => setEstado((atual) => ({ ...atual, [campo]: valor }));

  const selecionarConta = (id, conta) => {
    setEstado((atual) => ({
      ...atual,
      idContaBancaria: id,
      contaBancariaEscolhida: conta
        ? {
            descricao: conta.descricao,
            banco: conta.banco,
            agencia: conta.agencia,
            numero: conta.numeroConta,
            tipoChavePix: conta.tipoChavePix || undefined,
            chavePix: conta.chavePix || undefined,
            titular: conta.titular,
            documentoTitular: conta.documentoTitular,
          }
        : undefined,
    }));
  };

  // Pré-seleciona a conta padrão assim que as contas chegam (e o usuário ainda não escolheu nenhuma)
  useEffect(() => {
    if (estado && !estado.idContaBancaria && contas.length > 0) {
      buscarContaBancariaPadrao().then((padrao) => {
        if (padrao) selecionarConta(String(padrao.id), padrao);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contas, preparacao]);

  const alternarDespesaExistente = (despesa, marcada) => {
    setEstado((atual) => {
      const despesasSelecionadas = { ...atual.despesasSelecionadas };
      if (marcada) despesasSelecionadas[despesa.id] = { aplicacao: "RATEIO", idLocadorEspecifico: "" };
      else delete despesasSelecionadas[despesa.id];
      return { ...atual, despesasSelecionadas };
    });
  };

  const atualizarDespesaExistente = (idDespesa, campos) =>
    setEstado((atual) => ({
      ...atual,
      despesasSelecionadas: { ...atual.despesasSelecionadas, [idDespesa]: { ...atual.despesasSelecionadas[idDespesa], ...campos } },
    }));

  const adicionarDespesaNova = () => atualizarEstado("despesasNovas", [...estado.despesasNovas, novaDespesaExtraVazia()]);
  const removerDespesaNova = (indice) => atualizarEstado("despesasNovas", estado.despesasNovas.filter((_, i) => i !== indice));
  const atualizarDespesaNova = (indice, campos) =>
    atualizarEstado("despesasNovas", estado.despesasNovas.map((d, i) => (i === indice ? { ...d, ...campos } : d)));

  const adicionarAjuste = () => atualizarEstado("ajustesManuais", [...estado.ajustesManuais, novoAjusteManualVazio()]);
  const removerAjuste = (indice) => atualizarEstado("ajustesManuais", estado.ajustesManuais.filter((_, i) => i !== indice));
  const atualizarAjuste = (indice, campos) =>
    atualizarEstado("ajustesManuais", estado.ajustesManuais.map((a, i) => (i === indice ? { ...a, ...campos } : a)));

  const atualizarDependentes = (idLocador, numeroDependentes) =>
    setEstado((atual) => ({
      ...atual,
      proprietariosExtra: { ...atual.proprietariosExtra, [idLocador]: { numeroDependentes } },
    }));

  const reajusteAplicado = (resultado) => {
    setPreparacao((atual) => ({
      ...atual,
      contratoAtivo: { ...atual.contratoAtivo, valorAluguel: resultado.contrato.valorAluguel, dataReajuste: resultado.contrato.dataReajuste },
    }));
    atualizarEstado("reajuste", {
      indice: resultado.reajuste.indice,
      percentual: resultado.reajuste.percentual,
      valorAnterior: resultado.reajuste.valorAnterior,
    });
    setMostrarFormReajuste(false);
  };

  const gerarEBaixar = async () => {
    const erros = validarModal(estado);
    if (erros.length > 0) {
      setErrosValidacao(erros);
      return;
    }
    if (!estado.idContaBancaria) {
      setErrosValidacao(["Selecione a conta bancária de depósito."]);
      return;
    }

    setErrosValidacao([]);
    setErroGeracao(null);
    setGerando(true);
    try {
      const payload = montarPayload({ idImovel: imovelId, anoMes, proprietariosComNome, estado });
      const memoria = await gerarMemoriaCalculo(payload);
      const { blob, nomeArquivo } = await baixarMemoriaCalculoExcel(memoria.id);
      baixarBlob(blob, nomeArquivo);
      onGerado?.();
      onClose();
    } catch (e) {
      console.error("Erro ao gerar a memória de cálculo:", e);
      setErroGeracao(mensagemDeErro(e, "Erro ao gerar a memória de cálculo."));
    } finally {
      setGerando(false);
    }
  };

  const baixarExistente = async () => {
    setGerando(true);
    try {
      const { blob, nomeArquivo } = await baixarMemoriaCalculoExcel(preparacao.memoriaExistente.id);
      baixarBlob(blob, nomeArquivo);
      onClose();
    } catch (e) {
      console.error("Erro ao baixar a memória de cálculo:", e);
      setErroGeracao(mensagemDeErro(e, "Erro ao baixar a memória de cálculo."));
    } finally {
      setGerando(false);
    }
  };

  if (carregando) return <p className="text-gray-500 py-6 text-center">Carregando...</p>;
  if (erroCarga) return <p className="text-red-600 py-6 text-center">{erroCarga}</p>;

  const { contratoAtivo, despesasEmAberto, memoriaExistente } = preparacao;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="memoria-competencia" className="block text-sm text-gray-700 mb-1">Mês de referência</label>
        <input
          id="memoria-competencia"
          type="month"
          value={anoMes}
          onChange={(e) => setAnoMes(e.target.value)}
          className={`${classeInput} max-w-[200px]`}
        />
      </div>

      {!contratoAtivo && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Este imóvel não tem um contrato de locação ativo. Não é possível gerar a memória de cálculo.
        </div>
      )}

      {contratoAtivo && memoriaExistente && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-sm text-blue-800">
            Já existe uma memória gerada para este mês, no valor total de{" "}
            <strong>{formatarMoeda(memoriaExistente.totalAPagar)}</strong>, em{" "}
            {new Date(memoriaExistente.criadoEm).toLocaleString("pt-BR")}.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setPreparacao((atual) => ({ ...atual, memoriaExistente: null }))}>
              Gerar uma nova versão
            </Button>
            <Button variant="primary" icon={Download} type="button" onClick={baixarExistente} disabled={gerando}>
              {gerando ? "Baixando..." : "Baixar Excel"}
            </Button>
          </div>
        </div>
      )}

      {contratoAtivo && !memoriaExistente && (
        <>
          {estaNoMesDeReajuste(contratoAtivo.dataReajuste, anoMes) && (
            mostrarFormReajuste ? (
              <FormularioAplicarReajuste
                idContrato={contratoAtivo.id}
                valorAluguelAtual={contratoAtivo.valorAluguel}
                onAplicado={reajusteAplicado}
                onCancelar={() => setMostrarFormReajuste(false)}
              />
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3 text-sm text-amber-800">
                <span className="flex items-center gap-2">
                  <AlertTriangle size={16} /> Este é o mês de reajuste deste contrato.
                  {estado?.reajuste && " Reajuste já aplicado para esta geração."}
                </span>
                {!estado?.reajuste && (
                  <Button variant="outline" type="button" onClick={() => setMostrarFormReajuste(true)}>
                    Aplicar reajuste
                  </Button>
                )}
              </div>
            )
          )}

          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
              Proprietários — Aluguel: {formatarMoeda(contratoAtivo.valorAluguel)}
            </h3>
            <div className="space-y-2">
              {(preparacao.proprietarios ?? []).map((p) => (
                <div key={p.idLocador} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-700">
                    {nomesLocadores[String(p.idLocador)] || `Locador #${p.idLocador}`} — {p.percentualParticipacao}% (
                    {formatarMoeda((contratoAtivo.valorAluguel * p.percentualParticipacao) / 100)})
                  </span>
                  <label className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                    Dependentes (IRRF)
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={estado?.proprietariosExtra[String(p.idLocador)]?.numeroDependentes ?? "0"}
                      onChange={(e) => atualizarDependentes(String(p.idLocador), e.target.value)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">Despesas em aberto deste imóvel</h3>
            {despesasEmAberto.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhuma despesa em aberto para este imóvel.</p>
            ) : (
              <div className="space-y-2">
                {despesasEmAberto.map((despesa) => {
                  const marcada = Boolean(estado?.despesasSelecionadas[despesa.id]);
                  const selecao = estado?.despesasSelecionadas[despesa.id];
                  return (
                    <div key={despesa.id} className="border border-gray-100 rounded-lg p-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={marcada}
                          onChange={(e) => alternarDespesaExistente(despesa, e.target.checked)}
                        />
                        <span className="font-medium text-gray-900">{despesa.descricao}</span>
                        <span className="text-gray-400">({rotuloTipoDespesa(despesa.tipo)})</span>
                        <span className="ml-auto font-medium text-gray-900">{formatarMoeda(despesa.valor)}</span>
                        <span className="text-xs text-gray-400">venc. {formatarData(despesa.dataVencimento)}</span>
                      </label>

                      {marcada && (
                        <div className="mt-2 pl-6 flex flex-wrap items-center gap-3 text-sm">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name={`aplicacao-${despesa.id}`}
                              checked={selecao.aplicacao === "RATEIO"}
                              onChange={() => atualizarDespesaExistente(despesa.id, { aplicacao: "RATEIO" })}
                            />
                            Ratear entre todos
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name={`aplicacao-${despesa.id}`}
                              checked={selecao.aplicacao === "LOCADOR_ESPECIFICO"}
                              onChange={() => atualizarDespesaExistente(despesa.id, { aplicacao: "LOCADOR_ESPECIFICO" })}
                            />
                            Reembolsar integralmente a
                          </label>
                          {selecao.aplicacao === "LOCADOR_ESPECIFICO" && (
                            <select
                              value={selecao.idLocadorEspecifico}
                              onChange={(e) => atualizarDespesaExistente(despesa.id, { idLocadorEspecifico: e.target.value })}
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                            >
                              <option value="">Selecione...</option>
                              {proprietariosComNome.map((p) => (
                                <option key={p.idLocador} value={p.idLocador}>{p.nome}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-gray-900">Nova despesa extra (ex.: IPTU, tx. de incêndio)</h3>
              <button type="button" onClick={adicionarDespesaNova} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
                <Plus size={16} /> Adicionar
              </button>
            </div>
            <div className="space-y-3">
              {estado?.despesasNovas.map((despesa, indice) => (
                <div key={indice} className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <select
                      value={despesa.tipo}
                      onChange={(e) => atualizarDespesaNova(indice, { tipo: e.target.value })}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                    >
                      {TIPOS_DESPESA.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Descrição"
                      value={despesa.descricao}
                      onChange={(e) => atualizarDespesaNova(indice, { descricao: e.target.value })}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1.5 md:col-span-2"
                    />
                    <CampoDecimal prefixo="R$" placeholder="0,00" value={despesa.valor} onChange={(v) => atualizarDespesaNova(indice, { valor: v })} className="text-sm" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="date"
                      value={despesa.dataVencimento}
                      onChange={(e) => atualizarDespesaNova(indice, { dataVencimento: e.target.value })}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
                    />
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" checked={despesa.aplicacao === "RATEIO"} onChange={() => atualizarDespesaNova(indice, { aplicacao: "RATEIO" })} />
                      Ratear
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" checked={despesa.aplicacao === "LOCADOR_ESPECIFICO"} onChange={() => atualizarDespesaNova(indice, { aplicacao: "LOCADOR_ESPECIFICO" })} />
                      Reembolsar a
                    </label>
                    {despesa.aplicacao === "LOCADOR_ESPECIFICO" && (
                      <select
                        value={despesa.idLocadorEspecifico}
                        onChange={(e) => atualizarDespesaNova(indice, { idLocadorEspecifico: e.target.value })}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                      >
                        <option value="">Selecione...</option>
                        {proprietariosComNome.map((p) => (
                          <option key={p.idLocador} value={p.idLocador}>{p.nome}</option>
                        ))}
                      </select>
                    )}
                    <button type="button" onClick={() => removerDespesaNova(indice)} className="ml-auto p-1 text-gray-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="text-sm font-bold text-gray-900">Ajuste manual (acréscimo/desconto pontual)</h3>
              <button type="button" onClick={adicionarAjuste} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
                <Plus size={16} /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {estado?.ajustesManuais.map((ajuste, indice) => (
                <div key={indice} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center border border-gray-100 rounded-lg p-3">
                  <select
                    value={ajuste.idLocador}
                    onChange={(e) => atualizarAjuste(indice, { idLocador: e.target.value })}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                  >
                    <option value="">Proprietário...</option>
                    {proprietariosComNome.map((p) => (
                      <option key={p.idLocador} value={p.idLocador}>{p.nome}</option>
                    ))}
                  </select>
                  <select
                    value={ajuste.tipo}
                    onChange={(e) => atualizarAjuste(indice, { tipo: e.target.value })}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white"
                  >
                    <option value="DESCONTO">Desconto</option>
                    <option value="ACRESCIMO">Acréscimo</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Descrição"
                    value={ajuste.descricao}
                    onChange={(e) => atualizarAjuste(indice, { descricao: e.target.value })}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
                  />
                  <CampoDecimal prefixo="R$" placeholder="0,00" value={ajuste.valor} onChange={(v) => atualizarAjuste(indice, { valor: v })} className="text-sm" />
                  <button type="button" onClick={() => removerAjuste(indice)} className="justify-self-end p-1 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">Conta para depósito</h3>
            <select
              value={estado?.idContaBancaria || ""}
              onChange={(e) => {
                const conta = contas.find((c) => String(c.id) === e.target.value);
                selecionarConta(e.target.value, conta);
              }}
              className={`${classeInput} bg-white`}
            >
              <option value="">Selecione a conta...</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.descricao} — {c.banco} · Ag. {c.agencia} · Cc {c.numeroConta}{c.padrao ? " (padrão)" : ""}
                </option>
              ))}
            </select>
            {contas.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Nenhuma conta cadastrada ainda. Cadastre uma em "Contas Bancárias" no menu lateral.
              </p>
            )}
          </section>

          {errosValidacao.length > 0 && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <ul className="list-disc pl-5 space-y-0.5">
                {errosValidacao.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {erroGeracao && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">
              {erroGeracao}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button variant="secondary" type="button" onClick={onClose} disabled={gerando}>
              Cancelar
            </Button>
            <Button variant="primary" type="button" onClick={gerarEBaixar} disabled={gerando}>
              {gerando ? "Gerando..." : "Gerar e baixar Excel"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
