import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../Button";
import ModalContainer from "../ModalContainer";
import { formatarData, formatarMoeda } from "../../utils/formatacao";

// Exclusão de uma despesa em aberto: ação sem volta, então o botão de apagar só é liberado depois
// que o usuário marca que está ciente das consequências — igual a outras confirmações destrutivas
// do sistema (ex.: ModalConfirmacaoPosse), mas com uma trava extra por envolver um registro contábil.
//
// Importante: o chamador deve DESMONTAR este componente (ex.: `{despesa && <ModalExcluirDespesa .../>}`)
// ao cancelar ou concluir a exclusão, em vez de só trocar a prop "despesa" por outra. Assim cada
// despesa aberta para exclusão sempre começa com a marcação "estou ciente" limpa, sem precisar de
// um efeito só para resetar esse estado.
export default function ModalExcluirDespesa({ despesa, onCancelar, onConfirmar, excluindo }) {
  const [cienteDasConsequencias, setCienteDasConsequencias] = useState(false);

  if (!despesa) return null;

  return (
    <ModalContainer isOpen onClose={onCancelar} title="Excluir despesa">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Você está prestes a excluir a despesa{" "}
              <span className="font-bold text-gray-900">"{despesa.descricao}"</span>, no valor de{" "}
              <span className="font-bold text-gray-900">{formatarMoeda(despesa.valor)}</span>, com
              vencimento em {formatarData(despesa.dataVencimento)}.
            </p>
            <p>
              Essa ação <span className="font-bold">não pode ser desfeita</span>. O lançamento sai
              definitivamente do histórico de despesas deste imóvel e deixa de poder ser incluído em
              qualquer Memória de Cálculo. Se a despesa ainda for devida, prefira lançá-la de novo com
              os dados corretos em vez de deixar o compromisso sem nenhum registro.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={cienteDasConsequencias}
            onChange={(e) => setCienteDasConsequencias(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          Estou ciente das consequências e quero excluir esta despesa.
        </label>

        <div className="flex justify-end gap-3 pt-2 border-t mt-2">
          <Button variant="secondary" type="button" onClick={onCancelar} disabled={excluindo}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirmar}
            disabled={!cienteDasConsequencias || excluindo}
            className="bg-red-600 hover:bg-red-700 text-white border-none"
          >
            {excluindo ? "Excluindo..." : "Excluir despesa"}
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}
