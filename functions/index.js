const functions = require("firebase-functions/v1");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// Integracao Lalamove
const lalamove = require("./lalamove");
exports.quoteLalamove = lalamove.quoteLalamove;
exports.createLalamoveOrder = lalamove.createLalamoveOrder;

// Envia a notificação push (FCM) para o destinatário sempre que um doc é criado em /notifications
exports.onNotificationCreate = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snapshot) => {
    const notification = snapshot.data();
    const recipientId = notification.userId;
    if (!recipientId) return;

    try {
      const userDoc = await admin.firestore().collection("users").doc(recipientId).get();
      const fcmToken = userDoc.data()?.fcmToken;
      if (!fcmToken) return;

      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: notification.title || "Já Doei",
          body: notification.message || ""
        },
        data: {
          type: notification.type || "",
          chatId: notification.chatId || "",
          donationId: notification.donationId || notification.itemId || "",
          senderId: notification.senderId || "",
          senderName: notification.senderName || "",
          senderAvatar: notification.senderAvatar || ""
        }
      });
    } catch (error) {
      console.error(`Erro ao enviar push para o usuario ${recipientId}:`, error);
    }
  });

// Apaga os dados do usuário ao deletar conta
exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const db = admin.firestore();

  console.log(`Iniciando remocao dos dados para o UID: ${uid}`);

  try {
    // 1. Apaga o documento no Firestore
    await db.collection("users").doc(uid).delete();
    console.log(`Documento users/${uid} deletado com sucesso.`);

    // 2. Apaga arquivos no Storage (se houver)
    try {
      const bucket = admin.storage().bucket();
      await bucket.deleteFiles({ prefix: `users/${uid}/` });
      console.log(`Arquivos do usuario ${uid} deletados do Storage.`);
    } catch (storageErr) {
      console.log(`Aviso ao apagar do Storage:`, storageErr.message);
    }
  } catch (error) {
    console.error(`Erro ao apagar usuario ${uid} no Firestore:`, error);
  }
});

// Avaliação automática de doações via Gemini AI
exports.evaluateItem = onRequest(
  {
    cors: true,
    region: "us-central1",
    secrets: ["GEMINI_API_KEY"],
  },
  async (req, res) => {
    // Liberacao explicita de CORS para evitar o bloqueio 'due to access control checks'
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Método não permitido" });
      return;
    }

    try {
      const { imageBase64, titleText, categoryText, conditionText } = req.body || {};
      const apiKey = process.env.GEMINI_API_KEY || "";

      if (!apiKey) {
        res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

      const prompt = `
        Você é o avaliador oficial do app Já Doei.
        Analise o item (pela imagem e/ou pelas informações fornecidas):
        - Título atual: "${titleText || ''}"
        - Categoria informada: "${categoryText || ''}"
        - Condição: "${conditionText || 'Usado - Excelente'}"

        Regra de validação (aplique antes de tudo): se a imagem mostrar uma pessoa/selfie/rosto humano,
        um animal, ou um item proibido (medicamentos, armas, produtos inflamáveis, itens ilícitos),
        a foto é INVÁLIDA para doação. Nesse caso, retorne "isInvalid": true, "credits": 0 e explique
        o motivo em "invalidReason". Não é permitido cadastrar esse tipo de foto.

        Caso contrário (item válido para doação):
        1. Identifique o produto com precisão. Se o título estiver vazio, gere um título comercial adequado.
        2. Escolha a melhor categoria entre: ["Música & Instrumentos", "Casa, Cozinha & Utensílios", "Móveis & Decoração", "Eletrônicos & Tecnologia", "Esporte & Lazer", "Brinquedos & Jogos", "Moda & Acessórios", "Papelaria & Escritório", "Livros & Mídias", "Outros"].
        3. Estime o valor em BRL de mercado para seminovos (1 BRL = 1 Crédito).
           Regra de conservação: "Novo na caixa" = 100%, "Usado - Excelente" = 75-85%, "Usado - Bom" = 50-60%.

        Retorne EXCLUSIVAMENTE um JSON VÁLIDO no seguinte formato (sem formatação markdown \`\`\`json):
        {
          "title": "Nome Exato do Item",
          "category": "Nome da Categoria",
          "credits": 65,
          "justification": "Explicacao curta de 1 frase",
          "isInvalid": false,
          "invalidReason": ""
        }
      `;

      const contents = [prompt];

      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imagePart = {
          inlineData: {
            data: cleanBase64,
            mimeType: 'image/jpeg'
          }
        };
        contents.push(imagePart);
      }

      const result = await model.generateContent(contents);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(cleanJson);
      const normalizedIsInvalid = parsed.isInvalid === true || String(parsed.isInvalid).toLowerCase() === 'true';

      res.status(200).json({
        ...parsed,
        isInvalid: normalizedIsInvalid || !parsed.credits || parsed.credits <= 0
      });
    } catch (error) {
      console.error("Erro na Cloud Function do Gemini:", error);
      res.status(500).json({ error: error?.message || "Erro interno ao avaliar item." });
    }
  }
);