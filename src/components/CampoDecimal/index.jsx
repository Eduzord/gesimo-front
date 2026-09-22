// Campo de texto para números decimais no padrão brasileiro: aceita dígitos e um separador (, ou .),
// com prefixo (ex.: "R$") e sufixo (ex.: "%") opcionais. "onChange" recebe só o texto já filtrado.
const APENAS_DECIMAL = /^[0-9]*[.,]?[0-9]*$/;

export default function CampoDecimal({ value, onChange, prefixo, sufixo, className = "", ...resto }) {
  return (
    <div className="relative">
      {prefixo && (
        <span className="absolute left-3 top-2.5 text-xs text-gray-400 pointer-events-none">{prefixo}</span>
      )}
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          if (APENAS_DECIMAL.test(e.target.value)) onChange(e.target.value);
        }}
        className={`w-full py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400 ${
          prefixo ? "pl-9" : "pl-3"
        } ${sufixo ? "pr-8" : "pr-3"} ${className}`}
        {...resto}
      />
      {sufixo && (
        <span className="absolute right-3 top-2.5 text-xs text-gray-400 pointer-events-none">{sufixo}</span>
      )}
    </div>
  );
}
