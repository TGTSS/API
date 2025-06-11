export interface DocumentoNFe {
  nsu: string;
  schema: string;
  chaveNFe: string | null;
  resumo: {
    emitente?: string;
    valor?: string;
    dataEmissao?: string;
    situacao?: string;
  };
  xmlCompleto?: string;
  error?: string;
  raw?: string;
}

export interface ConsultaNFeResponse {
  status: string;
  motivo: string;
  ultimoNSU: string;
  maxNSU: string;
  documentos: DocumentoNFe[];
}

export interface Certificado {
  _id: string;
  nome: string;
  cnpj: string;
  ufAutor: string;
  dataValidade: string;
  ativo: boolean;
  ultimoNSU: number;
  maxNSU: number;
}
