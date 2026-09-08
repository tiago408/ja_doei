import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserAddress } from '../types/database';

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  whatsapp: string;
  address: UserAddress;
}

export const SIGNUP_VERIFICATION_MESSAGE =
  'Conta criada! Enviamos um e-mail de confirmação. Clique no link recebido para ativar todos os recursos.';

// Cria a conta no Auth, grava o perfil completo em users/{uid} e dispara o e-mail de verificação
export const signUpWithEmail = async ({ name, email, password, whatsapp, address }: SignUpPayload): Promise<User> => {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const displayName = name.trim() || 'Usuário Já Doei';

  await updateProfile(credential.user, { displayName });

  const normalizedAddress: UserAddress = {
    cep: address.cep.trim(),
    logradouro: address.logradouro.trim(),
    numero: address.numero.trim(),
    complemento: address.complemento?.trim() || '',
    bairro: address.bairro.trim(),
    cidade: address.cidade.trim(),
    estado: address.estado.trim().toUpperCase()
  };

  const userRef = doc(db, 'users', credential.user.uid);
  const existing = await getDoc(userRef);

  await setDoc(
    userRef,
    {
      name: displayName,
      email: credential.user.email || email.trim(),
      photoURL: credential.user.photoURL || null,
      whatsapp: whatsapp.trim(),
      ...normalizedAddress,
      // Campos legados usados pelo feed e pelo cálculo de frete
      city: normalizedAddress.cidade,
      state: normalizedAddress.estado,
      location: `${normalizedAddress.bairro ? `${normalizedAddress.bairro}, ` : ''}${normalizedAddress.cidade}${
        normalizedAddress.estado ? ` - ${normalizedAddress.estado}` : ''
      }`,
      emailVerified: false,
      ...(existing.exists() ? {} : { credits: 150, createdAt: serverTimestamp() })
    },
    { merge: true }
  );

  await sendEmailVerification(credential.user);

  return credential.user;
};

// Reenvia o e-mail de confirmação para o usuário logado
export const resendVerificationEmail = async () => {
  if (!auth.currentUser) throw new Error('Nenhum usuário autenticado.');
  await auth.currentUser.reload();
  if (auth.currentUser.emailVerified) return false;
  await sendEmailVerification(auth.currentUser);
  return true;
};

// Recarrega o usuário do Auth para obter o status mais recente de emailVerified
export const refreshEmailVerifiedStatus = async () => {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
};
