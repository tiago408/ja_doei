export interface PackageDimensions {
  weight: number; // kg
  height: number; // cm
  width: number; // cm
  length: number; // cm
}

export interface EstimatedDimensions extends PackageDimensions {
  /** Volume estimado em cm³ (altura x largura x comprimento) */
  volume: number;
}

export const DEFAULT_DIMENSIONS: PackageDimensions = {
  weight: 0.5,
  height: 10,
  width: 15,
  length: 20
};

export const CATEGORY_DIMENSIONS: Record<string, PackageDimensions> = {
  light: { weight: 0.3, height: 5, width: 15, length: 20 },
  medium: { weight: 1.0, height: 12, width: 20, length: 30 },
  heavy: { weight: 1.5, height: 15, width: 20, length: 25 }
};

// Palavras-chave normalizadas (sem acento, minúsculas) por faixa de dimensão
const CATEGORY_KEYWORDS: Record<keyof typeof CATEGORY_DIMENSIONS, string[]> = {
  light: ['roupa', 'roupas', 'vestuario', 'moda', 'acessorio', 'acessorios', 'bijuteria', 'livro', 'livros'],
  medium: ['calcado', 'calcados', 'tenis', 'sapato', 'sapatos', 'bota', 'botas', 'casaco', 'casacos', 'jaqueta', 'agasalho'],
  heavy: ['eletronico', 'eletronicos', 'eletro', 'casa', 'cozinha', 'decoracao', 'movel', 'moveis', 'utilidades']
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Retorna o peso e as dimensões estimadas (incluindo volume em cm³) para uma categoria de item.
 * Categorias desconhecidas caem no padrão de pacote pequeno.
 */
export function getDimensionsByCategory(category: string): EstimatedDimensions {
  const normalized = normalize(category || '');

  const matchedKey = (Object.keys(CATEGORY_KEYWORDS) as (keyof typeof CATEGORY_DIMENSIONS)[]).find((key) =>
    CATEGORY_KEYWORDS[key].some((keyword) => normalized.includes(keyword))
  );

  const dimensions = matchedKey ? CATEGORY_DIMENSIONS[matchedKey] : DEFAULT_DIMENSIONS;

  return {
    ...dimensions,
    volume: dimensions.height * dimensions.width * dimensions.length
  };
}
