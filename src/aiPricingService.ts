import { auth } from './firebase';

export interface EvaluationResult {
  title: string;
  category: string;
  credits: number;
  justification: string;
  isInvalid?: boolean;
  invalidReason?: string;
}

// URL da Cloud Function gerada no deploy
const FUNCTION_URL = "/api/evaluateItem";

export async function evaluateItemWithGemini(
  imageBase64?: string,
  titleText?: string,
  categoryText?: string,
  conditionText?: string,
  userId?: string
): Promise<EvaluationResult | null> {
  const currentUser = auth.currentUser;
  if (!userId || !currentUser || currentUser.uid !== userId) {
    throw new Error('Sua sessão expirou. Entre novamente para avaliar o item.');
  }

  try {
    const idToken = await currentUser.getIdToken();
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        imageBase64,
        titleText,
        categoryText,
        conditionText,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Erro de rede HTTP: ${response.status}`);
    }

    const data: EvaluationResult = await response.json();
    return data;
  } catch (error) {
    console.error('Erro na chamada da Cloud Function:', error);
    throw error;
  }
}