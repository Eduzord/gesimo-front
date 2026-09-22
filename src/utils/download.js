// Dispara o download de um Blob no navegador (primeiro uso disso no projeto: sem precedente a seguir,
// então é o padrão mais comum — link <a download> sintético + URL de objeto revogada logo em seguida).
export function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
