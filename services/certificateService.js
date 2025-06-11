import forge from "node-forge";
import Certificado from "../models/Certificado.js";

export const getAgentOptions = async (certificadoId) => {
  try {
    console.log("Iniciando carregamento do certificado:", certificadoId);
    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      console.error("Certificado não encontrado:", certificadoId);
      throw new Error("Certificado não encontrado");
    }

    console.log("Verificando status do certificado:", {
      ativo: certificado.ativo,
      dataValidade: certificado.dataValidade,
      cnpj: certificado.cnpj,
    });

    if (!certificado.ativo) {
      console.error("Certificado inativo:", certificadoId);
      throw new Error("Certificado inativo");
    }

    if (new Date() > certificado.dataValidade) {
      console.error("Certificado expirado:", {
        certificadoId,
        dataValidade: certificado.dataValidade,
      });
      throw new Error("Certificado expirado");
    }

    console.log("Convertendo certificado base64 para buffer...");
    // Converter o certificado base64 para buffer
    const pfxDer = Buffer.from(certificado.certificadoBase64, "base64");
    const pfxAsn1 = forge.asn1.fromDer(pfxDer.toString("binary"));

    console.log("Tentando abrir o certificado com a senha...");
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, certificado.senha);

    console.log("Buscando chaves e certificados no arquivo PFX...");
    // Encontrar a chave privada e o certificado
    const keyBags = pfx.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    })[forge.pki.oids.pkcs8ShroudedKeyBag];
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag })[
      forge.pki.oids.certBag
    ];

    if (
      !keyBags ||
      !certBags ||
      keyBags.length === 0 ||
      certBags.length === 0
    ) {
      console.error("Erro ao extrair chaves do certificado:", {
        certificadoId,
        temKeyBags: !!keyBags,
        temCertBags: !!certBags,
        numKeyBags: keyBags?.length,
        numCertBags: certBags?.length,
      });
      throw new Error(
        "Não foi possível encontrar a chave privada ou o certificado no arquivo PFX"
      );
    }

    console.log("Convertendo chaves para formato PEM...");
    const privateKey = keyBags[0].key;
    const certificate = certBags[0].cert;

    // Converter para formato PEM
    const pemPrivateKey = forge.pki.privateKeyToPem(privateKey);
    const pemCertificate = forge.pki.certificateToPem(certificate);

    // Obter certificados da cadeia (CA), se houver
    const caCerts = certBags
      .slice(1)
      .map((bag) => forge.pki.certificateToPem(bag.cert));

    console.log("Certificado processado com sucesso");
    return {
      key: pemPrivateKey,
      cert: pemCertificate,
      ca: caCerts,
      rejectUnauthorized: false,
    };
  } catch (error) {
    console.error("ERRO detalhado ao carregar o certificado:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      certificadoId,
    });
    throw error;
  }
};

export const updateNSU = async (certificadoId, ultimoNSU, maxNSU) => {
  try {
    console.log("Atualizando NSU do certificado:", {
      certificadoId,
      ultimoNSU,
      maxNSU,
    });
    await Certificado.findByIdAndUpdate(certificadoId, {
      ultimoNSU,
      maxNSU,
      updatedAt: new Date(),
    });
    console.log("NSU atualizado com sucesso");
  } catch (error) {
    console.error("Erro detalhado ao atualizar NSU:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      certificadoId,
      ultimoNSU,
      maxNSU,
    });
    throw error;
  }
};
