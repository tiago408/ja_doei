import { GoogleGenerativeAI, type Part } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export interface EvaluationResult {
  title: string;
  category: string;
  credits: number;
  justification: string;
}

export async function evaluateItemWithGemini(
  imageBase64?: string,
  titleText?: string,
  categoryText?: string,
  conditionText?: string
): Promise<EvaluationResult | null> {
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY não configurada.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      Você é o avaliador oficial do app Já Doei.
      Analise o item (pela imagem e/ou pelas informações fornecidas):
      - Título atual: "${titleText || ''}"
      - Categoria informada: "${categoryText || ''}"
      - Condição: "${conditionText || 'Usado - Excelente'}"

      Instruções:
      1. Identifique o produto com precisão. Se o título estiver vazio, gere um título comercial adequado.
      2. Escolha a melhor categoria entre: ["Música & Instrumentos", "Casa, Cozinha & Utensílios", "Móveis & Decoração", "Eletrônicos & Tecnologia", "Esporte & Lazer", "Brinquedos & Jogos", "Moda & Acessórios", "Papelaria & Escritório", "Livros & Mídias", "Outros"].
      3. Estime o valor em BRL de mercado para seminovos (1 BRL = 1 Crédito).
         Regra de conservação: "Novo na caixa" = 100%, "Usado - Excelente" = 75-85%, "Usado - Bom" = 50-60%.

      Retorne EXCLUSIVAMENTE um JSON VÁLIDO no seguinte formato (sem formatação markdown \`\`\`json):
      {
        "title": "Nome Exato do Item",
        "category": "Nome da Categoria",
        "credits": 65,
        "justification": "Explicacao curta de 1 frase"
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

    return JSON.parse(cleanJson) as EvaluationResult;
  } catch (error) {
    console.error('Erro na chamada do Gemini:', error);
    return null;
  }
}
