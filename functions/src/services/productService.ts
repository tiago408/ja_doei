import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ProductDocument } from '../types';

export const getProducts = (
  callback: (products: ProductDocument[]) => void
) => {
  const productsRef = collection(db, 'products');
  const q = query(productsRef, where('isActive', '==', true));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const products: ProductDocument[] = [];
    snapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as ProductDocument);
    });
    callback(products);
  });

  return unsubscribe;
};

export const createProduct = async (
  productData: Omit<ProductDocument, 'id' | 'createdAt' | 'updatedAt'>
) => {
  try {
    const productsRef = collection(db, 'products');
    const docRef = await addDoc(productsRef, {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar doação:', error);
    throw error;
  }
};
