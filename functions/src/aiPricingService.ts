import { GoogleGenerativeAI, type Part } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
// Inicializa com a versão estável da API (v1) para evitar erro 404
const genAI = new GoogleGenerativeAI(apiKey);

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

// Hash simples (djb2) apenas para gerar uma chave curta e estável a partir do conteúdo analisado
function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash + content.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function buildCacheKey(userId: string | undefined, imageBase64: string | undefined, titleText: string | undefined, categoryText: string | undefined, conditionText: string | undefined): string {
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
    // sessionStorage indisponível (modo privado, quota excedida etc.) - cache em memória já cobre a sessão atual
  }
}

export async function evaluateItemWithGemini(
  imageBase64?: string,
  titleText?: string,
  categoryText?: string,
  conditionText?: string,
  userId?: string
): Promise<EvaluationResult | null> {
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY não configurada.');
    return null;
  }

  const cacheKey = buildCacheKey(userId, imageBase64, titleText, categoryText, conditionText);
  const cachedResult = readFromCache(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

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

    const contents: Array<string | Part> = [prompt];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imagePart: Part = {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg'
        }
      } as Part;
      contents.push(imagePart);
    }

    const result = await model.generateContent(contents);
    const text = result.response.text().trim();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(cleanJson) as EvaluationResult;
    const normalizedIsInvalid = parsed.isInvalid === true || String(parsed.isInvalid).toLowerCase() === 'true';
    const normalizedResult: EvaluationResult = {
      ...parsed,
      isInvalid: normalizedIsInvalid || !parsed.credits || parsed.credits <= 0
    };
    writeToCache(cacheKey, normalizedResult);
    return normalizedResult;
  } catch (error) {
    console.error('Erro na chamada do Gemini:', error);
    return null;
  }
}