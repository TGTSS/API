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

// Função para buscar apenas notas novas
async function buscarNotasNovas(certificadoId) {
  try {
    console.log(`\n=== Buscando apenas notas novas ===`);
    const response = await axios.get(
      `${BASE_URL}/buscar-novas/${certificadoId}`
    );
    console.log("Resultado da busca de notas novas:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao buscar notas novas:",
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

  // 2. Se o último NSU for menor que o máximo, oferecer opções
  if (status.data.ultimoNSU < status.data.maxNSU) {
    console.log(
      `\nNSU está atrasado! Último: ${status.data.ultimoNSU}, Máximo: ${status.data.maxNSU}`
    );

    // Perguntar qual opção escolher
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const resposta = await new Promise((resolve) => {
      rl.question(
        "\nEscolha uma opção:\n1. Buscar apenas notas novas (recomendado)\n2. Forçar busca a partir do último NSU\n3. Não fazer nada\nOpção (1/2/3): ",
        resolve
      );
    });

    rl.close();

    if (resposta === "1") {
      // Buscar apenas notas novas
      console.log(`\nBuscando apenas notas novas...`);
      await buscarNotasNovas(certificadoId);
    } else if (resposta === "2") {
      // Continuar a partir do último NSU + 1
      const nsuInicial = status.data.ultimoNSU + 1;
      console.log(`\nContinuando a partir do NSU: ${nsuInicial}`);
      await forcarBuscaNSU(certificadoId, nsuInicial);
    } else {
      console.log("\nNenhuma ação realizada.");
    }
  } else {
    console.log("\nNSU está atualizado!");
    
    // Perguntar se quer buscar notas novas mesmo assim
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const resposta = await new Promise((resolve) => {
      rl.question(
        "\nDeseja buscar notas novas mesmo assim? (s/n): ",
        resolve
      );
    });

    rl.close();

    if (resposta.toLowerCase() === "s") {
      await buscarNotasNovas(certificadoId);
    }
  }

  // 3. Consultar status novamente para verificar se foi atualizado
  console.log("\n=== Verificando status após operações ===");
  await consultarStatusNSU(certificadoId);
}

// Executar o script
main().catch(console.error);
