import { getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import type { MessagePayload } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

// Solicita permissão de notificação, obtém o FCM token do dispositivo e salva em users/{userId}
export const registerPushNotifications = async (userId: string): Promise<string | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    if (!VAPID_KEY) {
      console.warn('VITE_FIREBASE_VAPID_KEY não configurada. Push notifications desativadas.');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      await updateDoc(doc(db, 'users', userId), { fcmToken: token });
    }

    return token || null;
  } catch (error) {
    console.error('Erro ao registrar notificações push:', error);
    throw error;
  }
};

// Recebimento em primeiro plano (foreground): o SDK não mostra notificação do sistema sozinho
export const listenForForegroundMessages = (callback: (payload: MessagePayload) => void): (() => void) => {
  let unsubscribe = () => {};
  let cancelled = false;

  isSupported()
    .then((supported) => {
      // Evita registrar o listener se o componente já desmontou antes do isSupported resolver
      if (!supported || cancelled) return;
      const messaging = getMessaging(getApp());
      unsubscribe = onMessage(messaging, callback);
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
    unsubscribe();
  };
};
