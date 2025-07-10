import axios from "axios";

const BASE_URL = "http://localhost:3000/api/nfe";

// Função para buscar apenas notas novas
async function buscarNotasNovas(certificadoId, ultimosN = 0) {
  try {
    const url =
      ultimosN > 0
        ? `${BASE_URL}/buscar-novas/${certificadoId}?ultimosN=${ultimosN}`
        : `${BASE_URL}/buscar-novas/${certificadoId}`;

    console.log(
      `\n=== Buscando notas novas para certificado: ${certificadoId}${
        ultimosN > 0 ? ` (últimos ${ultimosN} NSUs + novos)` : ""
      } ===`
    );
    const response = await axios.get(url);

    if (response.data.success) {
      console.log("✅ Busca concluída com sucesso!");
      console.log(`📊 Resumo:`);
      console.log(`   - NSU inicial: ${response.data.data.nsuInicial}`);
      console.log(`   - NSU final: ${response.data.data.nsuFinal}`);
      if (response.data.data.ultimosN > 0) {
        console.log(`   - Últimos NSUs buscados: ${response.data.data.ultimosN}`);
        console.log(`   - NSU inicial calculado: ${response.data.data.nsuInicialCalculado}`);
      }
      console.log(
        `   - Notas encontradas: ${response.data.data.totalEncontradas}`
      );
      console.log(`   - Notas salvas: ${response.data.data.totalSalvas}`);

      if (response.data.data.totalSalvas > 0) {
        console.log(`\n📋 Primeiras notas encontradas:`);
        response.data.data.notas.slice(0, 5).forEach((nota, index) => {
          console.log(
            `   ${index + 1}. Chave: ${nota.chaveAcesso} (NSU: ${nota.nsu})`
          );
        });
      }
    } else {
      console.log("❌ Erro na busca:", response.data.message);
    }

    return response.data;
  } catch (error) {
    console.error(
      "❌ Erro ao buscar notas novas:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Função para consultar status do NSU
async function consultarStatusNSU(certificadoId) {
  try {
    const response = await axios.get(`${BASE_URL}/status-nsu/${certificadoId}`);
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao consultar status:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Função principal
async function main() {
  const certificadoId = process.argv[2];
  const ultimosN = parseInt(process.argv[3]) || 0;

  if (!certificadoId) {
    console.log(
      "❌ Uso: node scripts/buscarNotasNovas.js <certificadoId> [ultimosN]"
    );
    console.log(
      "Exemplo: node scripts/buscarNotasNovas.js 6849d8bdd24daf1b5a3560c2"
    );
    console.log(
      "Exemplo com últimos NSUs: node scripts/buscarNotasNovas.js 6849d8bdd24daf1b5a3560c2 10"
    );
    process.exit(1);
  }

  console.log("🚀 Iniciando busca automática de notas novas...");

  // Verificar status atual
  const status = await consultarStatusNSU(certificadoId);
  if (status) {
    console.log(`\n📈 Status atual:`);
    console.log(`   - Último NSU: ${status.data.ultimoNSU}`);
    console.log(`   - Máximo NSU: ${status.data.maxNSU}`);
    console.log(`   - Certificado ativo: ${status.data.ativo ? "✅" : "❌"}`);

    if (status.data.ultimoNSU < status.data.maxNSU) {
      console.log(
        `\n🔄 Há ${status.data.maxNSU - status.data.ultimoNSU} NSUs pendentes!`
      );
    } else {
      console.log("\n✅ NSU está atualizado!");
    }
  }

  // Executar busca
  const resultado = await buscarNotasNovas(certificadoId, ultimosN);

  if (resultado && resultado.success) {
    console.log("\n✅ Processo concluído com sucesso!");
  } else {
    console.log("\n❌ Processo falhou!");
    process.exit(1);
  }
}

// Executar o script
main().catch((error) => {
  console.error("❌ Erro fatal:", error.message);
  process.exit(1);
});
