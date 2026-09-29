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
      const { imageBase64, titleText, categoryText, conditionText, draftId } = req.body || {};
      const cleanBase64 = typeof imageBase64 === "string"
        ? imageBase64.replace(/^data:image\/\w+;base64,/, "")
        : "";
      if (draftId !== undefined && (typeof draftId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(draftId))) {
        res.status(400).json({ error: "ID de rascunho inválido." });
        return;
      }

      const evaluationRef = draftId
        ? admin.firestore().collection("draftEvaluations").doc(createHash("sha256").update(draftId).digest("hex"))
        : null;

      if (evaluationRef) {
        const draftSnapshot = await evaluationRef.get();
        const draftData = draftSnapshot.data();
        if (draftData?.isLocked) {
          res.status(200).json(draftData.lockedResult || {
            ...(draftData.latestResult || {}),
            credits: draftData.lockedValue,
            isLocked: true,
          });
          return;
        }
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
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
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
          3. Estime organicamente o valor de revenda em créditos (1 BRL = 1 Crédito), considerando modelo, marca, estado visível, acessórios e preços típicos de usados. Exemplos de referência para item usado em bom estado: garrafa térmica simples 20-40; garrafa térmica premium identificável (ex.: Stanley, Thermos ou CamelBak) 100-180; caneca comum 10-20; mochila comum 40-80; livro comum 10-30; jogo de tabuleiro comum 30-60; cadeira comum 60-120; ventilador ou liquidificador doméstico 70-140; fone com fio comum 20-40; fone Bluetooth de marca reconhecível 70-140 créditos. São referências, não valores fixos: escolha a pontuação que melhor corresponda à foto e não invente marcas ou características que não estejam visíveis.
          4. Considere a conservação: "Novo na caixa" pode valer mais que um usado equivalente; "Usado - Excelente" deve ficar perto do topo da referência; "Usado - Bom" deve ficar perto da parte inferior. Retorne um inteiro em créditos e uma justificativa curta, sem forçar valores para produzir uma variação artificial.

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

      let evaluation = {
        ...parsed,
        credits: Number(parsed.credits),
        isInvalid: normalizedIsInvalid || !parsed.credits || parsed.credits <= 0
      };

      if (evaluationRef && !evaluation.isInvalid && Number.isFinite(Number(evaluation.credits))) {
        evaluation = await admin.firestore().runTransaction(async (transaction) => {
          const currentSnapshot = await transaction.get(evaluationRef);
          const currentData = currentSnapshot.data() || {};
          if (currentData.isLocked) {
            return currentData.lockedResult || {
              ...(currentData.latestResult || {}),
              credits: currentData.lockedValue,
              isLocked: true,
            };
          }

          const history = Array.isArray(currentData.evaluationHistory)
            ? currentData.evaluationHistory.filter((value) => Number.isFinite(Number(value))).map(Number)
            : [];
          const nextHistory = [...history, Number(evaluation.credits)];
          const updatedAt = admin.firestore.FieldValue.serverTimestamp();

          if (nextHistory.length >= 3) {
            const lockedValue = Math.round(nextHistory.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3);
            const lockedResult = { ...evaluation, credits: lockedValue, isLocked: true };
            transaction.set(evaluationRef, {
              evaluationHistory: nextHistory.slice(0, 3),
              isLocked: true,
              lockedValue,
              lockedResult,
              latestResult: lockedResult,
              updatedAt,
            }, { merge: true });
            return lockedResult;
          }

          const result = { ...evaluation, isLocked: false };
          transaction.set(evaluationRef, {
            evaluationHistory: nextHistory,
            isLocked: false,
            latestResult: result,
            updatedAt,
          }, { merge: true });
          return result;
        });
      }

      res.status(200).json(evaluation);
    } catch (error) {
      console.error("Erro na Cloud Function do Gemini:", error);
      res.status(500).json({ error: error?.message || "Erro interno ao avaliar item." });
    }
  }
);