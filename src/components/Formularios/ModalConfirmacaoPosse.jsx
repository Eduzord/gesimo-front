import React from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../Button";
import ModalContainer from "../ModalContainer";

// Modal de confirmação exibido quando a soma dos percentuais de posse fica abaixo de 100%.
export default function ModalConfirmacaoPosse({ isOpen, totalPercentual, onCancelar, onConfirmar, loading }) {
  const totalFormatado = totalPercentual.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const faltante = Math.max(0, 100 - totalPercentual)
    .toFixed(2)
    .replace(".", ",");

  return (
    <ModalContainer isOpen={isOpen} onClose={onCancelar} title="Posse do imóvel incompleta">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <p className="text-sm text-gray-600">
            A soma da participação dos proprietários informados é de{" "}
            <span className="font-bold text-gray-900">{totalFormatado}%</span>, faltando{" "}
            <span className="font-bold text-gray-900">{faltante}%</span> para completar 100% da posse do
            imóvel. Deseja salvar mesmo assim?
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t mt-2">
          <Button variant="secondary" type="button" onClick={onCancelar} disabled={loading}>
            Corrigir percentuais
          </Button>
          <Button variant="primary" type="button" onClick={onConfirmar} disabled={loading}>
            {loading ? "Salvando..." : "Salvar mesmo assim"}
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}
