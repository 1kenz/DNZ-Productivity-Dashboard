// Live model catalog for the AI Assistant -- replaces relying solely on a
// hardcoded model-ID list (which goes stale every 1-2 months as providers
// ship new models). Each function below calls that provider's own "list
// models" endpoint and normalizes the result into this app's AiModelOption
// shape. See app/api/ai/models/route.ts for the API route that serves this,
// with an in-memory cache and a fallback to types/index.ts's AI_MODELS
// (the last-known-good hardcoded list) whenever a live fetch fails --
// e.g. no API key configured yet, or the provider is briefly unreachable.

import { AiModelOption, AiProvider } from '@/types';

const PROVIDER_ICON: Record<AiProvider, string> = {
  anthropic: '🧠',
  gemini: '✨',
  openai: '🌐',
};

interface CacheEntry {
  fetchedAt: number;
  models: AiModelOption[];
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours -- new models don't ship hourly
const cache = new Map<AiProvider, CacheEntry>();

export function getCachedModels(provider: AiProvider): AiModelOption[] | null {
  const entry = cache.get(provider);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.models;
}

function setCachedModels(provider: AiProvider, models: AiModelOption[]) {
  cache.set(provider, { fetchedAt: Date.now(), models });
}

// --- Anthropic -----------------------------------------------------------
// GET https://api.anthropic.com/v1/models -- returns every model id the
// account can call, newest first. No capability filtering needed: every
// listed id is a Messages-API chat model.

interface AnthropicModelEntry {
  id: string;
  display_name?: string;
  created_at?: string;
}

export async function fetchAnthropicModels(apiKey: string): Promise<AiModelOption[]> {
  const res = await fetch('https://api.anthropic.com/v1/models?limit=100', {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
  });
  if (!res.ok) throw new Error(`Anthropic models list failed: ${res.status}`);
  const data = await res.json();
  const entries: AnthropicModelEntry[] = data.data || [];
  const models = entries
    .filter((m) => !m.id.includes('claude-2') && !m.id.includes('claude-instant'))
    .map((m, i) => ({
      id: m.id,
      name: m.display_name || m.id,
      provider: 'anthropic' as const,
      icon: PROVIDER_ICON.anthropic,
      badge: i === 0 ? 'En Yeni' : 'Claude',
      description: 'Web araması ile güncel bilgiye erişebilen Claude modeli.',
    }));
  setCachedModels('anthropic', models);
  return models;
}

// --- OpenAI ----------------------------------------------------------------
// GET https://api.openai.com/v1/models -- returns EVERY model on the
// account, including embeddings/whisper/tts/image/moderation/fine-tunes.
// There's no capability flag in this endpoint, so we keep only ids that
// look like general-purpose chat models and drop everything else.

const OPENAI_EXCLUDE_PATTERN =
  /whisper|tts|dall-e|embedding|moderation|audio|realtime|transcribe|image|davinci|babbage|curie|ada-|instruct|search|similarity|edit|codex/i;
const OPENAI_INCLUDE_PATTERN = /^(gpt-|chatgpt-|o[0-9])/i;

interface OpenAiModelEntry {
  id: string;
  created?: number;
}

export async function fetchOpenAiModels(apiKey: string): Promise<AiModelOption[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI models list failed: ${res.status}`);
  const data = await res.json();
  const entries: OpenAiModelEntry[] = data.data || [];
  const chatModels = entries
    .filter((m) => OPENAI_INCLUDE_PATTERN.test(m.id) && !OPENAI_EXCLUDE_PATTERN.test(m.id))
    .sort((a, b) => (b.created || 0) - (a.created || 0));
  const models = chatModels.map((m, i) => ({
    id: m.id,
    name: m.id,
    provider: 'openai' as const,
    icon: PROVIDER_ICON.openai,
    badge: i === 0 ? 'En Yeni' : m.id.includes('mini') || m.id.includes('nano') ? 'Hızlı' : 'GPT',
    description: 'Web araması ile güncel bilgiye erişebilen OpenAI modeli.',
  }));
  setCachedModels('openai', models);
  return models;
}

// --- Gemini ------------------------------------------------------------
// GET https://generativelanguage.googleapis.com/v1beta/models -- returns
// every Gemini model/variant; keep only ones that support generateContent
// (excludes embedding/imagen/veo/tts-only models).

interface GeminiModelEntry {
  name: string; // "models/gemini-3.8-flash"
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

export async function fetchGeminiModels(apiKey: string): Promise<AiModelOption[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(apiKey)}`
  );
  if (!res.ok) throw new Error(`Gemini models list failed: ${res.status}`);
  const data = await res.json();
  const entries: GeminiModelEntry[] = data.models || [];
  const models = entries
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .filter((m) => !/embedding|aqa|imagen|veo|tts/i.test(m.name))
    .map((m) => {
      const id = m.name.replace(/^models\//, '');
      return {
        id,
        name: m.displayName || id,
        provider: 'gemini' as const,
        icon: PROVIDER_ICON.gemini,
        badge: id.includes('pro') ? 'Frontier Reasoning' : id.includes('lite') ? 'Ultra Fast' : 'Gemini',
        description: 'Google Arama ile desteklenen güncel bilgiye erişebilen Gemini modeli.',
      };
    });
  setCachedModels('gemini', models);
  return models;
}

export async function fetchLiveModels(provider: AiProvider, apiKey: string): Promise<AiModelOption[]> {
  const cached = getCachedModels(provider);
  if (cached) return cached;
  if (provider === 'anthropic') return fetchAnthropicModels(apiKey);
  if (provider === 'openai') return fetchOpenAiModels(apiKey);
  return fetchGeminiModels(apiKey);
}
