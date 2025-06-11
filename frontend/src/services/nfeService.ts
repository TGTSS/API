import axios from 'axios';
import { ConsultaNFeResponse, Certificado } from '../types/nfe';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const nfeService = {
  // Listar todos os certificados
  listarCertificados: async (): Promise<Certificado[]> => {
    const response = await axios.get(`${API_URL}/nfe/certificados`);
    return response.data;
  },

  // Consultar notas fiscais usando um certificado específico
  consultarNotas: async (certificadoId: string): Promise<ConsultaNFeResponse> => {
    const response = await axios.get(`${API_URL}/nfe/consultar-notas/${certificadoId}`);
    return response.data;
  },

  // Importar novo certificado
  importarCertificado: async (formData: FormData): Promise<Certificado> => {
    const response = await axios.post(`${API_URL}/nfe/importar-certificado`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Atualizar certificado
  atualizarCertificado: async (id: string, data: Partial<Certificado>): Promise<Certificado> => {
    const response = await axios.put(`${API_URL}/nfe/certificados/${id}`, data);
    return response.data;
  },

  // Excluir certificado
  excluirCertificado: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/nfe/certificados/${id}`);
  }
}; 