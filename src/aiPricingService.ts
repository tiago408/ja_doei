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
  "Seminovo - Excelente estado": 0.8,
  "Usado - Bom estado": 0.6,
  "Usado - Com marcas de uso": 0.4,
};

export function calculateItemCredits(
  title: string,
  categoryKey: string,
  condition: string
): PricingResult {
  const category = CATEGORY_ANCHORS[categoryKey] || CATEGORY_ANCHORS["outros"];
  const conditionMultiplier = CONDITION_MULTIPLIERS[condition] || 0.7;

  // Lógica heurística baseada no título e regras brasileiras (1 Crédito = R$ 1,00)
  let estimatedMarketValueBRL = (category.baseMin + category.baseMax) / 2;

  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("nespresso") || lowerTitle.includes("cafeteira")) {
    estimatedMarketValueBRL = 380;
  } else if (lowerTitle.includes("geladeira") || lowerTitle.includes("sofa")) {
    estimatedMarketValueBRL = 700;
  }

  // Aplica depreciação e conversão 1:1
  const finalCredits = Math.round(estimatedMarketValueBRL * conditionMultiplier);
  const minAllowed = Math.round(finalCredits * 0.8); // Trava -20%
  const maxAllowed = Math.round(finalCredits * 1.2); // Trava +20%

  return {
    category: categoryKey,
    detectedModel: title,
    estimatedMarketValueBRL,
    suggestedCredits: finalCredits,
    minAllowedCredits: minAllowed,
    maxAllowedCredits: maxAllowed,
    justification: `Item avaliado com base no valor médio de mercado (R$ ${estimatedMarketValueBRL}) ajustado pelo estado (${condition}).`,
    requiresModeration: finalCredits > 500,
  };
}