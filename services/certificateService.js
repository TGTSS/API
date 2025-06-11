import forge from "node-forge";
import Certificado from "../models/Certificado.js";

export const getAgentOptions = async (certificadoId) => {
  try {
    const certificado = await Certificado.findById(certificadoId);
    if (!certificado) {
      throw new Error("Certificado não encontrado");
    }

    if (!certificado.ativo) {
      throw new Error("Certificado inativo");
    }

    if (new Date() > certificado.dataValidade) {
      throw new Error("Certificado expirado");
    }

    // Converter o certificado base64 para buffer
    const pfxDer = Buffer.from(certificado.certificadoBase64, "base64");
    const pfxAsn1 = forge.asn1.fromDer(pfxDer.toString("binary"));
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, certificado.senha);

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
      throw new Error(
        "Não foi possível encontrar a chave privada ou o certificado no arquivo PFX"
      );
    }

    const privateKey = keyBags[0].key;
    const certificate = certBags[0].cert;

    // Converter para formato PEM
    const pemPrivateKey = forge.pki.privateKeyToPem(privateKey);
    const pemCertificate = forge.pki.certificateToPem(certificate);

    // Obter certificados da cadeia (CA), se houver
    const caCerts = certBags
      .slice(1)
      .map((bag) => forge.pki.certificateToPem(bag.cert));

    return {
      key: pemPrivateKey,
      cert: pemCertificate,
      ca: caCerts,
      rejectUnauthorized: false,
    };
  } catch (error) {
    console.error("ERRO ao carregar o certificado:", error.message);
    throw error;
  }
};

export const updateNSU = async (certificadoId, ultimoNSU, maxNSU) => {
  try {
    await Certificado.findByIdAndUpdate(certificadoId, {
      ultimoNSU,
      maxNSU,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Erro ao atualizar NSU:", error);
    throw error;
  }
};
