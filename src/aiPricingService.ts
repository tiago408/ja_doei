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
  'Outros'
] as const;

// Fatores de Conservação
const CONDITION_MULTIPLIERS: Record<string, number> = {
  "Novo na caixa": 1.0,
  "Usado - Excelente": 0.8,
  "Usado - Marcas de uso": 0.55,
  "Para conserto/peças": 0.2,
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
  category: string,
  condition: string
): Promise<PricingResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada');
  }

  const prompt = `Avalie o item '${title}' na categoria '${category}' com o estado de conservação '${condition}'. APLIQUE FATOR DE DEPRECIAÇÃO RÍGIDO: Novo na Caixa: 100% do preço de mercado seminovo. Usado Excelente: 80% do valor. Usado com Marcas de Uso: 50% a 60% do valor. Com defeito / Para peças: máximo 20% do valor. Escolha obrigatoriamente uma categoria exatamente desta lista: Papelaria & Escritório; Casa, Cozinha & Utensílios; Moda & Calçados Adulto; Moda & Calçados Infantil; Brinquedos & Jogos; Bebês & Maternidade; Eletrônicos & Acessórios; Eletrodomésticos & Portáteis; Livros & Mídia; Esporte & Lazer; Beleza & Cuidado Pessoal; Móveis & Decoração; Pet Shop; Outros. Responda em JSON com { "category": "categoria exata da lista", "estimatedMarketValueBRL": number, "justification": string }.`;
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
    category?: string;
    estimatedMarketValueBRL?: number;
    justification?: string;
  };
  if (
    typeof valuation.estimatedMarketValueBRL !== 'number' ||
    !Number.isFinite(valuation.estimatedMarketValueBRL)
  ) {
    throw new Error('Valor de mercado inválido na resposta do Gemini');
  }

  const pricingResult = createPricingResult(
    title,
    condition,
    Math.max(0, valuation.estimatedMarketValueBRL),
    valuation.justification || 'Valor estimado pelo Gemini com base no mercado brasileiro.'
  );
  return {
    ...pricingResult,
    category: ALLOWED_CATEGORIES.includes(valuation.category as (typeof ALLOWED_CATEGORIES)[number])
      ? valuation.category!
      : 'Outros'
  };
}

export async function analyzeImageWithGemini(base64Image: string): Promise<ImageAnalysisResult> {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY não configurada');
    }

    const cleanBase64 = base64Image.replace(/^data:image\/[^;]+;base64,/, '').trim();
    if (!cleanBase64) {
      throw new Error('Imagem inválida para análise visual');
    }

    const prompt = `Analise esta imagem e retorne estritamente um JSON com:
{
  "title": "Nome preciso do item identificando marca/modelo se visível",
  "category": "Uma categoria exatamente da lista: Papelaria & Escritório; Casa, Cozinha & Utensílios; Moda & Calçados Adulto; Moda & Calçados Infantil; Brinquedos & Jogos; Bebês & Maternidade; Eletrônicos & Acessórios; Eletrodomésticos & Portáteis; Livros & Mídia; Esporte & Lazer; Beleza & Cuidado Pessoal; Móveis & Decoração; Pet Shop; Outros",
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
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
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
  } catch (error) {
    console.warn('Visão IA indisponível, usando fallback de texto', error);
    return {
      title: '',
      category: 'Outros',
      description: '',
      estimatedMarketValueBRL: 50
    };
  }
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