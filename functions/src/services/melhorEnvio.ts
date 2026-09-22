import type { FreightOption } from '../types/donation';
import { getDimensionsByCategory, DEFAULT_DIMENSIONS } from '../constants/shippingDimensions';

export interface ShippingItemInput {
  category?: string;
  quantity?: number;
}

interface ConsolidatedBox {
  weight: number;
  height: number;
  width: number;
  length: number;
}

const MELHOR_ENVIO_TOKEN = import.meta.env.VITE_MELHOR_ENVIO_TOKEN || '';
const MELHOR_ENVIO_SANDBOX_URL = 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate';

// CEP de origem padrão (usado quando o item/doador não possui um CEP próprio cadastrado)
const DEFAULT_ORIGIN_CEP = '01001-000';

// Margem de 20% aplicada pela plataforma sobre o valor original de cada opção de frete
const PLATFORM_MARKUP = 1.20;

interface MelhorEnvioApiOption {
  id: number;
  name: string;
  price: string;
  delivery_time: number;
  company: {
    name: string;
    picture?: string;
  };
  error?: string;
}

// Ícone exibido por transportadora, com fallback genérico de caixa/pacote
function getCarrierIcon(companyName: string, serviceName: string): string {
  const label = `${companyName} ${serviceName}`.toLowerCase();
  if (label.includes('sedex')) return '🚚';
  if (label.includes('jadlog')) return '📦';
  if (label.includes('loggi')) return '🛵';
  if (label.includes('pac') || label.includes('correios')) return '📮';
  return '📦';
}

/**
 * Consolida vários itens do mesmo doador em uma única caixa: soma os pesos e o volume acumulado,
 * mantendo a maior largura/comprimento e derivando a altura a partir do volume total.
 */
export function consolidatePackage(items: ShippingItemInput[]): ConsolidatedBox {
  if (!items.length) {
    return { ...DEFAULT_DIMENSIONS };
  }

  let totalWeight = 0;
  let totalVolume = 0;
  let maxWidth = 0;
  let maxLength = 0;

  for (const item of items) {
    const quantity = Math.max(1, item.quantity ?? 1);
    const dimensions = getDimensionsByCategory(item.category || '');

    totalWeight += dimensions.weight * quantity;
    totalVolume += dimensions.volume * quantity;
    maxWidth = Math.max(maxWidth, dimensions.width);
    maxLength = Math.max(maxLength, dimensions.length);
  }

  const width = maxWidth || DEFAULT_DIMENSIONS.width;
  const length = maxLength || DEFAULT_DIMENSIONS.length;
  const height = Math.max(2, Math.ceil(totalVolume / (width * length)));

  return {
    weight: Number(totalWeight.toFixed(2)),
    height,
    width,
    length
  };
}

function buildPayload(fromCep: string, toCep: string, box: ConsolidatedBox) {
  const originDigits = fromCep.replace(/\D/g, '');
  const validOrigin = originDigits.length === 8 ? originDigits : DEFAULT_ORIGIN_CEP.replace(/\D/g, '');

  return {
    from: { postal_code: validOrigin },
    to: { postal_code: toCep.replace(/\D/g, '') },
    package: {
      weight: box.weight,
      width: box.width,
      height: box.height,
      length: box.length
    }
  };
}

// Fator de distância aproximado a partir da região dos CEPs (1º e 2º dígitos)
function estimateDistanceFactor(fromCep: string, toCep: string) {
  const from = Number(fromCep.slice(0, 2));
  const to = Number(toCep.slice(0, 2));
  if (Number.isNaN(from) || Number.isNaN(to)) return 1.3;
  const regionGap = Math.min(Math.abs(from - to), 60);
  return 1 + (regionGap / 60) * 0.9;
}

// Peso cobrado: o maior entre peso real e peso cúbico (volume / 6000)
function billableWeight(box: ConsolidatedBox) {
  const cubic = (box.width * box.height * box.length) / 6000;
  return Math.max(box.weight, cubic, 0.3);
}

/**
 * Estimativa local usada quando a API do Melhor Envio não está disponível (token ausente ou bloqueio de CORS).
 * O valor varia conforme o peso/volume consolidado e a distância entre os CEPs de origem e destino.
 */
function buildFallbackOptions(box: ConsolidatedBox, fromCep: string, toCep: string): FreightOption[] {
  const weight = billableWeight(box);
  const distanceFactor = estimateDistanceFactor(fromCep, toCep);

  const price = (base: number, perKg: number) =>
    Number((((base + perKg * weight) * distanceFactor) * PLATFORM_MARKUP).toFixed(2));

  return [
    {
      id: 'me_fallback_pac',
      category: 'padrao',
      categoryLabel: 'Opções Padrão / Econômica',
      name: 'PAC (estimado)',
      carrierName: 'Correios',
      price: price(12.90, 4.20),
      deliveryTime: '5 a 9 dias úteis',
      icon: '📮',
      type: 'standard',
      badge: 'Estimado'
    },
    {
      id: 'me_fallback_sedex',
      category: 'padrao',
      categoryLabel: 'Opções Padrão / Econômica',
      name: 'SEDEX (estimado)',
      carrierName: 'Correios',
      price: price(23.50, 7.40),
      deliveryTime: '2 a 4 dias úteis',
      icon: '🚚',
      type: 'express',
      badge: 'Estimado'
    },
    {
      id: 'me_fallback_jadlog',
      category: 'padrao',
      categoryLabel: 'Opções Padrão / Econômica',
      name: 'Jadlog Package (estimado)',
      carrierName: 'Jadlog',
      price: price(15.40, 5.10),
      deliveryTime: '4 a 7 dias úteis',
      icon: '📦',
      type: 'standard',
      badge: 'Estimado'
    },
    {
      id: 'me_fallback_loggi',
      category: 'padrao',
      categoryLabel: 'Opções Padrão / Econômica',
      name: 'Loggi (estimado)',
      carrierName: 'Loggi',
      price: price(11.20, 6.30),
      deliveryTime: '1 a 2 dias úteis',
      icon: '🛵',
      type: 'express',
      badge: 'Estimado'
    }
  ];
}

/**
 * Calcula as opções de frete consolidadas (uma caixa por doador) via API Sandbox do Melhor Envio,
 * aplicando a margem de 20% da plataforma. Em caso de falha na requisição (rede, token ausente/inválido,
 * etc.), retorna um fallback fixo com PAC, SEDEX, Jadlog e Loggi simulados.
 */
export async function calculateShipping(
  fromCep: string = DEFAULT_ORIGIN_CEP,
  toCep: string,
  items: ShippingItemInput[] = []
): Promise<FreightOption[]> {
  const box = consolidatePackage(items);
  const originDigits = fromCep.replace(/\D/g, '');
  const validOrigin = originDigits.length === 8 ? originDigits : DEFAULT_ORIGIN_CEP.replace(/\D/g, '');
  const destinationDigits = toCep.replace(/\D/g, '');

  if (!MELHOR_ENVIO_TOKEN) {
    console.warn('VITE_MELHOR_ENVIO_TOKEN não configurado. Usando cotação de frete estimada (fallback).');
    return buildFallbackOptions(box, validOrigin, destinationDigits);
  }

  try {
    const response = await fetch(MELHOR_ENVIO_SANDBOX_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MELHOR_ENVIO_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Já Doei (contato@jadoei.app)'
      },
      body: JSON.stringify(buildPayload(fromCep, toCep, box))
    });

    if (!response.ok) {
      throw new Error(`Melhor Envio respondeu HTTP ${response.status}`);
    }

    const data = (await response.json()) as MelhorEnvioApiOption[];

    // Remove opções com erro ou indisponíveis para o trecho (ex: "Jadlog .Com", "Jadlog Package", "Loggi", "PAC", "SEDEX")
    const validOptions = data.filter((option) => !option.error && option.price);
    if (!validOptions.length) {
      throw new Error('Nenhuma opção de frete válida retornada pela API');
    }

    return validOptions.map((option) => {
      const originalPrice = Number(option.price);
      const carrierName = option.company?.name || 'Transportadora parceira';
      return {
        id: `me_${option.id}`,
        category: 'padrao',
        categoryLabel: 'Opções Padrão / Econômica',
        name: option.name,
        carrierName,
        price: originalPrice * PLATFORM_MARKUP,
        deliveryTime: `${option.delivery_time} dia${option.delivery_time === 1 ? '' : 's'} útil${option.delivery_time === 1 ? '' : 'eis'}`,
        icon: getCarrierIcon(carrierName, option.name),
        type: 'standard'
      } satisfies FreightOption;
    });
  } catch (error) {
    console.error(
      'Erro ao calcular frete via Melhor Envio (token inválido ou bloqueio de CORS no navegador). Usando estimativa local:',
      error
    );
    return buildFallbackOptions(box, validOrigin, destinationDigits);
  }
}
