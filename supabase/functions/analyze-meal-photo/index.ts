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
//
// Importa só o pacote principal do SDK (nada de subcaminhos tipo "/helpers/zod") — um import mais
// profundo depende do mapa de "exports" do pacote resolver certo no runtime de Edge Function do
// Supabase, que já teve problema com isso; preferimos pedir o JSON por prompt e validar na mão,
// que funciona em qualquer versão do SDK.
import Anthropic from 'npm:@anthropic-ai/sdk';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// ~6MB em base64 (um pouco acima do normal pra foto de celular já comprimida) — barra antes de
// gastar a chamada da API com um arquivo claramente grande demais.
const MAX_BASE64_LENGTH = 8_000_000;

const PROMPT = `Essa é uma foto de uma refeição. Identifique cada alimento visível, estime o peso em gramas de cada um com base em porções realistas do dia a dia (não porções de restaurante extra grandes) e calcule calorias e macronutrientes aproximados por item e no total.

Responda ESTRITAMENTE com um objeto JSON válido — nada de texto antes ou depois, nada de blocos de código markdown — exatamente neste formato:
{
  "items": [
    { "name": "Arroz branco", "estimated_grams": 150, "kcal": 190, "protein_g": 4, "carbs_g": 42, "fat_g": 0.3 }
  ],
  "total_kcal": 464,
  "total_protein_g": 45.8,
  "total_carbs_g": 55.6,
  "total_fat_g": 5.1,
  "confidence": "baixa",
  "note": "uma frase curta em português lembrando que é uma estimativa aproximada"
}
"confidence" deve ser "baixa", "media" ou "alta". Responda em português do Brasil.`;

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(cleaned);
}

function isValidMealAnalysis(obj: any): boolean {
  return !!obj && Array.isArray(obj.items) && obj.items.length > 0 &&
    obj.items.every((it: any) => typeof it.name === 'string' && typeof it.estimated_grams === 'number' && typeof it.kcal === 'number') &&
    typeof obj.total_kcal === 'number' && typeof obj.total_protein_g === 'number' &&
    typeof obj.total_carbs_g === 'number' && typeof obj.total_fat_g === 'number' &&
    typeof obj.note === 'string';
}

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não suportado.' }), { status: 405, headers: JSON_HEADERS });
  }

  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    console.error('ANTHROPIC_API_KEY não configurada');
    return new Response(JSON.stringify({ error: 'Função não configurada no servidor: falta a variável ANTHROPIC_API_KEY (supabase secrets set ANTHROPIC_API_KEY=...).' }), { status: 500, headers: JSON_HEADERS });
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
    const response = await anthropic.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2048,
      output_config: { effort: 'low' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType as any, data: imageBase64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    });

    const textBlock: any = response.content.find((b: any) => b.type === 'text');
    if (!textBlock) {
      console.error('analyze-meal-photo: resposta sem bloco de texto', JSON.stringify(response.content));
      return new Response(JSON.stringify({ error: 'A IA não retornou texto (stop_reason: ' + response.stop_reason + ').' }), { status: 502, headers: JSON_HEADERS });
    }

    let parsed: unknown;
    try {
      parsed = extractJson(textBlock.text);
    } catch {
      console.error('analyze-meal-photo: JSON inválido na resposta:', textBlock.text);
      return new Response(JSON.stringify({ error: 'Não consegui interpretar a resposta da IA — tente outra foto.' }), { status: 502, headers: JSON_HEADERS });
    }

    if (!isValidMealAnalysis(parsed)) {
      console.error('analyze-meal-photo: formato inesperado:', JSON.stringify(parsed));
      return new Response(JSON.stringify({ error: 'A IA retornou um formato inesperado — tente novamente.' }), { status: 502, headers: JSON_HEADERS });
    }

    return new Response(JSON.stringify(parsed), { headers: JSON_HEADERS });
  } catch (err) {
    console.error('analyze-meal-photo error:', err instanceof Error ? (err.stack ?? err.message) : err);
    let status = 500;
    let detail = 'erro desconhecido';
    if (err instanceof Anthropic.APIError) {
      status = err.status ?? 500;
      detail = err.message;
    } else if (err instanceof Error) {
      detail = err.message;
    }
    return new Response(JSON.stringify({ error: `Erro ao chamar a IA: ${detail}` }), { status, headers: JSON_HEADERS });
  }
});
