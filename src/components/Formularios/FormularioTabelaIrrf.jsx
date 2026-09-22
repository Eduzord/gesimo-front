import { useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import Button from "../Button";
import CampoDecimal from "../CampoDecimal";
import { atualizarTabelaIrrf, criarTabelaIrrf } from "../../services/irrf";
import { formatarMoeda } from "../../utils/formatacao";
import { mensagemDeErro } from "../../utils/erros";
import { faixaVazia, formParaPayload, limiteInferior, resumoIsencao, validarForm } from "../../utils/irrf";

const classeInput =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";

// Cria (sem "tabelaId") ou edita ("tabelaId") uma versão da tabela IRRF.
// Só o limite "Até" de cada faixa é informado; o "De" é calculado (= "Até" anterior + R$ 0,01) para que
// não sobrem lacunas nem sobreposições. A última faixa fica sem limite.
export default function FormularioTabelaIrrf({ formInicial, tabelaId, aviso, onClose, onSuccess }) {
  const [form, setForm] = useState(formInicial);
  const [erros, setErros] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));
  const alterarRedutor = (campo, valor) =>
    setForm((atual) => ({ ...atual, redutor: { ...atual.redutor, [campo]: valor } }));
  const alterarFaixa = (indice, campo, valor) =>
    setForm((atual) => ({
      ...atual,
      faixas: atual.faixas.map((faixa, i) => (i === indice ? { ...faixa, [campo]: valor } : faixa)),
    }));

  // A nova faixa entra antes da última, que precisa continuar sem limite
  const adicionarFaixa = () =>
    setForm((atual) => {
      const faixas = [...atual.faixas];
      faixas.splice(Math.max(faixas.length - 1, 0), 0, faixaVazia());
      return { ...atual, faixas };
    });

  const removerFaixa = (indice) =>
    setForm((atual) => ({ ...atual, faixas: atual.faixas.filter((_, i) => i !== indice) }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const problemas = validarForm(form);
    if (problemas.length > 0) {
      setErros(problemas);
      return;
    }

    setErros([]);
    setSalvando(true);
    try {
      const payload = formParaPayload(form);
      if (tabelaId) await atualizarTabelaIrrf(tabelaId, payload);
      else await criarTabelaIrrf(payload);
      onSuccess();
    } catch (erro) {
      console.error("Erro ao salvar a tabela IRRF:", erro);
      setErros(mensagemDeErro(erro, "Erro ao salvar a tabela IRRF. Tente novamente.").split("\n"));
    } finally {
      setSalvando(false);
    }
  };

  const isencaoAte = resumoIsencao(form.faixas);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {aviso && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>{aviso}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="irrf-vigencia" className="block text-sm text-gray-700 mb-1">
            Início da vigência
          </label>
          <input
            id="irrf-vigencia"
            type="date"
            value={form.vigenciaInicio}
            onChange={(e) => alterar("vigenciaInicio", e.target.value)}
            className={classeInput}
          />
          <p className="mt-1 text-xs text-gray-500">
            A tabela anterior passa a valer até o dia anterior a esta data.
          </p>
        </div>

        <div>
          <label htmlFor="irrf-dependente" className="block text-sm text-gray-700 mb-1">
            Dedução por dependente
          </label>
          <CampoDecimal
            id="irrf-dependente"
            prefixo="R$"
            placeholder="0,00"
            value={form.deducaoDependente}
            onChange={(valor) => alterar("deducaoDependente", valor)}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="irrf-descricao" className="block text-sm text-gray-700 mb-1">
            Descrição <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            id="irrf-descricao"
            type="text"
            maxLength={255}
            placeholder="Ex.: Tabela mensal - norma de referência"
            value={form.descricao}
            onChange={(e) => alterar("descricao", e.target.value)}
            className={classeInput}
          />
        </div>
      </div>

      <section aria-labelledby="irrf-faixas">
        <h3 id="irrf-faixas" className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">
          Faixas da tabela
        </h3>

        <div className="overflow-x-auto">
          <div className="min-w-[640px] space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_7rem_1fr_2rem] gap-2 text-xs text-gray-500 uppercase">
              <span>#</span>
              <span>De</span>
              <span>Até</span>
              <span>Alíquota</span>
              <span>Parcela a deduzir</span>
              <span />
            </div>

            {form.faixas.map((faixa, indice) => {
              const ehUltima = indice === form.faixas.length - 1;
              const de = limiteInferior(form.faixas, indice);

              return (
                <div key={indice} className="grid grid-cols-[2rem_1fr_1fr_7rem_1fr_2rem] gap-2 items-center">
                  <span className="text-sm text-gray-500">{indice + 1}</span>

                  <span className="px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-600">
                    {de === null ? "—" : formatarMoeda(de)}
                  </span>

                  {ehUltima ? (
                    <span className="px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-500 italic">Sem limite</span>
                  ) : (
                    <CampoDecimal
                      prefixo="R$"
                      placeholder="0,00"
                      aria-label={`Limite superior da faixa ${indice + 1}`}
                      value={faixa.valorAte}
                      onChange={(valor) => alterarFaixa(indice, "valorAte", valor)}
                    />
                  )}

                  <CampoDecimal
                    sufixo="%"
                    placeholder="0"
                    aria-label={`Alíquota da faixa ${indice + 1}`}
                    value={faixa.aliquota}
                    onChange={(valor) => alterarFaixa(indice, "aliquota", valor)}
                  />

                  <CampoDecimal
                    prefixo="R$"
                    placeholder="0,00"
                    aria-label={`Parcela a deduzir da faixa ${indice + 1}`}
                    value={faixa.parcelaADeduzir}
                    onChange={(valor) => alterarFaixa(indice, "parcelaADeduzir", valor)}
                  />

                  <button
                    type="button"
                    onClick={() => removerFaixa(indice)}
                    disabled={form.faixas.length <= 1}
                    title="Remover faixa"
                    aria-label={`Remover faixa ${indice + 1}`}
                    className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={adicionarFaixa}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Plus size={16} /> Adicionar faixa
          </button>

          {isencaoAte !== null && (
            <p className="text-xs text-gray-500">
              Faixa isenta: base de cálculo até <strong>{formatarMoeda(isencaoAte)}</strong> não paga IRRF.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="irrf-redutor">
        <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            id="irrf-redutor"
            type="checkbox"
            checked={form.usarRedutor}
            onChange={(e) => alterar("usarRedutor", e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Esta tabela usa <strong>redutor</strong> (isenção até um teto e redução gradual acima dele)
          </span>
        </label>

        {form.usarRedutor && (
          <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="irrf-red-isencao" className="block text-sm text-gray-700 mb-1">
                  Limite de isenção total
                </label>
                <CampoDecimal
                  id="irrf-red-isencao"
                  prefixo="R$"
                  value={form.redutor.limiteIsencao}
                  onChange={(valor) => alterarRedutor("limiteIsencao", valor)}
                />
              </div>
              <div>
                <label htmlFor="irrf-red-superior" className="block text-sm text-gray-700 mb-1">
                  Limite superior do redutor
                </label>
                <CampoDecimal
                  id="irrf-red-superior"
                  prefixo="R$"
                  value={form.redutor.limiteSuperior}
                  onChange={(valor) => alterarRedutor("limiteSuperior", valor)}
                />
              </div>
              <div>
                <label htmlFor="irrf-red-constante" className="block text-sm text-gray-700 mb-1">
                  Constante
                </label>
                <CampoDecimal
                  id="irrf-red-constante"
                  prefixo="R$"
                  value={form.redutor.constante}
                  onChange={(valor) => alterarRedutor("constante", valor)}
                />
              </div>
              <div>
                <label htmlFor="irrf-red-coeficiente" className="block text-sm text-gray-700 mb-1">
                  Coeficiente
                </label>
                <CampoDecimal
                  id="irrf-red-coeficiente"
                  value={form.redutor.coeficiente}
                  onChange={(valor) => alterarRedutor("coeficiente", valor)}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Os limites e a fórmula valem para o <strong>rendimento tributável bruto</strong> (antes das deduções, e não
              para a base de cálculo). Até o limite de isenção o imposto é zerado. Entre os dois limites, o imposto
              calculado pela tabela é reduzido em <em>constante − coeficiente × rendimento tributável</em>. Acima do
              limite superior não há redução. Confira os valores na fonte oficial da Receita Federal.
            </p>
          </div>
        )}
      </section>

      {erros.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium mb-1">Corrija antes de salvar:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {erros.map((erro, indice) => (
              <li key={indice}>{erro}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-4 flex justify-end gap-3 border-t">
        <Button variant="secondary" onClick={onClose} type="button" disabled={salvando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : tabelaId ? "Salvar alterações" : "Cadastrar tabela"}
        </Button>
      </div>
    </form>
  );
}
