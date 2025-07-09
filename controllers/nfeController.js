import axios from "axios";
import xml2js from "xml2js";
import util from "util";
import zlib from "zlib";
import https from "https";
import NFe from "../models/NFe.js";
import NFeRecentes from "../models/NFeRecentes.js";
import Certificado from "../models/Certificado.js";
import { getAgentOptions, updateNSU } from "../services/certificateService.js";

const parseString = util.promisify(xml2js.parseString);
const gunzip = util.promisify(zlib.gunzip);

const SEFAZ_URL =
  "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";

const buildSoapEnvelope = (cnpj, ufAutor, ultimoNSU) => {
  console.log(
    `Consultando SEFAZ para CNPJ: ${cnpj}, UF: ${ufAutor}, a partir do NSU: ${ultimoNSU}`
  );
  return `<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">
    <soapenv:Header>
      <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
        <cUF>${ufAutor}</cUF>
        <versaoDados>1.01</versaoDados>
      </nfeCabecMsg>
    </soapenv:Header>
    <soapenv:Body>
      <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
        <nfeDadosMsg>
          <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
            <tpAmb>1</tpAmb>
            <cUFAutor>${ufAutor}</cUFAutor>
            <CNPJ>${cnpj}</CNPJ>
            <distNSU>
              <ultNSU>${ultimoNSU.toString().padStart(15, "0")}</ultNSU>
            </distNSU>
          </distDFeInt>
        </nfeDadosMsg>
      </nfeDistDFeInteresse>
    </soapenv:Body>
  </soapenv:Envelope>`;
};

const processarNotaFiscal = async (docZip) => {
  try {
    console.log(
      `Processando documento - NSU: ${docZip.$?.NSU || "N/A"}, Schema: ${
        docZip.$?.schema || "N/A"
      }`
    );

    // Descomprimir o conteúdo
    const buffer = Buffer.from(docZip._, "base64");
    const decompressed = await gunzip(buffer);
    const xml = decompressed.toString("utf-8");

    // Converter XML para objeto com processamento de tags
    const result = await parseString(xml, {
      explicitArray: false,
      tagNameProcessors: [(key) => key.replace(/^[a-zA-Z0-9]+:/, "")],
    });

    // Extrair dados relevantes
    const nfe = result.resNFe || result.procEventoNFe;
    if (!nfe) {
      console.log("Documento não contém dados de NFe ou evento");
      return null;
    }

    // Verificar se é um documento de evento (procEventoNFe) que não tem chave de acesso
    if (result.procEventoNFe) {
      console.log(
        "Documento de evento detectado - ignorando (não tem chave de acesso)"
      );
      return null;
    }

    // Verificar se tem chave de acesso
    if (!nfe.chNFe) {
      console.log("Documento sem chave de acesso - ignorando");
      return null;
    }

    // Mapear status da SEFAZ para nosso modelo
    const statusMap = {
      1: "authorized",
      2: "cancelled",
      3: "pending",
    };

    // Processar dados com base no schema
    let dados = {
      chaveAcesso: nfe.chNFe,
      status: statusMap[nfe.cSitNFe] || "pending",
      xmlContent: xml,
      value: parseFloat(nfe.vNF || "0"),
      issuer: {
        nome: nfe.xNome,
        cnpj: nfe.CNPJ,
        ie: nfe.IE,
        endereco: {}, // Endereço não disponível no resumo
      },
      recipient: {
        endereco: {}, // Endereço não disponível no resumo
      },
      produtos: [], // Produtos não disponíveis no resumo
      // Dados do NSU
      nsu: docZip.$?.NSU || "",
      schema: docZip.$?.schema || "",
    };

    console.log(
      `Documento processado com sucesso - Chave: ${dados.chaveAcesso}, NSU: ${dados.nsu}`
    );
    return dados;
  } catch (error) {
    console.error(`Erro ao processar documento: ${error.message}`);
    return null;
  }
};

// Função para consultar o status atual do NSU de um certificado
export const consultarStatusNSU = async (req, res) => {
  try {
    const { certificadoId } = req.params;

    console.log(`Consultando status do NSU para certificado: ${certificadoId}`);

    if (!certificadoId) {
      return res.status(400).json({
        message: "ID do certificado é obrigatório",
        details: "O parâmetro certificadoId não foi fornecido",
      });
    }

    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      return res.status(404).json({
        message: "Certificado não encontrado",
        details: "Não foi encontrado um certificado com o ID fornecido",
      });
    }

    return res.json({
      success: true,
      message: "Status do NSU consultado com sucesso",
      data: {
        certificadoId: certificado._id,
        cnpj: certificado.cnpj,
        ultimoNSU: certificado.ultimoNSU || 0,
        maxNSU: certificado.maxNSU || 0,
        ativo: certificado.ativo,
        dataValidade: certificado.dataValidade,
        ultimaAtualizacao: certificado.updatedAt,
      },
    });
  } catch (error) {
    console.error("Erro ao consultar status do NSU:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao consultar status do NSU",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Função para validar o último NSU salvo e determinar o ponto de partida
const validarUltimoNSUSalvo = async (certificadoId) => {
  try {
    console.log("Validando último NSU salvo no banco...");

    // Buscar o maior NSU salvo no banco para este certificado
    const ultimaNFeSalva = await NFeRecentes.findOne(
      { certificadoId: certificadoId },
      {},
      { sort: { nsu: -1 } }
    );

    if (ultimaNFeSalva && ultimaNFeSalva.nsu) {
      const ultimoNSUSalvo = parseInt(ultimaNFeSalva.nsu);
      console.log(`Último NSU salvo no banco: ${ultimoNSUSalvo}`);
      return ultimoNSUSalvo;
    }

    console.log("Nenhum NSU encontrado no banco, começando do zero");
    return 0;
  } catch (error) {
    console.error("Erro ao validar último NSU salvo:", error.message);
    return 0;
  }
};

// Função para buscar apenas notas novas (incremental)
const buscarNotasIncremental = async (certificado, agentOptions) => {
  let todasNotas = [];
  let nsuAtual = 0;
  let maxNSU = 0;
  let tentativas = 0;
  const maxTentativas = 100;
  let status656Count = 0;
  const maxStatus656Retries = 3;

  // Validar o último NSU salvo
  const ultimoNSUSalvo = await validarUltimoNSUSalvo(certificado._id);

  // Determinar o ponto de partida
  if (certificado.ultimoNSU && certificado.ultimoNSU > ultimoNSUSalvo) {
    nsuAtual = certificado.ultimoNSU;
    console.log(`Usando último NSU do certificado: ${nsuAtual}`);
  } else if (ultimoNSUSalvo > 0) {
    nsuAtual = ultimoNSUSalvo;
    console.log(`Usando último NSU salvo no banco: ${nsuAtual}`);
  } else {
    nsuAtual = 0;
    console.log("Iniciando busca desde o início (NSU 0)");
  }

  console.log("Iniciando busca incremental de notas...");
  console.log(`NSU inicial: ${nsuAtual}`);

  while (tentativas < maxTentativas) {
    tentativas++;
    console.log(
      `Tentativa ${tentativas}: Consultando a partir do NSU ${nsuAtual}`
    );

    const envelope = buildSoapEnvelope(
      certificado.cnpj,
      certificado.ufAutor,
      nsuAtual
    );

    try {
      const response = await axios.post(SEFAZ_URL, envelope, {
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          SOAPAction:
            "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse",
        },
        httpsAgent: new https.Agent(agentOptions),
      });

      const parsedResponse = await parseString(response.data);
      const retDistDFeInt =
        parsedResponse["soap:Envelope"]["soap:Body"][0][
          "nfeDistDFeInteresseResponse"
        ][0]["nfeDistDFeInteresseResult"][0]["retDistDFeInt"][0];

      const statusCode = retDistDFeInt.cStat[0];
      const ultimoNSU = parseInt(retDistDFeInt.ultNSU[0]);
      maxNSU = parseInt(retDistDFeInt.maxNSU[0]);

      console.log(
        `Status: ${statusCode}, Último NSU: ${ultimoNSU}, Máximo NSU: ${maxNSU}`
      );

      if (statusCode === "138") {
        // Documentos encontrados
        status656Count = 0;
        const loteDistDFeInt = retDistDFeInt.loteDistDFeInt?.[0];
        if (
          loteDistDFeInt &&
          loteDistDFeInt.docZip &&
          Array.isArray(loteDistDFeInt.docZip)
        ) {
          console.log(
            `Processando ${loteDistDFeInt.docZip.length} documentos...`
          );

          let documentosNovos = 0;
          for (const docZip of loteDistDFeInt.docZip) {
            const nsuDocumento = parseInt(docZip.$?.NSU || "0");

            // Verificar se este documento já foi processado
            if (nsuDocumento > ultimoNSUSalvo) {
              const dadosNota = await processarNotaFiscal(docZip);
              if (dadosNota && dadosNota.chaveAcesso) {
                todasNotas.push(dadosNota);
                documentosNovos++;
              }
            } else {
              console.log(
                `Documento NSU ${nsuDocumento} já processado, pulando...`
              );
            }
          }
          console.log(`Documentos novos encontrados: ${documentosNovos}`);
        }
        nsuAtual = ultimoNSU + 1;
      } else if (statusCode === "137") {
        // Nenhum documento encontrado
        status656Count = 0;
        console.log("Nenhum documento encontrado neste lote");
        nsuAtual = ultimoNSU + 1;
      } else if (statusCode === "656") {
        // Consumo Indevido
        status656Count++;
        console.log(
          `Status 656 - Rejeicao: Consumo Indevido (Tentativa ${status656Count}/${maxStatus656Retries})`
        );

        if (status656Count >= maxStatus656Retries) {
          console.log(
            "Máximo de tentativas para status 656 atingido. Aguardando 1 hora..."
          );
          await new Promise((resolve) => setTimeout(resolve, 3600000));
          status656Count = 0;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        continue;
      } else {
        console.error(
          `Status inesperado: ${statusCode} - ${retDistDFeInt.xMotivo[0]}`
        );
        nsuAtual = ultimoNSU + 1;
      }

      // Se chegamos ao máximo NSU, paramos
      if (nsuAtual > maxNSU) {
        console.log("Chegamos ao máximo NSU disponível");
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Erro na tentativa ${tentativas}:`, error.message);
      if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
        console.log("Erro de conexão, tentando novamente...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      nsuAtual++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(
    `Busca incremental concluída. Total de notas novas encontradas: ${todasNotas.length}`
  );
  console.log(`NSU final: ${maxNSU}, Tentativas realizadas: ${tentativas}`);
  return { notas: todasNotas, ultimoNSU: maxNSU, maxNSU };
};

// Função para buscar todas as notas desde o início (busca completa)
const buscarTodasNotas = async (certificado, agentOptions) => {
  let todasNotas = [];
  let nsuAtual = 0; // Sempre começar do zero para busca completa
  let maxNSU = 0;
  let tentativas = 0;
  const maxTentativas = 100;
  let status656Count = 0;
  const maxStatus656Retries = 3;

  console.log("Iniciando busca completa de todas as notas desde o início...");
  console.log(`NSU inicial: ${nsuAtual}`);

  while (tentativas < maxTentativas) {
    tentativas++;
    console.log(
      `Tentativa ${tentativas}: Consultando a partir do NSU ${nsuAtual}`
    );

    const envelope = buildSoapEnvelope(
      certificado.cnpj,
      certificado.ufAutor,
      nsuAtual
    );

    try {
      const response = await axios.post(SEFAZ_URL, envelope, {
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          SOAPAction:
            "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse",
        },
        httpsAgent: new https.Agent(agentOptions),
      });

      const parsedResponse = await parseString(response.data);
      const retDistDFeInt =
        parsedResponse["soap:Envelope"]["soap:Body"][0][
          "nfeDistDFeInteresseResponse"
        ][0]["nfeDistDFeInteresseResult"][0]["retDistDFeInt"][0];

      const statusCode = retDistDFeInt.cStat[0];
      const ultimoNSU = parseInt(retDistDFeInt.ultNSU[0]);
      maxNSU = parseInt(retDistDFeInt.maxNSU[0]);

      console.log(
        `Status: ${statusCode}, Último NSU: ${ultimoNSU}, Máximo NSU: ${maxNSU}`
      );

      if (statusCode === "138") {
        // Documentos encontrados
        status656Count = 0;
        const loteDistDFeInt = retDistDFeInt.loteDistDFeInt?.[0];
        if (
          loteDistDFeInt &&
          loteDistDFeInt.docZip &&
          Array.isArray(loteDistDFeInt.docZip)
        ) {
          console.log(
            `Processando ${loteDistDFeInt.docZip.length} documentos...`
          );
          for (const docZip of loteDistDFeInt.docZip) {
            const dadosNota = await processarNotaFiscal(docZip);
            if (dadosNota && dadosNota.chaveAcesso) {
              todasNotas.push(dadosNota);
            }
          }
        }
        nsuAtual = ultimoNSU + 1;
      } else if (statusCode === "137") {
        // Nenhum documento encontrado
        status656Count = 0;
        console.log("Nenhum documento encontrado neste lote");
        nsuAtual = ultimoNSU + 1;
      } else if (statusCode === "656") {
        // Consumo Indevido
        status656Count++;
        console.log(
          `Status 656 - Rejeicao: Consumo Indevido (Tentativa ${status656Count}/${maxStatus656Retries})`
        );

        if (status656Count >= maxStatus656Retries) {
          console.log(
            "Máximo de tentativas para status 656 atingido. Aguardando 1 hora..."
          );
          await new Promise((resolve) => setTimeout(resolve, 3600000));
          status656Count = 0;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        continue;
      } else {
        console.error(
          `Status inesperado: ${statusCode} - ${retDistDFeInt.xMotivo[0]}`
        );
        nsuAtual = ultimoNSU + 1;
      }

      // Se chegamos ao máximo NSU, paramos
      if (nsuAtual > maxNSU) {
        console.log("Chegamos ao máximo NSU disponível");
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Erro na tentativa ${tentativas}:`, error.message);
      if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
        console.log("Erro de conexão, tentando novamente...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      nsuAtual++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(
    `Busca completa concluída. Total de notas encontradas: ${todasNotas.length}`
  );
  console.log(`NSU final: ${maxNSU}, Tentativas realizadas: ${tentativas}`);
  return { notas: todasNotas, ultimoNSU: maxNSU, maxNSU };
};

export const buscarNotasRecentes = async (req, res) => {
  try {
    const { certificadoId } = req.params;
    const { nsu, forcarNSU, tipo } = req.query;

    console.log(
      `Iniciando consulta de notas para certificado: ${certificadoId}`
    );

    if (!certificadoId) {
      console.error("ID do certificado não fornecido");
      return res.status(400).json({
        message: "ID do certificado é obrigatório",
        details: "O parâmetro certificadoId não foi fornecido",
      });
    }

    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      console.error(`Certificado não encontrado: ${certificadoId}`);
      return res.status(404).json({
        message: "Certificado não encontrado",
        details: "Não foi encontrado um certificado com o ID fornecido",
      });
    }

    if (!certificado.ativo) {
      console.error(`Certificado inativo: ${certificadoId}`);
      return res.status(400).json({
        message: "Certificado inativo",
        details: "O certificado existe mas está marcado como inativo",
      });
    }

    if (new Date(certificado.dataValidade) < new Date()) {
      console.error(`Certificado expirado: ${certificadoId}`);
      return res.status(400).json({
        message: "Certificado expirado",
        details: `Data de validade: ${certificado.dataValidade}`,
      });
    }

    const agentOptions = await getAgentOptions(certificadoId);
    if (!agentOptions) {
      console.error(`Erro ao carregar certificado: ${certificadoId}`);
      return res.status(500).json({
        message: "Erro ao carregar certificado",
        details: "Não foi possível obter as opções do certificado digital",
      });
    }

    // Determinar o tipo de busca
    let resultado;
    if (tipo === "completa" || forcarNSU) {
      // Busca completa ou forçada
      console.log("Iniciando busca completa de todas as notas...");

      if (forcarNSU) {
        console.log(`Forçando busca a partir do NSU: ${forcarNSU}`);
        certificado.ultimoNSU = parseInt(forcarNSU);
      }

      resultado = await buscarTodasNotas(certificado, agentOptions);
    } else {
      // Busca incremental (padrão)
      console.log("Iniciando busca incremental de notas...");
      resultado = await buscarNotasIncremental(certificado, agentOptions);
    }

    // Atualizar o NSU no certificado
    try {
      await updateNSU(certificadoId, resultado.ultimoNSU, resultado.maxNSU);
      console.log(
        `NSU atualizado no certificado: ${resultado.ultimoNSU} (Max: ${resultado.maxNSU})`
      );
    } catch (error) {
      console.error("Erro ao atualizar NSU no certificado:", error.message);
    }

    // Salvar todas as notas no modelo NFeRecentes
    const notasSalvas = [];
    for (const dadosNota of resultado.notas) {
      try {
        // Adicionar certificadoId aos dados
        const dadosCompletos = {
          ...dadosNota,
          certificadoId: certificadoId,
          dataConsulta: new Date(),
        };

        // Verificar se já existe uma nota com a mesma chave de acesso
        const notaExistente = await NFeRecentes.findOne({
          chaveAcesso: dadosNota.chaveAcesso,
        });

        if (!notaExistente) {
          const novaNota = new NFeRecentes(dadosCompletos);
          await novaNota.save();
          console.log(
            `NFe recente salva: ${dadosNota.chaveAcesso} (NSU: ${dadosNota.nsu})`
          );
          notasSalvas.push(dadosCompletos);
        } else {
          // Atualizar a nota existente com novos dados
          await NFeRecentes.findOneAndUpdate(
            { chaveAcesso: dadosNota.chaveAcesso },
            dadosCompletos,
            { new: true }
          );
          console.log(
            `NFe recente atualizada: ${dadosNota.chaveAcesso} (NSU: ${dadosNota.nsu})`
          );
          notasSalvas.push(dadosCompletos);
        }
      } catch (error) {
        console.error(
          `Erro ao salvar NFe ${dadosNota.chaveAcesso}:`,
          error.message
        );
      }
    }

    console.log(
      `Busca concluída. Total de NFe recentes salvas: ${notasSalvas.length}`
    );

    const tipoBusca =
      tipo === "completa" || forcarNSU ? "completa" : "incremental";

    return res.json({
      success: true,
      message: `Busca ${tipoBusca} de notas fiscais concluída`,
      data: {
        tipoBusca: tipoBusca,
        notas: notasSalvas,
        ultimoNSU: resultado.ultimoNSU.toString(),
        maxNSU: resultado.maxNSU.toString(),
        totalEncontradas: resultado.notas.length,
        totalSalvas: notasSalvas.length,
        certificadoId: certificadoId,
        cnpj: certificado.cnpj,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar notas fiscais:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar notas fiscais",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
