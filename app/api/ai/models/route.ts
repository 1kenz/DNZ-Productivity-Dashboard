import { NextRequest, NextResponse } from 'next/server';
import { getAiSettings } from '@/app/actions/ai';
import { fetchLiveModels } from '@/lib/aiModelCatalog';
import { AI_MODELS, AiModelOption, AiProvider } from '@/types';

// Serves the AI Assistant's model list live from each provider's own "list
// models" API instead of a hardcoded ID array, so a new model a provider
// ships shows up here automatically -- see lib/aiModelCatalog.ts for the
// per-provider fetch/normalize logic and its 6h in-memory cache. Falls back
// to the last-known-good hardcoded AI_MODELS list (types/index.ts) per
// provider whenever no API key is configured yet or the live fetch fails,
// so the model selector is never empty.
export async function GET(req: NextRequest) {
  const settings = await getAiSettings().catch(() => ({} as Record<string, unknown>));
  const s = settings as Record<string, string | undefined>;

  const providers: AiProvider[] = ['anthropic', 'gemini', 'openai'];
  const keyFor = (provider: AiProvider): string | undefined => {
    const override = req.nextUrl.searchParams.get(`${provider}Key`) || undefined;
    if (override) return override;
    if (provider === 'anthropic') return s.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (provider === 'gemini') return s.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    return s.openaiApiKey || process.env.OPENAI_API_KEY;
  };

  const result: Record<AiProvider, AiModelOption[]> = { anthropic: [], gemini: [], openai: [] };
  const source: Record<AiProvider, 'live' | 'fallback'> = { anthropic: 'fallback', gemini: 'fallback', openai: 'fallback' };

  await Promise.all(
    providers.map(async (provider) => {
      const key = keyFor(provider);
      const seed = AI_MODELS.filter((m) => m.provider === provider);
      if (!key) {
        result[provider] = seed;
        return;
      }
      try {
        const live = await fetchLiveModels(provider, key);
        result[provider] = live.length > 0 ? live : seed;
        source[provider] = live.length > 0 ? 'live' : 'fallback';
      } catch (err) {
        console.error(`[ai/models] ${provider} live fetch failed, using fallback list:`, err);
        result[provider] = seed;
      }
    })
  );

  return NextResponse.json({ models: result, source });
}
