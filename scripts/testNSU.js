import axios from "axios";

const BASE_URL = "http://localhost:3000/api/nfe";

// Função para consultar o status do NSU
async function consultarStatusNSU(certificadoId) {
  try {
    console.log(
      `\n=== Consultando status do NSU para certificado: ${certificadoId} ===`
    );
    const response = await axios.get(`${BASE_URL}/status-nsu/${certificadoId}`);
    console.log("Status do NSU:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao consultar status do NSU:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Função para forçar busca a partir de um NSU específico
async function forcarBuscaNSU(certificadoId, nsuInicial) {
  try {
    console.log(`\n=== Forçando busca a partir do NSU: ${nsuInicial} ===`);
    const response = await axios.get(
      `${BASE_URL}/consultar-notas/${certificadoId}?forcarNSU=${nsuInicial}`
    );
    console.log("Resultado da busca forçada:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao forçar busca:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Função para busca incremental
async function buscaIncremental(certificadoId) {
  try {
    console.log(`\n=== Realizando busca incremental ===`);
    const response = await axios.get(
      `${BASE_URL}/consultar-notas/${certificadoId}`
    );
    console.log("Resultado da busca incremental:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Erro na busca incremental:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Função para busca completa
async function buscaCompleta(certificadoId) {
  try {
    console.log(`\n=== Realizando busca completa ===`);
    const response = await axios.get(
      `${BASE_URL}/consultar-notas/${certificadoId}?tipo=completa`
    );
    console.log("Resultado da busca completa:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Erro na busca completa:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Função principal
async function main() {
  const certificadoId = "6849d8bdd24daf1b5a3560c2"; // Substitua pelo ID do seu certificado

  console.log("=== TESTE DE CORREÇÃO DO NSU ===");

  // 1. Consultar status atual
  const status = await consultarStatusNSU(certificadoId);
  if (!status) {
    console.log(
      "Não foi possível consultar o status. Verifique se o servidor está rodando."
    );
    return;
  }

  console.log(`\nStatus atual:`);
  console.log(`- Último NSU: ${status.data.ultimoNSU}`);
  console.log(`- Máximo NSU: ${status.data.maxNSU}`);
  console.log(`- Certificado ativo: ${status.data.ativo}`);

  // 2. Mostrar opções de busca
  console.log("\n=== OPÇÕES DE BUSCA ===");
  console.log("1. Busca incremental (padrão - apenas documentos novos)");
  console.log("2. Busca completa (todos os documentos desde o início)");
  console.log("3. Forçar busca a partir de um NSU específico");
  console.log("4. Apenas consultar status (não fazer busca)");

  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const opcao = await new Promise((resolve) => {
    rl.question("\nEscolha uma opção (1-4): ", resolve);
  });

  rl.close();

  switch (opcao) {
    case "1":
      console.log("\nExecutando busca incremental...");
      await buscaIncremental(certificadoId);
      break;
    case "2":
      console.log("\nExecutando busca completa...");
      await buscaCompleta(certificadoId);
      break;
    case "3":
      const nsuEspecifico = await new Promise((resolve) => {
        const rl2 = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        rl2.question("Digite o NSU inicial: ", (resposta) => {
          rl2.close();
          resolve(resposta);
        });
      });
      console.log(`\nForçando busca a partir do NSU: ${nsuEspecifico}`);
      await forcarBuscaNSU(certificadoId, parseInt(nsuEspecifico));
      break;
    case "4":
      console.log("\nApenas consultando status...");
      break;
    default:
      console.log("\nOpção inválida. Executando busca incremental...");
      await buscaIncremental(certificadoId);
  }

  // 3. Consultar status novamente para verificar se foi atualizado
  console.log("\n=== Verificando status após operações ===");
  await consultarStatusNSU(certificadoId);
}

// Executar o script
main().catch(console.error);
