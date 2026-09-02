import type { FreightOption } from '../types/donation';

const MELHOR_ENVIO_TOKEN = import.meta.env.VITE_MELHOR_ENVIO_TOKEN || '';
const MELHOR_ENVIO_SANDBOX_URL = 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate';

// Origem padrão usada para cotação (CEP da plataforma/hub de coleta, já que o app não coleta o CEP exato do doador)
const PLATFORM_ORIGIN_CEP = '01311-000';

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

// Payload padrão estimado para um pacote pequeno (item de desapego médio)
function buildPayload(fromCep: string, toCep: string, weight: number) {
  return {
    from: { postal_code: fromCep.replace(/\D/g, '') },
    to: { postal_code: toCep.replace(/\D/g, '') },
    package: {
      weight,
      width: 15,
      height: 10,
      length: 20
    }
  };
}

function buildFallbackOptions(): FreightOption[] {
  return [
    {
      id: 'me_fallback_pac',
      category: 'padrao',
      categoryLabel: 'Opções Padrão / Econômica',
      name: 'PAC (estimado)',
      carrierName: 'Correios',
      price: 18.90 * PLATFORM_MARKUP,
      deliveryTime: '5 a 9 dias úteis',
      icon: '📦',
      type: 'standard',
      badge: 'Estimado'
    },
    {
      id: 'me_fallback_sedex',
      category: 'padrao',
      categoryLabel: 'Opções Padrão / Econômica',
      name: 'SEDEX (estimado)',
      carrierName: 'Correios',
      price: 32.50 * PLATFORM_MARKUP,
      deliveryTime: '2 a 4 dias úteis',
      icon: '🚚',
      type: 'express',
      badge: 'Estimado'
    }
  ];
}

/**
 * Calcula as opções de frete via API Sandbox do Melhor Envio, aplicando a margem de 20% da plataforma.
 * Em caso de falha na requisição (rede, token ausente/inválido, etc.), retorna um fallback fixo de PAC/SEDEX.
 */
export async function calculateShipping(
  fromCep: string = PLATFORM_ORIGIN_CEP,
  toCep: string,
  weight: number = 1
): Promise<FreightOption[]> {
  if (!MELHOR_ENVIO_TOKEN) {
    console.warn('VITE_MELHOR_ENVIO_TOKEN não configurado. Usando cotação de frete estimada (fallback).');
    return buildFallbackOptions();
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
      body: JSON.stringify(buildPayload(fromCep, toCep, weight))
    });

    if (!response.ok) {
      throw new Error(`Melhor Envio respondeu HTTP ${response.status}`);
    }

    const data = (await response.json()) as MelhorEnvioApiOption[];

    const validOptions = data.filter((option) => !option.error && option.price);
    if (!validOptions.length) {
      throw new Error('Nenhuma opção de frete válida retornada pela API');
    }

    return validOptions.map((option) => {
      const originalPrice = Number(option.price);
      return {
        id: `me_${option.id}`,
        category: 'padrao',
        categoryLabel: 'Opções Padrão / Econômica',
        name: option.name,
        carrierName: option.company?.name || 'Transportadora parceira',
        price: originalPrice * PLATFORM_MARKUP,
        deliveryTime: `${option.delivery_time} dia${option.delivery_time === 1 ? '' : 's'} útil${option.delivery_time === 1 ? '' : 'eis'}`,
        icon: '📦',
        type: 'standard'
      } satisfies FreightOption;
    });
  } catch (error) {
    console.error('Erro ao calcular frete via Melhor Envio, usando fallback:', error);
    return buildFallbackOptions();
  }
}
