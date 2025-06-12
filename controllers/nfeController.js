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
  "https://www.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";

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

    // Converter XML para objeto
    const result = await parseString(xml);

    // Extrair dados relevantes
    const nfe = result.resNFe || result.procEventoNFe;
    if (!nfe) return null;

    const dados = {
      chaveAcesso:
        nfe.chNFe?.[0] || nfe.evento?.[0]?.infEvento?.[0]?.chNFe?.[0],
      numero: nfe.NFe?.[0]?.infNFe?.[0]?.ide?.[0]?.nNF?.[0],
      serie: nfe.NFe?.[0]?.infNFe?.[0]?.ide?.[0]?.serie?.[0],
      dataEmissao: nfe.NFe?.[0]?.infNFe?.[0]?.ide?.[0]?.dhEmi?.[0],
      valorTotal: nfe.NFe?.[0]?.infNFe?.[0]?.total?.[0]?.ICMSTot?.[0]?.vNF?.[0],
      emitente: {
        cnpj: nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.CNPJ?.[0],
        nome: nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.xNome?.[0],
        endereco: {
          logradouro:
            nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.xLgr?.[0],
          numero:
            nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.nro?.[0],
          bairro:
            nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.xBairro?.[0],
          municipio:
            nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.xMun?.[0],
          uf: nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.UF?.[0],
          cep: nfe.NFe?.[0]?.infNFe?.[0]?.emit?.[0]?.enderEmit?.[0]?.CEP?.[0],
        },
      },
      destinatario: {
        cnpj: nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.CNPJ?.[0],
        nome: nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.xNome?.[0],
        endereco: {
          logradouro:
            nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.xLgr?.[0],
          numero:
            nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.nro?.[0],
          bairro:
            nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.xBairro?.[0],
          municipio:
            nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.xMun?.[0],
          uf: nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.UF?.[0],
          cep: nfe.NFe?.[0]?.infNFe?.[0]?.dest?.[0]?.enderDest?.[0]?.CEP?.[0],
        },
      },
      produtos:
        nfe.NFe?.[0]?.infNFe?.[0]?.det?.map((det) => ({
          codigo: det.prod?.[0]?.cProd?.[0],
          descricao: det.prod?.[0]?.xProd?.[0],
          quantidade: det.prod?.[0]?.qCom?.[0],
          valorUnitario: det.prod?.[0]?.vUnCom?.[0],
          valorTotal: det.prod?.[0]?.vProd?.[0],
        })) || [],
      status: nfe.cSitNFe?.[0] || "NORMAL",
      xml: xml,
    };

    return dados;
  } catch (error) {
    console.error("Erro ao processar nota fiscal:", error);
    return null;
  }
};

export const buscarNotasRecentes = async (req, res) => {
  try {
    const { certificadoId } = req.params;
    const { nsu } = req.query;

    console.log(
      "Iniciando busca de notas fiscais para certificado:",
      certificadoId
    );

    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      return res.status(404).json({ message: "Certificado não encontrado" });
    }

    if (!certificado.ativo) {
      return res.status(400).json({ message: "Certificado inativo" });
    }

    if (new Date(certificado.dataValidade) < new Date()) {
      return res.status(400).json({ message: "Certificado expirado" });
    }

    const agentOptions = await getAgentOptions(certificadoId);
    if (!agentOptions) {
      return res.status(500).json({ message: "Erro ao carregar certificado" });
    }

    const ultimoNSU = nsu ? parseInt(nsu) : certificado.ultimoNSU;
    const envelope = buildSoapEnvelope(
      certificado.cnpj,
      certificado.ufAutor,
      ultimoNSU
    );

    console.log("Envelope SOAP gerado:", envelope);

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
      console.log("Número de documentos:", loteDistDFeInt.docZip?.length || 0);
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
      });
    }
  } catch (error) {
    console.error("Erro ao buscar notas fiscais:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar notas fiscais",
      error: error.message,
    });
  }
};
