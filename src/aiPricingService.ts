// src/aiPricingService.ts

export interface PricingResult {
  category: string;
  detectedModel: string;
  estimatedMarketValueBRL: number;
  suggestedCredits: number;
  minAllowedCredits: number;
  maxAllowedCredits: number;
  justification: string;
  requiresModeration: boolean;
}

export interface ImageAnalysisResult {
  title: string;
  category: string;
  description: string;
  estimatedMarketValueBRL: number;
}

// Fatores de Conservação
const CONDITION_MULTIPLIERS: Record<string, number> = {
  "Novo / Lacrado": 1.0,
  "Novo na caixa": 1.0,
  "Seminovo - Excelente estado": 0.8,
  "Usado - Bom estado": 0.6,
  "Usado - Com marcas de uso": 0.4,
};

function createPricingResult(
  title: string,
  condition: string,
  estimatedMarketValueBRL: number,
  justification: string
): PricingResult {
  const conditionMultiplier = CONDITION_MULTIPLIERS[condition] || 0.7;
  const suggestedCredits = Math.round(estimatedMarketValueBRL * conditionMultiplier);

  return {
    category: 'outros',
    detectedModel: title,
    estimatedMarketValueBRL,
    suggestedCredits,
    minAllowedCredits: Math.round(suggestedCredits * 0.8),
    maxAllowedCredits: Math.round(suggestedCredits * 1.2),
    justification,
    requiresModeration: suggestedCredits > 500,
  };
}

export async function fetchGeminiValuation(
  title: string,
  condition: string
): Promise<PricingResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada');
  }

  const prompt = `Você é o avaliador oficial do app Já Doei. Avalie o valor MÉDIO de mercado em Reais (BRL) para este item usado no Brasil. ATENÇÃO: Seja realista com miudezas e itens simples de papelaria/escritório (ex: canetas, lapiseiras, cadernos usados, copos simples valem entre R$ 3,00 e R$ 15,00 = 3 a 15 créditos). NÃO atribua valores altos a itens simples de baixíssimo valor comercial. Título: '${title}', Estado: '${condition}'. Responda estritamente em JSON: { "estimatedMarketValueBRL": number, "justification": string }.`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini retornou HTTP ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof responseText !== 'string') {
    throw new Error('Resposta do Gemini sem conteúdo');
  }

  const jsonText = responseText.replace(/^```json\s*|\s*```$/g, '').trim();
  const valuation = JSON.parse(jsonText) as {
    estimatedMarketValueBRL?: number;
    justification?: string;
  };
  if (
    typeof valuation.estimatedMarketValueBRL !== 'number' ||
    !Number.isFinite(valuation.estimatedMarketValueBRL)
  ) {
    throw new Error('Valor de mercado inválido na resposta do Gemini');
  }

  return createPricingResult(
    title,
    condition,
    Math.max(0, valuation.estimatedMarketValueBRL),
    valuation.justification || 'Valor estimado pelo Gemini com base no mercado brasileiro.'
  );
}

export async function analyzeImageWithGemini(base64Image: string): Promise<ImageAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada');
  }

  const [metadata, imageData] = base64Image.split(';base64,');
  const mimeType = metadata.match(/^data:(.+)$/)?.[1] || 'image/jpeg';
  if (!imageData) {
    throw new Error('Imagem inválida para análise visual');
  }

  const prompt = `Analise esta imagem e retorne estritamente um JSON com:
{
  "title": "Nome preciso do item identificando marca/modelo se visível",
  "category": "Categoria correspondente",
  "description": "Breve descrição do estado de conservação visível",
  "estimatedMarketValueBRL": número de 5 a 500
}
REGRAS RÍGIDAS DE PREÇO (1 Real = 1 Crédito):
- Miudezas/Papelaria/Utensílios simples: R$ 5 a R$ 15 (jamais passe de 15 créditos).
- Roupas/Calçados básicos: R$ 20 a R$ 60.
- Eletros pequenos/Brinquedos estruturados: R$ 80 a R$ 200.
- Móveis/Eletros de grande porte: R$ 200 a R$ 500.`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageData } }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  );

  if (!response.ok) throw new Error(`Gemini retornou HTTP ${response.status}`);
  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof responseText !== 'string') throw new Error('Resposta do Gemini sem conteúdo');

  const result = JSON.parse(responseText.replace(/^```json\s*|\s*```$/g, '').trim()) as Partial<ImageAnalysisResult>;
  if (
    typeof result.title !== 'string' ||
    typeof result.category !== 'string' ||
    typeof result.description !== 'string' ||
    typeof result.estimatedMarketValueBRL !== 'number' ||
    !Number.isFinite(result.estimatedMarketValueBRL)
  ) {
    throw new Error('Resposta de análise visual inválida');
  }

  return {
    title: result.title.trim(),
    category: result.category.trim(),
    description: result.description.trim(),
    estimatedMarketValueBRL: Math.min(500, Math.max(5, Math.round(result.estimatedMarketValueBRL)))
  };
}

export function calculateItemCredits(
  title: string,
  categoryKey: string,
  condition: string
): PricingResult {
  const lowerTitle = title.toLowerCase();
  let estimatedMarketValueBRL = 15;
  if (lowerTitle.includes("nespresso") || lowerTitle.includes("cafeteira")) estimatedMarketValueBRL = 380;
  else if (lowerTitle.includes("geladeira") || lowerTitle.includes("sofa")) estimatedMarketValueBRL = 700;
  else if (/(caneta|lapiseira|caderno|copo simples|miudeza)/.test(lowerTitle)) estimatedMarketValueBRL = 15;
  else if (categoryKey === 'eletrodomesticos') estimatedMarketValueBRL = 375;
  else if (categoryKey === 'eletronicos') estimatedMarketValueBRL = 850;
  else if (categoryKey === 'moveis') estimatedMarketValueBRL = 450;
  else if (categoryKey === 'vestuario') estimatedMarketValueBRL = 85;
  else if (categoryKey === 'livros_brinquedos') estimatedMarketValueBRL = 48;

  const pricing = createPricingResult(
    title,
    condition,
    estimatedMarketValueBRL,
    `Item avaliado com base no valor médio de mercado (R$ ${estimatedMarketValueBRL}) ajustado pelo estado (${condition}).`
  );

  return { ...pricing, category: categoryKey };
}