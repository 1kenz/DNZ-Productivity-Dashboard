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
  ollama: '🦙',
};

// Cost/practicality tiers -- after building each provider's model list we
// stable-sort by tier (JS Array.sort is a stable sort, so within a tier the
// existing order -- generally newest-first -- is preserved). This surfaces
// the models that realistically cover day-to-day team usage first, and
// pushes pricier/heavier frontier models to the bottom of the picker instead
// of mixing them in wherever the provider's API happens to list them.
const COST_TIER_CHEAP = 0;
const COST_TIER_MID = 1;
const COST_TIER_EXPENSIVE = 2;

function anthropicCostTier(id: string): number {
  if (/haiku/i.test(id)) return COST_TIER_CHEAP;
  if (/opus/i.test(id)) return COST_TIER_EXPENSIVE;
  return COST_TIER_MID; // sonnet and anything unrecognized
}

function openAiCostTier(id: string): number {
  if (/mini|nano/i.test(id)) return COST_TIER_CHEAP;
  // o-series reasoning models (o1, o3, o4, ...) and any "-pro" variant are
  // the priciest/heaviest tier; everything else (plain gpt-*, chatgpt-*) is
  // the practical mid tier most teams actually use day to day.
  if (/^o[0-9]/i.test(id) || /pro/i.test(id)) return COST_TIER_EXPENSIVE;
  return COST_TIER_MID;
}

function geminiCostTier(id: string): number {
  if (/lite/i.test(id)) return COST_TIER_CHEAP;
  if (/pro/i.test(id)) return COST_TIER_EXPENSIVE;
  return COST_TIER_MID; // flash and anything unrecognized
}

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
  models.sort((a, b) => anthropicCostTier(a.id) - anthropicCostTier(b.id));
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
  models.sort((a, b) => openAiCostTier(a.id) - openAiCostTier(b.id));
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

/** Extracts the "2.5" out of "gemini-2.5-flash-lite", or null for ids that
 * don't carry a version number (bare "gemini-pro" from the old v1 naming,
 * odd one-off ids, etc.) */
function geminiVersion(id: string): number | null {
  const m = id.match(/^gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

export async function fetchGeminiModels(apiKey: string): Promise<AiModelOption[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(apiKey)}`
  );
  if (!res.ok) throw new Error(`Gemini models list failed: ${res.status}`);
  const data = await res.json();
  const entries: GeminiModelEntry[] = data.models || [];

  const candidates = entries
    .map((m) => ({ ...m, id: m.name.replace(/^models\//, '') }))
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    // Drop non-chat capabilities, the separate open-weight Gemma family
    // (a different product line, not what picking "Gemini" should surface),
    // and "-latest"/"-preview" aliases -- Google always also lists the
    // concrete dated/numbered model those point to, so keeping both just
    // shows the same model twice under two different names.
    .filter((m) => !/embedding|aqa|imagen|veo|tts|gemma/i.test(m.id))
    .filter((m) => !/-latest$|-preview$/i.test(m.id));

  // Keep only the current generation (plus one generation back) instead of
  // hardcoding a version cutoff that would go stale the moment Google
  // ships the next one -- computed from whatever the API actually
  // returned, so this stays accurate on its own.
  const versions = candidates.map((m) => geminiVersion(m.id)).filter((v): v is number => v !== null);
  const newestVersion = versions.length > 0 ? Math.max(...versions) : null;

  const models = candidates
    .filter((m) => {
      const v = geminiVersion(m.id);
      // Unversioned ids (legacy "gemini-pro"-style names) are old enough
      // to drop once we can tell there's a versioned generation available.
      if (v === null) return newestVersion === null;
      return newestVersion === null || v >= newestVersion - 1;
    })
    .map((m) => ({
      id: m.id,
      name: m.displayName || m.id,
      provider: 'gemini' as const,
      icon: PROVIDER_ICON.gemini,
      badge: m.id.includes('pro') ? 'Frontier Reasoning' : m.id.includes('lite') ? 'Ultra Fast' : 'Gemini',
      description: 'Google Arama ile desteklenen güncel bilgiye erişebilen Gemini modeli.',
    }));
  models.sort((a, b) => geminiCostTier(a.id) - geminiCostTier(b.id));
  setCachedModels('gemini', models);
  return models;
}

// --- Ollama (Local LLM) ----------------------------------------------------
// GET http://127.0.0.1:11434/api/tags -- returns local models installed on
// the user machine. 100% offline, private, zero API key required.

interface OllamaTagModel {
  name: string;
  model?: string;
  size?: number;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export async function fetchOllamaModels(baseUrl?: string): Promise<AiModelOption[]> {
  const host = baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${host}/api/tags`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) throw new Error(`Ollama tags failed: ${res.status}`);
    const data = await res.json();
    const entries: OllamaTagModel[] = data.models || [];
    if (entries.length === 0) return [];

    const models: AiModelOption[] = entries.map((m) => {
      const cleanName = m.name.replace(/:latest$/, '');
      const paramSize = m.details?.parameter_size ? ` (${m.details.parameter_size})` : '';
      return {
        id: m.name,
        name: `${cleanName}${paramSize}`,
        provider: 'ollama' as const,
        icon: PROVIDER_ICON.ollama,
        badge: m.details?.parameter_size ? `${m.details.parameter_size} Local` : 'Local Offline',
        description: `Ollama ile yerel çalışan model (${m.details?.family || 'open-weights'}). 100% Çevrimdışı ve Gizli.`,
      };
    });

    setCachedModels('ollama', models);
    return models;
  } catch (err) {
    return [];
  }
}

export async function fetchLiveModels(provider: AiProvider, apiKey: string = ''): Promise<AiModelOption[]> {
  const cached = getCachedModels(provider);
  if (cached) return cached;
  if (provider === 'anthropic') return fetchAnthropicModels(apiKey);
  if (provider === 'openai') return fetchOpenAiModels(apiKey);
  if (provider === 'ollama') return fetchOllamaModels();
  return fetchGeminiModels(apiKey);
}
