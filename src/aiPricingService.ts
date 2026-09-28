export interface EvaluationResult {
  title: string;
  category: string;
  credits: number;
  justification: string;
  isInvalid?: boolean;
  invalidReason?: string;
}

const PRICING_CACHE_PREFIX = 'ja-doei:pricing-cache:';
const inMemoryPricingCache = new Map<string, EvaluationResult>();

// URL da Cloud Function gerada no deploy
const FUNCTION_URL = "/api/evaluateItem";

// Hash simples (djb2) apenas para gerar uma chave curta e estável a partir do conteúdo analisado
function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash + content.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function buildCacheKey(
  userId: string | undefined,
  imageBase64: string | undefined,
  titleText: string | undefined,
  categoryText: string | undefined,
  conditionText: string | undefined
): string {
  const userPart = userId?.trim() || 'anon';
  const contentPart = imageBase64
    ? hashContent(imageBase64)
    : hashContent(`${titleText || ''}|${categoryText || ''}|${conditionText || ''}`);
  return `${PRICING_CACHE_PREFIX}${userPart}:${contentPart}`;
}

function readFromCache(cacheKey: string): EvaluationResult | null {
  if (inMemoryPricingCache.has(cacheKey)) {
    return inMemoryPricingCache.get(cacheKey) as EvaluationResult;
  }
  try {
    const stored = sessionStorage.getItem(cacheKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as EvaluationResult;
    inMemoryPricingCache.set(cacheKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeToCache(cacheKey: string, result: EvaluationResult): void {
  inMemoryPricingCache.set(cacheKey, result);
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {
    // sessionStorage indisponível (modo privado, quota excedida etc.)
  }
}

export async function evaluateItemWithGemini(
  imageBase64?: string,
  titleText?: string,
  categoryText?: string,
  conditionText?: string,
  userId?: string
): Promise<EvaluationResult | null> {
  const cacheKey = buildCacheKey(userId, imageBase64, titleText, categoryText, conditionText);
  const cachedResult = readFromCache(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    writeToCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Erro na chamada da Cloud Function:', error);
    return null;
  }
}