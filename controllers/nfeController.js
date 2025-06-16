import axios from "axios";
import xml2js from "xml2js";
import util from "util";
import zlib from "zlib";
import https from "https";
import NFe from "../models/NFe.js";
import Certificado from "../models/Certificado.js";
import { getAgentOptions, updateNSU } from "../services/certificateService.js";

const parseString = util.promisify(xml2js.parseString);
const gunzip = util.promisify(zlib.gunzip);

const SEFAZ_URL =
  "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";

const buildSoapEnvelope = (cnpj, ufAutor, ultimoNSU) => {
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
    if (!nfe) return null;

    // Mapear status da SEFAZ para nosso modelo
    const statusMap = {
      1: "authorized",
      2: "cancelled",
      3: "pending",
    };

    // Processar dados com base no schema
    let dados = {
      chaveAcesso:
        nfe.chNFe?.[0] || nfe.evento?.[0]?.infEvento?.[0]?.chNFe?.[0],
      status: statusMap[nfe.cSitNFe?.[0]] || "pending",
      xmlContent: xml,
    };

    // Processar dados específicos baseado no schema
    if (result.resNFe) {
      // Resumo da NF-e
      dados = {
        ...dados,
        numero: nfe.NFe?.[0]?.infNFe?.[0]?.ide?.[0]?.nNF?.[0],
        serie: nfe.NFe?.[0]?.infNFe?.[0]?.ide?.[0]?.serie?.[0],
        dataEmissao: nfe.NFe?.[0]?.infNFe?.[0]?.ide?.[0]?.dhEmi?.[0],
        value: parseFloat(
          nfe.NFe?.[0]?.infNFe?.[0]?.total?.[0]?.ICMSTot?.[0]?.vNF?.[0] || "0"
        ),
        issuer: {
          nome: nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.xNome?.[0],
          cnpj: nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.CNPJ?.[0],
          ie: nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.IE?.[0],
          endereco: {
            logradouro:
              nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.xLgr?.[0],
            numero:
              nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.nro?.[0],
            bairro:
              nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]
                ?.xBairro?.[0],
            cidade:
              nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.xMun?.[0],
            uf: nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.UF?.[0],
            cep: nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.CEP?.[0],
          },
        },
        recipient: {
          nome: nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.xNome?.[0],
          cnpj: nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.CNPJ?.[0],
          ie: nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.IE?.[0],
          endereco: {
            logradouro:
              nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.xLgr?.[0],
            numero:
              nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.nro?.[0],
            bairro:
              nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]
                ?.xBairro?.[0],
            cidade:
              nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.xMun?.[0],
            uf: nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.UF?.[0],
            cep: nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.CEP?.[0],
          },
        },
        produtos:
          nfe.NFe?.[0]?.infNFe?.[0]?.det?.map((det) => ({
            codigo: det.prod?.[0]?.cProd?.[0],
            descricao: det.prod?.[0]?.xProd?.[0],
            ncm: det.prod?.[0]?.NCM?.[0],
            cfop: det.prod?.[0]?.CFOP?.[0],
            quantidade: det.prod?.[0]?.qCom?.[0],
            unidade: det.prod?.[0]?.uCom?.[0],
            valorUnitario: det.prod?.[0]?.vUnCom?.[0],
            valorTotal: det.prod?.[0]?.vProd?.[0],
          })) || [],
      };
    }

    return dados;
  } catch (error) {
    console.error("Erro ao processar nota fiscal:", error);
    return null;
  }
};

export const buscarNotasRecentes = async (req, res) => {
  try {
    const { certificadoId } = req.params;
    const { nsu, reset } = req.query;

    if (!certificadoId) {
      return res.status(400).json({
        message: "ID do certificado é obrigatório",
        details: "O parâmetro certificadoId não foi fornecido",
      });
    }

    console.log(
      "Iniciando busca de notas fiscais para certificado:",
      certificadoId,
      "NSU:",
      nsu,
      "Reset:",
      reset
    );

    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      return res.status(404).json({
        message: "Certificado não encontrado",
        details: "Não foi encontrado um certificado com o ID fornecido",
      });
    }

    if (!certificado.ativo) {
      return res.status(400).json({
        message: "Certificado inativo",
        details: "O certificado existe mas está marcado como inativo",
      });
    }

    if (new Date(certificado.dataValidade) < new Date()) {
      return res.status(400).json({
        message: "Certificado expirado",
        details: `Data de validade: ${certificado.dataValidade}`,
      });
    }

    const agentOptions = await getAgentOptions(certificadoId);
    if (!agentOptions) {
      return res.status(500).json({
        message: "Erro ao carregar certificado",
        details: "Não foi possível obter as opções do certificado digital",
      });
    }

    // Se reset for true, começa do NSU 0, caso contrário usa o NSU fornecido ou o último NSU do certificado
    const ultimoNSU =
      reset === "true" ? 0 : nsu ? parseInt(nsu) : certificado.ultimoNSU;
    const envelope = buildSoapEnvelope(
      certificado.cnpj,
      certificado.ufAutor,
      ultimoNSU
    );

    console.log("Envelope SOAP gerado:", envelope);

    try {
      const response = await axios.post(SEFAZ_URL, envelope, {
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          SOAPAction:
            "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse",
        },
        httpsAgent: new https.Agent(agentOptions),
      });

      console.log("=== LOG DETALHADO DA RESPOSTA SEFAZ ===");
      console.log("Status HTTP:", response.status);
      console.log("Headers:", response.headers);
      console.log("Resposta bruta:", response.data);
      console.log("================================");

      const parsedResponse = await parseString(response.data);
      console.log("=== LOG DETALHADO DA RESPOSTA PARSEADA ===");
      console.log(
        "Resposta parseada completa:",
        JSON.stringify(parsedResponse, null, 2)
      );
      console.log("================================");

      const retDistDFeInt =
        parsedResponse["soap:Envelope"]["soap:Body"][0][
          "nfeDistDFeInteresseResponse"
        ][0]["nfeDistDFeInteresseResult"][0]["retDistDFeInt"][0];

      console.log("=== DETALHES DA RESPOSTA SEFAZ ===");
      console.log("Código de Status (cStat):", retDistDFeInt.cStat[0]);
      console.log("Motivo (xMotivo):", retDistDFeInt.xMotivo[0]);
      console.log("Último NSU:", retDistDFeInt.ultNSU[0]);
      console.log("Máximo NSU:", retDistDFeInt.maxNSU[0]);
      console.log("================================");

      const loteDistDFeInt = retDistDFeInt.loteDistDFeInt?.[0];
      console.log("=== DETALHES DO LOTE ===");
      console.log("Lote encontrado:", !!loteDistDFeInt);
      if (loteDistDFeInt) {
        console.log(
          "Número de documentos:",
          loteDistDFeInt.docZip?.length || 0
        );
      }
      console.log("================================");

      if (retDistDFeInt.cStat[0] === "138") {
        const notasProcessadas = [];

        for (const docZip of loteDistDFeInt.docZip) {
          const dadosNota = await processarNotaFiscal(docZip);
          if (dadosNota) {
            // Salvar no banco de dados
            const notaExistente = await NFe.findOne({
              chaveAcesso: dadosNota.chaveAcesso,
            });
            if (!notaExistente) {
              const novaNota = new NFe(dadosNota);
              await novaNota.save();
            }
            notasProcessadas.push(dadosNota);
          }
        }

        // Atualizar NSU
        await updateNSU(
          certificadoId,
          retDistDFeInt.ultNSU[0],
          retDistDFeInt.maxNSU[0]
        );

        return res.json({
          success: true,
          message: "Notas fiscais processadas com sucesso",
          data: {
            notas: notasProcessadas,
            ultimoNSU: retDistDFeInt.ultNSU[0],
            maxNSU: retDistDFeInt.maxNSU[0],
          },
        });
      } else if (retDistDFeInt.cStat[0] === "137") {
        // Se não encontrou documentos e não é um reset, tenta buscar desde o início
        if (reset !== "true" && ultimoNSU > 0) {
          console.log(
            "Nenhum documento encontrado no NSU atual, tentando buscar desde o início..."
          );
          return buscarNotasRecentes(
            { ...req, query: { ...req.query, reset: "true" } },
            res
          );
        }

        return res.json({
          success: true,
          message: "Nenhum documento localizado",
          data: {
            notas: [],
            ultimoNSU: retDistDFeInt.ultNSU[0],
            maxNSU: retDistDFeInt.maxNSU[0],
          },
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Erro na consulta: ${retDistDFeInt.xMotivo[0]}`,
          codigo: retDistDFeInt.cStat[0],
          details: "A SEFAZ retornou um código de status diferente do esperado",
        });
      }
    } catch (error) {
      if (error.response) {
        console.error("Erro na resposta da SEFAZ:", {
          status: error.response.status,
          data: error.response.data,
        });
        return res.status(error.response.status).json({
          success: false,
          message: "Erro na comunicação com a SEFAZ",
          details: error.response.data,
        });
      } else if (error.request) {
        console.error("Erro na requisição à SEFAZ:", error.request);
        return res.status(503).json({
          success: false,
          message: "Serviço da SEFAZ indisponível",
          details: "Não foi possível estabelecer conexão com a SEFAZ",
        });
      } else {
        console.error("Erro ao processar requisição:", error.message);
        return res.status(500).json({
          success: false,
          message: "Erro interno ao processar requisição",
          details: error.message,
        });
      }
    }
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
