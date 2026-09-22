// Camada de acesso ao Firestore usada pelo Painel Administrativo.
// Cada ação é uma função isolada e sem estado de UI para que, no futuro,
// uma Cloud Function (bot James) possa reaproveitar a mesma lógica/chamadas.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import type { AdminReport } from '../types/donation';

const REPORTS_COLLECTION = 'reports';
const DONATIONS_COLLECTION = 'donations';
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';

export interface AdminDonationSummary {
  id: string;
  title: string;
  imageUrl: string | null;
  category: string | null;
  credits: number | null;
  status: string | null;
  donorName: string | null;
}

export interface AdminUserSummary {
  id: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  banned: boolean;
}

const mapReportDoc = (id: string, data: Record<string, unknown>): AdminReport => ({
  id,
  donationId: (data.donationId as string) || '',
  donationTitle: (data.donationTitle as string) || 'Anúncio sem título',
  reportedUserId: (data.reportedUserId as string) || null,
  reporterUserId: (data.reporterUserId as string) || '',
  reporterName: (data.reporterName as string) || 'Usuário não identificado',
  reason: (data.reason as string) || 'Motivo não informado',
  details: (data.details as string) || '',
  createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? null,
  status: (data.status as string) || 'pending'
});

// Escuta em tempo real as denúncias pendentes na fila de moderação
export const subscribeToPendingReports = (
  onChange: (reports: AdminReport[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe => {
  const reportsQuery = query(collection(db, REPORTS_COLLECTION), where('status', '==', 'pending'));
  return onSnapshot(
    reportsQuery,
    (snapshot) => onChange(snapshot.docs.map((reportDoc) => mapReportDoc(reportDoc.id, reportDoc.data()))),
    onError
  );
};

// Verifica no Firestore (users/{uid}) se o usuário autenticado possui a role 'admin'
export const checkUserIsAdmin = async (uid: string): Promise<boolean> => {
  const userSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!userSnap.exists()) return false;
  return userSnap.data().role === 'admin';
};

// Busca dados do item denunciado para exibir contexto completo no card de moderação
export const fetchDonationSummary = async (donationId: string): Promise<AdminDonationSummary | null> => {
  if (!donationId) return null;
  const donationSnap = await getDoc(doc(db, DONATIONS_COLLECTION, donationId));
  if (!donationSnap.exists()) return null;
  const data = donationSnap.data();
  return {
    id: donationSnap.id,
    title: data.title || 'Anúncio sem título',
    imageUrl: data.imageUrl || data.image || null,
    category: data.category || null,
    credits: typeof data.credits === 'number' ? data.credits : null,
    status: data.status || null,
    donorName: data.donorName || data.userName || null
  };
};

// Busca dados do usuário denunciado para exibir contexto completo no card de moderação
export const fetchUserSummary = async (userId: string): Promise<AdminUserSummary | null> => {
  if (!userId) return null;
  const userSnap = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (!userSnap.exists()) return null;
  const data = userSnap.data();
  return {
    id: userSnap.id,
    name: data.name || data.displayName || null,
    email: data.email || null,
    photoURL: data.photoURL || null,
    banned: data.banned === true
  };
};

// Ação "Excluir Item": avisa o dono do item, remove a doação denunciada e marca a denúncia como resolvida
export const deleteReportedDonation = async (report: AdminReport): Promise<void> => {
  if (report.donationId) {
    const donationRef = doc(db, DONATIONS_COLLECTION, report.donationId);
    const donationSnap = await getDoc(donationRef);

    if (donationSnap.exists()) {
      const donationData = donationSnap.data();
      const ownerUserId = (donationData.userId as string) || report.reportedUserId;
      const itemTitle = (donationData.title as string) || report.donationTitle;

      if (ownerUserId) {
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
          userId: ownerUserId,
          title: 'Item Removido',
          message: `Seu item "${itemTitle}" foi removido por não estar de acordo com as regras da plataforma.`,
          type: 'item_removed',
          donationId: report.donationId,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    }

    await deleteDoc(donationRef);
  }

  await updateDoc(doc(db, REPORTS_COLLECTION, report.id), {
    status: 'resolved',
    resolution: 'item_deleted',
    resolvedAt: serverTimestamp()
  });
};

// Ação "Ignorar Denúncia": remove o item da fila sem afetar o anúncio
export const dismissReport = async (reportId: string): Promise<void> => {
  await deleteDoc(doc(db, REPORTS_COLLECTION, reportId));
};

// Ação "Banir Usuário": marca o autor do item denunciado como banido
export const banReportedUser = async (userId: string): Promise<void> => {
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    banned: true,
    bannedAt: serverTimestamp()
  });
};
