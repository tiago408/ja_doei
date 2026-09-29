const functions = require("firebase-functions/v1");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createHash } = require("crypto");

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
      const cleanBase64 = typeof imageBase64 === "string"
        ? imageBase64.replace(/^data:image\/\w+;base64,/, "")
        : "";
      const cacheHash = createHash("sha256")
        .update("evaluation-v1\0")
        .update(cleanBase64)
        .update("\0")
        .update(JSON.stringify({
          titleText: titleText || "",
          categoryText: categoryText || "",
          conditionText: conditionText || "",
        }))
        .digest("hex");
      const evaluationRef = admin.firestore().collection("itemEvaluations").doc(cacheHash);

      try {
        const cachedEvaluation = await evaluationRef.get();
        const cachedResult = cachedEvaluation.data()?.result;
        if (cachedResult) {
          res.status(200).json(cachedResult);
          return;
        }
      } catch (cacheError) {
        console.warn("Falha ao consultar o cache de avaliações:", cacheError.message);
      }

      const apiKey = process.env.GEMINI_API_KEY || "";

      if (!apiKey) {
        res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-3.6-flash",
        generationConfig: {
          temperature: 0,
          topP: 1,
          topK: 1,
        },
      });

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
          3. Avalie em créditos (1 BRL = 1 Crédito), usando estes valores-base fixos como referência para item usado em bom estado:
            - Garrafa térmica simples, sem marca premium identificável: 30 créditos.
            - Garrafa térmica de marca premium identificável (ex.: Stanley, Thermos ou CamelBak): 120 créditos.
            - Caneca comum: 15 créditos; mochila comum: 60 créditos; livro comum: 20 créditos.
            - Jogo de tabuleiro comum: 40 créditos; cadeira comum: 80 créditos.
            - Ventilador doméstico: 100 créditos; liquidificador doméstico: 100 créditos.
            - Fone com fio comum: 30 créditos; fone Bluetooth de marca reconhecível: 100 créditos.
            Se o item corresponder a uma dessas classes, use exatamente o valor indicado antes do ajuste de conservação.
            Se a marca premium não puder ser lida ou reconhecida com segurança, use o valor da classe simples/comum.
            Para item não listado, escolha a classe mais próxima e use um único valor-base, sem variar por chamada.
          4. Aplique exatamente um multiplicador ao valor-base: "Novo na caixa" = 1,00; "Usado - Excelente" = 0,80; "Usado - Bom" = 0,55. Se a condição estiver ausente, use 0,80.
            Arredonde o resultado para o múltiplo de 5 créditos mais próximo. Não use faixas, sorteio ou estimativas diferentes para o mesmo item e os mesmos dados.

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

      if (cleanBase64) {
        const imagePart = {
          inlineData: {
            data: cleanBase64,
            mimeType: "image/jpeg"
          }
        };
        contents.push(imagePart);
      }

      const result = await model.generateContent(contents);
      const text = result.response.text().trim();
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(cleanJson);
      const normalizedIsInvalid = parsed.isInvalid === true || String(parsed.isInvalid).toLowerCase() === 'true';

      const evaluation = {
        ...parsed,
        isInvalid: normalizedIsInvalid || !parsed.credits || parsed.credits <= 0
      };

      try {
        await evaluationRef.set({
          result: evaluation,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (cacheError) {
        console.warn("Falha ao salvar no cache de avaliações:", cacheError.message);
      }

      res.status(200).json(evaluation);
    } catch (error) {
      console.error("Erro na Cloud Function do Gemini:", error);
      res.status(500).json({ error: error?.message || "Erro interno ao avaliar item." });
    }
  }
);