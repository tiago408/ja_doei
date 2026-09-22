const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

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