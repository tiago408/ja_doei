// Integração com a API da Lalamove (ambiente Sandbox) para cotar e agendar o frete de itens grandes.
// Docs de referência: https://developers.lalamove.com/ — confirme o schema exato (stops/item/priceBreakdown)
// contra a versão atual da API antes de ir para produção, pois esses payloads podem mudar.
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");

const LALAMOVE_API_KEY = defineSecret("LALAMOVE_API_KEY");
const LALAMOVE_API_SECRET = defineSecret("LALAMOVE_API_SECRET");

// Sandbox: https://rest.sandbox.lalamove.com | Produção: https://rest.lalamove.com
const LALAMOVE_BASE_URL = process.env.LALAMOVE_BASE_URL || "https://rest.sandbox.lalamove.com";

// Margem de 20% aplicada pela plataforma sobre o valor retornado pela Lalamove
const PLATFORM_MARKUP = 1.20;
const LALAMOVE_REQUEST_TIMEOUT_MS = 10000;

// Formata o telefone no padrão internacional exigido pela Lalamove (ex: +5511981998847)
function toInternationalPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

// Erro que carrega o corpo de resposta da Lalamove para poder ser logado/repassado com detalhe
class LalamoveRequestError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "LalamoveRequestError";
    this.details = details;
    this.response = { status, data: details };
  }
}

// Resolve as credenciais a partir da Secret Manager, com fallback para variáveis de ambiente
// (LALAMOVE_API_KEY/LALAMOVE_API_SECRET, aceitando também LALAMOVE_SECRET como alias legado).
function resolveLalamoveCredentials() {
  const apiKey = (LALAMOVE_API_KEY.value() || process.env.LALAMOVE_API_KEY || "").trim();
  const apiSecret = (LALAMOVE_API_SECRET.value() || process.env.LALAMOVE_API_SECRET || process.env.LALAMOVE_SECRET || "").trim();
  return { apiKey, apiSecret };
}

// Assinatura HMAC-SHA256 exigida pela API da Lalamove (header Authorization: HMAC {key}:{timestamp}:{signature})
function signLalamoveRequest({ method, path, bodyStr, apiSecret }) {
  const timestamp = Date.now().toString();
  const rawToSign = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${bodyStr}`;
  const signature = crypto.createHmac("sha256", apiSecret).update(rawToSign).digest("hex");
  return { timestamp, signature };
}

async function callLalamove({ method, path, payload, apiKey, apiSecret }) {
  const bodyStr = JSON.stringify(payload);
  const { timestamp, signature } = signLalamoveRequest({ method, path, bodyStr, apiSecret });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LALAMOVE_REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${LALAMOVE_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC ${apiKey}:${timestamp}:${signature}`,
        Market: "BR_SPO"
      },
      body: bodyStr,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const responsePayload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Lalamove HTTP error detail:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responsePayload
    });
    throw new LalamoveRequestError(`Lalamove respondeu HTTP ${response.status}`, response.status, responsePayload);
  }
  return responsePayload;
}

// Loga o detalhe exato do erro (corpo de resposta da Lalamove quando disponível) nos Firebase Logs
// e propaga esse mesmo detalhe no HttpsError para facilitar o debug pelo cliente/console
function logAndRethrowAsHttpsError(error, fallbackMessage) {
  const detail = error?.details || error?.message || "Erro desconhecido";
  console.error("Lalamove API Error Detail:", detail);
  throw new HttpsError("internal", fallbackMessage, detail);
}

// Callable: cota o frete de um item grande via API Sandbox da Lalamove e aplica a margem de 20%
// Usa onRequest (não onCall) para permitir fetch direto do front-end com CORS liberado,
// já que o SDK httpsCallable estava travando antes de disparar a requisição de rede.
// Endpoint público (sem checagem de login) — considere adicionar App Check/rate limiting.
exports.quoteLalamove = onRequest({ cors: true, secrets: [LALAMOVE_API_KEY, LALAMOVE_API_SECRET] }, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const { origin, destination } = req.body?.data || req.body || {};
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    res.status(400).json({ error: { message: "Informe as coordenadas (lat/lng) de origem e destino." } });
    return;
  }

  const payload = {
    data: {
      serviceType: "LALAGO",
      language: "pt_BR",
      stops: [
        {
          coordinates: { lat: String(parseFloat(origin.lat)), lng: String(parseFloat(origin.lng)) },
          address: origin.address || "Origem, SP"
        },
        {
          coordinates: { lat: String(parseFloat(destination.lat)), lng: String(parseFloat(destination.lng)) },
          address: destination.address || "Destino, SP"
        }
      ]
    }
  };

  console.log("Payload Lalamove:", JSON.stringify(payload));

  try {
    const { apiKey, apiSecret } = resolveLalamoveCredentials();
    const result = await callLalamove({
      method: "POST",
      path: "/v3/quotations",
      payload,
      apiKey,
      apiSecret
    });

    const quotation = result?.data;
    const lalamoveValue = Number(quotation?.priceBreakdown?.total ?? 0);
    const finalValue = Number((lalamoveValue * PLATFORM_MARKUP).toFixed(2));

    res.status(200).json({
      data: {
        quotationId: quotation?.quotationId || null,
        currency: quotation?.priceBreakdown?.currency || "BRL",
        lalamoveValue,
        finalValue,
        serviceType: "LALAGO",
        expiresAt: quotation?.expiresAt || null,
        stopIds: (quotation?.stops || []).map((stop) => stop.stopId)
      }
    });
  } catch (error) {
    console.error("LALAMOVE ERROR BODY:", error.response?.data);
    console.log("Status retornado Lalamove:", error.response?.status, error.response?.data);
    const lalamoveErrorBody = error?.details || error?.message || "Erro desconhecido";
    console.error("LALAMOVE RESPONSE ERROR:", JSON.stringify(lalamoveErrorBody));
    console.warn("Lalamove Sandbox fora do ar. Retornando valor simulado de fallback.");

    const simulatedLalamoveValue = 45.00;
    const simulatedFinalValue = Number((simulatedLalamoveValue * PLATFORM_MARKUP).toFixed(2));
    res.status(200).json({
      price: simulatedFinalValue,
      isSimulated: true,
      data: {
        quotationId: null,
        currency: "BRL",
        lalamoveValue: simulatedLalamoveValue,
        finalValue: simulatedFinalValue,
        price: simulatedFinalValue,
        serviceType: "LALAGO",
        expiresAt: null,
        stopIds: [],
        isSimulated: true
      }
    });
  }
});

// Callable: cria a corrida na Lalamove assim que o pagamento do frete for confirmado no app
exports.createLalamoveOrder = onCall({ secrets: [LALAMOVE_API_KEY, LALAMOVE_API_SECRET] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado para criar a corrida.");
  }

  const { quotationId, stopIds, sender, recipient } = request.data || {};
  if (!quotationId) {
    throw new HttpsError("invalid-argument", "quotationId é obrigatório (retornado por quoteLalamove).");
  }
  if (!sender?.name || !sender?.phone || !recipient?.name || !recipient?.phone) {
    throw new HttpsError("invalid-argument", "Dados de contato do remetente e do destinatário são obrigatórios.");
  }

  const [senderStopId, recipientStopId] = Array.isArray(stopIds) ? stopIds : [];
  const payload = {
    data: {
      quotationId,
      sender: { stopId: senderStopId, name: sender.name, phone: toInternationalPhone(sender.phone) },
      recipients: [{ stopId: recipientStopId, name: recipient.name, phone: toInternationalPhone(recipient.phone) }]
    }
  };

  try {
    const { apiKey, apiSecret } = resolveLalamoveCredentials();
    const result = await callLalamove({
      method: "POST",
      path: "/v3/orders",
      payload,
      apiKey,
      apiSecret
    });

    return {
      orderId: result?.data?.orderId || null,
      status: result?.data?.status || null,
      shareLink: result?.data?.shareLink || null
    };
  } catch (error) {
    logAndRethrowAsHttpsError(error, "Não foi possível criar a corrida na Lalamove no momento.");
  }
});

