import { GoogleGenerativeAI } from '@google/generative-ai';

// src/aiPricingService.ts

export interface ItemAnalysisResult {
  title: string;
  category: string;
  credits: number;
  justification: string;
}

export interface ImageAnalysisResult {
  title: string;
  category: string;
  estimatedMarketValueBRL: number;
  justification?: string;
}

const ALLOWED_CATEGORIES = [
  'Papelaria & Escritório',
  'Casa, Cozinha & Utensílios',
  'Moda & Calçados Adulto',
  'Moda & Calçados Infantil',
  'Brinquedos & Jogos',
  'Bebês & Maternidade',
  'Eletrônicos & Acessórios',
  'Eletrodomésticos & Portáteis',
  'Livros & Mídia',
  'Esporte & Lazer',
  'Beleza & Cuidado Pessoal',
  'Móveis & Decoração',
  'Pet Shop',
  'Música & Instrumentos',
  'Outros'
] as const;

export async function analyzeItem(
  imageBase64?: string,
  titleText?: string,
  categoryText?: string,
  conditionText?: string
): Promise<ItemAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Chave do Gemini não configurada nas variáveis de ambiente.');
    throw new Error('VITE_GEMINI_API_KEY não configurada');
  }

  const cleanBase64 = imageBase64?.replace(/^data:image\/[^;]+;base64,/, '').trim();
  if (!cleanBase64 && !titleText?.trim()) throw new Error('Informe uma imagem ou título para análise');

  const prompt = `Você é o avaliador oficial de doações do app Já Doei.
Analise a IMAGEM enviada e/ou o TÍTULO ('${titleText || ''}'), CATEGORIA ('${categoryText || ''}') e ESTADO ('${conditionText || ''}').
Sua missão é identificar o item exato e seu valor estimado de mercado em BRL (R$).
Exemplo: Uma Garrafa Térmica Track & Field vale R$ 120 (120 créditos). Um Sofá vale R$ 300 (300 créditos).
Retorne ESTRITAMENTE um JSON no formato:
{
  "title": "Nome do Produto Identificado",
  "category": "Nome da Categoria Correta",
  "credits": 120,
  "justification": "Explicação breve"
}`;
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
  if (cleanBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
  const result = await model.generateContent(parts);
  const responseText = result.response.text();
  const analysis = JSON.parse(responseText.replace(/^```json\s*|\s*```$/g, '').trim()) as Partial<ItemAnalysisResult>;
  if (
    typeof analysis.title !== 'string' ||
    typeof analysis.category !== 'string' ||
    typeof analysis.credits !== 'number' ||
    !Number.isFinite(analysis.credits) ||
    analysis.credits <= 0 ||
    typeof analysis.justification !== 'string'
  ) throw new Error('Resposta inválida do Gemini');
  return {
    title: analysis.title.trim(),
    category: ALLOWED_CATEGORIES.includes(analysis.category as (typeof ALLOWED_CATEGORIES)[number]) ? analysis.category : 'Outros',
    credits: Math.round(analysis.credits),
    justification: analysis.justification.trim()
  };
}