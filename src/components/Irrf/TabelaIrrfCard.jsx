import Badge from "../Badge";
import { formatarData, formatarDecimal, formatarMoeda } from "../../utils/formatacao";
import { formatarPercentual } from "../../utils/posse";
import { ROTULOS_SITUACAO, descreverVigencia } from "../../utils/irrf";

// Exibição somente leitura de uma versão da tabela IRRF (usada na página de consulta)
export default function TabelaIrrfCard({ tabela }) {
  const { redutor } = tabela;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-900">
          Vigência: {descreverVigencia(tabela, formatarData)}
        </h2>
        <Badge variant={tabela.situacao}>{ROTULOS_SITUACAO[tabela.situacao]}</Badge>
      </div>
      {tabela.descricao && <p className="text-sm text-gray-500 mb-4">{tabela.descricao}</p>}

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm text-left">
          <caption className="sr-only">Faixas da tabela progressiva do IRRF</caption>
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Faixa</th>
              <th scope="col" className="px-4 py-3 font-medium">Base de cálculo (de)</th>
              <th scope="col" className="px-4 py-3 font-medium">Base de cálculo (até)</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Alíquota</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Parcela a deduzir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tabela.faixas.map((faixa) => (
              <tr key={faixa.ordem} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{faixa.ordem}</td>
                <td className="px-4 py-3 text-gray-900">{formatarMoeda(faixa.valorDe)}</td>
                <td className="px-4 py-3 text-gray-900">
                  {faixa.valorAte === null ? "Sem limite" : formatarMoeda(faixa.valorAte)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {faixa.aliquota === 0 ? "Isento" : formatarPercentual(faixa.aliquota)}
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{formatarMoeda(faixa.parcelaADeduzir)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Dedução por dependente</dt>
          <dd className="font-medium text-gray-900">{formatarMoeda(tabela.deducaoDependente)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Redutor</dt>
          <dd className="font-medium text-gray-900">
            {redutor ? (
              <>
                Para rendimento tributável de até {formatarMoeda(redutor.limiteIsencao)}, o imposto é zerado. Entre{" "}
                {formatarMoeda(redutor.limiteIsencao)} e {formatarMoeda(redutor.limiteSuperior)}, o imposto calculado é
                reduzido em {formatarMoeda(redutor.constante)} − {formatarDecimal(redutor.coeficiente)} × rendimento
                tributável. Acima disso, não há redução.
              </>
            ) : (
              "Não se aplica a esta tabela"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
