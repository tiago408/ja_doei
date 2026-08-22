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

// Tabela de Âncoras e Limites Por Categoria
const CATEGORY_ANCHORS: Record<string, { baseMin: number; baseMax: number }> = {
  eletrodomesticos: { baseMin: 150, baseMax: 600 },
  eletronicos: { baseMin: 200, baseMax: 1500 },
  moveis: { baseMin: 100, baseMax: 800 },
  vestuario: { baseMin: 20, baseMax: 150 },
  livros_brinquedos: { baseMin: 15, baseMax: 80 },
  outros: { baseMin: 30, baseMax: 200 },
};

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

  const prompt = `Você é o motor de precificação do app de doações 'Já Doei'. Avalie o valor MÉDIO de mercado em Reais (BRL) para o seguinte item usado no Brasil: Título: '${title}', Estado: '${condition}'. Responda estritamente em formato JSON: { "estimatedMarketValueBRL": number, "justification": string }.`;
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

export function calculateItemCredits(
  title: string,
  categoryKey: string,
  condition: string
): PricingResult {
  const category = CATEGORY_ANCHORS[categoryKey] || CATEGORY_ANCHORS["outros"];

  // Lógica heurística baseada no título e regras brasileiras (1 Crédito = R$ 1,00)
  let estimatedMarketValueBRL = (category.baseMin + category.baseMax) / 2;

  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("nespresso") || lowerTitle.includes("cafeteira")) {
    estimatedMarketValueBRL = 380;
  } else if (lowerTitle.includes("geladeira") || lowerTitle.includes("sofa")) {
    estimatedMarketValueBRL = 700;
  }

  const pricing = createPricingResult(
    title,
    condition,
    estimatedMarketValueBRL,
    `Item avaliado com base no valor médio de mercado (R$ ${estimatedMarketValueBRL}) ajustado pelo estado (${condition}).`
  );

  return { ...pricing, category: categoryKey };
}