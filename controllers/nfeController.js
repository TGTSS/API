import axios from "axios";
import { parseStringPromise } from "xml2js";
import { promisify } from "util";
import { gunzip } from "zlib";
import https from "https";
import { getAgentOptions, updateNSU } from "../services/certificateService.js";
import Certificado from "../models/Certificado.js";

const gunzipAsync = promisify(gunzip);

const SEFAZ_DIST_DFE_URL =
  process.env.SEFAZ_DIST_DFE_URL ||
  "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";

const buildSoapEnvelope = (cnpj, ufAutor, ultimoNSU) => {
  // Garante que o NSU tenha 15 dígitos com zeros à esquerda
  const nsuFormatado = String(ultimoNSU).padStart(15, "0");

  // Payload XML interno
  const distDFeIntXml = `
    <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
      <tpAmb>1</tpAmb>
      <cUFAutor>${ufAutor}</cUFAutor>
      <CNPJ>${cnpj}</CNPJ>
      <distNSU>
        <ultNSU>${nsuFormatado}</ultNSU>
      </distNSU>
    </distDFeInt>
  `
    .replace(/>\s+</g, "><")
    .trim();

  // SOAP Header XML
  const soapHeaderXml = `
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <cUF>${ufAutor}</cUF>
      <versaoDados>1.01</versaoDados>
    </nfeCabecMsg>
  `
    .replace(/>\s+</g, "><")
    .trim();

  // Envelope SOAP completo
  const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">
      <soapenv:Header>${soapHeaderXml}</soapenv:Header>
      <soapenv:Body>
        <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
          <nfeDadosMsg>${distDFeIntXml}</nfeDadosMsg>
        </nfeDistDFeInteresse>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  // Limpeza final do envelope
  return soapEnvelope
    .replace(/\n|\r/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

export const consultarNotasRecentes = async (certificadoId) => {
  try {
    console.log(
      "Iniciando consulta de notas fiscais para certificado:",
      certificadoId
    );

    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      throw new Error("Certificado não encontrado");
    }

    console.log("Certificado encontrado:", {
      cnpj: certificado.cnpj,
      ufAutor: certificado.ufAutor,
      ultimoNSU: certificado.ultimoNSU,
    });

    const agentOptions = await getAgentOptions(certificadoId);
    const soapRequest = buildSoapEnvelope(
      certificado.cnpj,
      certificado.ufAutor,
      certificado.ultimoNSU
    );

    console.log("Envelope SOAP gerado:", soapRequest);

    const response = await axios.post(SEFAZ_DIST_DFE_URL, soapRequest, {
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
      },
      httpsAgent: new https.Agent({
        key: agentOptions.key,
        cert: agentOptions.cert,
        ca: agentOptions.ca,
        rejectUnauthorized: agentOptions.rejectUnauthorized,
      }),
      timeout: 30000,
    });

    console.log("=== LOG DETALHADO DA RESPOSTA SEFAZ ===");
    console.log("Status HTTP:", response.status);
    console.log("Headers:", JSON.stringify(response.headers, null, 2));
    console.log("Resposta bruta:", response.data);
    console.log("================================");

    const parsedResult = await parseStringPromise(response.data, {
      explicitArray: false,
      tagNameProcessors: [(key) => key.replace(/^[a-zA-Z0-9]+:/, "")],
    });

    console.log("=== LOG DETALHADO DA RESPOSTA PARSEADA ===");
    console.log(
      "Resposta parseada completa:",
      JSON.stringify(parsedResult, null, 2)
    );

    const soapBody = parsedResult["Envelope"]?.["Body"];
    const distResult =
      soapBody?.["nfeDistDFeInteresseResponse"]?.["nfeDistDFeInteresseResult"];

    if (!distResult) {
      console.error(
        "Estrutura da resposta SOAP inesperada:",
        JSON.stringify(soapBody, null, 2)
      );
      throw new Error("Estrutura da resposta SOAP inesperada");
    }

    const cStat = distResult.retDistDFeInt?.cStat;
    const xMotivo = distResult.retDistDFeInt?.xMotivo;
    const ultNSU = distResult.retDistDFeInt?.ultNSU;
    const maxNSU = distResult.retDistDFeInt?.maxNSU;

    console.log("=== DETALHES DA RESPOSTA SEFAZ ===");
    console.log("Código de Status (cStat):", cStat);
    console.log("Motivo (xMotivo):", xMotivo);
    console.log("Último NSU:", ultNSU);
    console.log("Máximo NSU:", maxNSU);
    console.log("================================");

    if (cStat !== "138") {
      if (cStat === "137") {
        console.log("Nenhum documento encontrado (cStat 137)");
        return {
          status: cStat,
          motivo: xMotivo,
          ultimoNSU: ultNSU || certificado.ultimoNSU,
          maxNSU: maxNSU,
          documentos: [],
        };
      }
      console.error("Erro SEFAZ:", { cStat, xMotivo });
      throw new Error(`Erro SEFAZ: ${xMotivo} (Código: ${cStat})`);
    }

    const lote = distResult.retDistDFeInt.loteDistDFeInt;
    console.log("=== DETALHES DO LOTE ===");
    console.log("Lote encontrado:", lote ? "Sim" : "Não");
    if (lote) {
      console.log(
        "Número de documentos:",
        Array.isArray(lote.docZip) ? lote.docZip.length : 1
      );
    }
    console.log("================================");

    let documentos = [];

    if (lote && lote.docZip) {
      const docZips = Array.isArray(lote.docZip) ? lote.docZip : [lote.docZip];

      documentos = await Promise.all(
        docZips.map(async (doc) => {
          try {
            const bufferComprimido = Buffer.from(doc._, "base64");
            const bufferDescomprimido = await gunzipAsync(bufferComprimido);
            const xmlString = bufferDescomprimido.toString("utf-8");

            const parsedXml = await parseStringPromise(xmlString, {
              explicitArray: false,
              tagNameProcessors: [(key) => key.replace(/^[a-zA-Z0-9]+:/, "")],
            });

            let chaveNFe = null;
            let resumo = {};

            if (doc.$.schema.startsWith("procNFe")) {
              chaveNFe = parsedXml?.nfeProc?.NFe?.infNFe?.$?.Id?.replace(
                "NFe",
                ""
              );
              resumo = {
                emitente: parsedXml?.nfeProc?.NFe?.infNFe?.emit?.xNome,
                valor: parsedXml?.nfeProc?.NFe?.infNFe?.total?.ICMSTot?.vNF,
                dataEmissao: parsedXml?.nfeProc?.NFe?.infNFe?.ide?.dhEmi,
              };
            } else if (doc.$.schema.startsWith("resNFe")) {
              chaveNFe = parsedXml?.resNFe?.chNFe;
              resumo = {
                emitente: parsedXml?.resNFe?.xNome,
                valor: parsedXml?.resNFe?.vNF,
                dataEmissao: parsedXml?.resNFe?.dhEmi,
                situacao: parsedXml?.resNFe?.cSitNFe,
              };
            }

            return {
              nsu: doc.$.NSU,
              schema: doc.$.schema,
              chaveNFe,
              resumo,
              xmlCompleto: xmlString,
            };
          } catch (error) {
            console.error(
              `Erro ao processar documento NSU ${doc.$.NSU}:`,
              error
            );
            return {
              nsu: doc.$.NSU,
              schema: doc.$.schema,
              error: "Falha ao processar XML",
              raw: doc._,
            };
          }
        })
      );
    }

    // Atualizar NSUs no banco de dados
    await updateNSU(
      certificadoId,
      distResult.retDistDFeInt.ultNSU,
      distResult.retDistDFeInt.maxNSU
    );

    return {
      status: cStat,
      motivo: xMotivo,
      ultimoNSU: distResult.retDistDFeInt.ultNSU,
      maxNSU: distResult.retDistDFeInt.maxNSU,
      documentos,
    };
  } catch (error) {
    console.error("Erro ao consultar SEFAZ:", error);
    throw error;
  }
};
