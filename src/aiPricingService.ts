import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_CATEGORIES = [
  'Música & Instrumentos',
  'Casa, Cozinha & Utensílios',
  'Móveis & Decoração',
  'Eletrônicos & Tecnologia',
  'Esporte & Lazer',
  'Brinquedos & Jogos',
  'Moda & Acessórios',
  'Papelaria & Escritório',
  'Livros & Mídias',
  'Outros'
] as const;

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export interface EvaluationResult {
  title: string;
  category: string;
  credits: number;
  justification: string;
}

export async function evaluateItemWithGemini(
  titleText: string,
  categoryText: string,
  conditionText: string
): Promise<EvaluationResult | null> {
  try {
    if (!apiKey) {
      console.warn("Chave VITE_GEMINI_API_KEY não configurada.");
      return null;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      Você é o avaliador de doações do app Já Doei.
      Avalie o item com os seguintes dados:
      - Título: "${titleText}"
      - Categoria informada: "${categoryText}"
      - Estado de uso: "${conditionText}"

      Estime o valor em BRL de um item equivalente no mercado de seminovos e converta 1 BRL = 1 Crédito.
      Exemplos:
      - Garrafa Térmica Track & Field: ~120 a 150 créditos.
      - Sofá-cama: ~250 a 400 créditos.
      - Ukulele / Instrumentos: ~90 a 180 créditos.

      Categorias permitidas para a avaliação: ${GEMINI_CATEGORIES.join(', ')}.
      Responda ESTRITAMENTE em formato JSON com esta estrutura (sem markdown extra):
      {
        "title": "${titleText}",
        "category": "Escolha uma categoria da lista permitida",
        "credits": 120,
        "justification": "Explicação curta em 1 frase"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as EvaluationResult;
  } catch (error) {
    console.error("Erro na avaliação do Gemini:", error);
    return null;
  }
}