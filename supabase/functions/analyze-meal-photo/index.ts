// Edge Function do VITA: recebe a foto de um prato, manda pra API da Anthropic (Claude com
// visão) e devolve uma estimativa estruturada de calorias/macros. A chave da API fica só aqui
// (variável de ambiente do projeto Supabase) — nunca é exposta no app (que é um site estático).
//
// Deploy:
//   supabase functions deploy analyze-meal-photo
// Chave da API (defina uma vez, não é enviada no deploy acima):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Por padrão o Supabase exige um usuário autenticado pra chamar essa função (verify_jwt ligado) —
// não desative isso, senão qualquer pessoa poderia gastar sua cota da API sem estar logada no app.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk/helpers/zod';
import { z } from 'npm:zod';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// ~6MB em base64 (um pouco acima do normal pra foto de celular já comprimida) — barra antes de
// gastar a chamada da API com um arquivo claramente grande demais.
const MAX_BASE64_LENGTH = 8_000_000;

const MealItemSchema = z.object({
  name: z.string().describe('Nome do alimento em português do Brasil, em linguagem simples (ex: "Arroz branco", "Peito de frango grelhado")'),
  estimated_grams: z.number().describe('Peso estimado da porção em gramas'),
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});
const MealAnalysisSchema = z.object({
  items: z.array(MealItemSchema).describe('Cada alimento ou componente identificável visível no prato'),
  total_kcal: z.number(),
  total_protein_g: z.number(),
  total_carbs_g: z.number(),
  total_fat_g: z.number(),
  confidence: z.enum(['baixa', 'media', 'alta']).describe('Confiança da estimativa visual: baixa se o prato está parcialmente visível, misturado ou com molhos que escondem o conteúdo'),
  note: z.string().describe('Uma frase curta em português, em tom de app de fitness, lembrando que é uma estimativa aproximada'),
});

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não suportado.' }), { status: 405, headers: JSON_HEADERS });
  }

  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    console.error('ANTHROPIC_API_KEY não configurada');
    return new Response(JSON.stringify({ error: 'Função não configurada no servidor (chave da API ausente).' }), { status: 500, headers: JSON_HEADERS });
  }

  let body: { imageBase64?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corpo da requisição inválido.' }), { status: 400, headers: JSON_HEADERS });
  }

  const { imageBase64, mediaType } = body;
  if (!imageBase64 || !mediaType) {
    return new Response(JSON.stringify({ error: 'Envie imageBase64 e mediaType.' }), { status: 400, headers: JSON_HEADERS });
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return new Response(JSON.stringify({ error: 'Formato de imagem não suportado — use JPEG, PNG, WEBP ou GIF.' }), { status: 400, headers: JSON_HEADERS });
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return new Response(JSON.stringify({ error: 'Imagem muito grande — tente uma foto com menos resolução.' }), { status: 413, headers: JSON_HEADERS });
  }

  try {
    const response = await anthropic.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 4096,
      output_config: {
        effort: 'low',
        format: zodOutputFormat(MealAnalysisSchema),
      },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType as Anthropic.Base64ImageSource['media_type'], data: imageBase64 } },
          {
            type: 'text',
            text: 'Essa é uma foto de uma refeição. Identifique cada alimento visível, estime o peso em gramas de cada um com base em porções realistas do dia a dia (não porções de restaurante extra grandes) e calcule calorias e macronutrientes aproximados por item e no total. Responda em português do Brasil.',
          },
        ],
      }],
    });

    if (!response.parsed_output) {
      return new Response(JSON.stringify({ error: 'Não consegui identificar o prato nessa foto — tente outro ângulo ou mais luz.' }), { status: 422, headers: JSON_HEADERS });
    }

    return new Response(JSON.stringify(response.parsed_output), { headers: JSON_HEADERS });
  } catch (err) {
    console.error('analyze-meal-photo error', err);
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    return new Response(JSON.stringify({ error: 'Erro ao analisar a foto. Tente novamente em instantes.' }), { status, headers: JSON_HEADERS });
  }
});
