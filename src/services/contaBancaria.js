import { api } from "./api";

const corpo = (resposta) => resposta.data?.data ?? resposta.data;

export const listarContasBancarias = async (status) =>
  corpo(await api.get("/contas-bancarias", { params: status ? { status } : {} }));

export const buscarContaBancariaPadrao = async () => {
  try {
    return corpo(await api.get("/contas-bancarias/padrao"));
  } catch {
    return null; // sem conta padrão cadastrada ainda
  }
};

export const criarContaBancaria = async (dados) => corpo(await api.post("/contas-bancarias", dados));

export const atualizarContaBancaria = async (id, dados) => corpo(await api.patch(`/contas-bancarias/${id}`, dados));

export const tornarContaBancariaPadrao = async (id) => corpo(await api.patch(`/contas-bancarias/${id}/tornar-padrao`));

export const reativarContaBancaria = async (id) => corpo(await api.patch(`/contas-bancarias/${id}/reativar`));

export const inativarContaBancaria = async (id) => corpo(await api.delete(`/contas-bancarias/${id}`));

export const excluirContaBancariaDefinitivo = async (id) => corpo(await api.delete(`/contas-bancarias/${id}/hard`));
