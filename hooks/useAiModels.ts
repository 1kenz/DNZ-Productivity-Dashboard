'use client';

import { useEffect, useState } from 'react';
import { AI_MODELS, AiModelOption, AiProvider } from '@/types';

// Fetches the AI Assistant's model list from /api/ai/models (live from each
// provider's own API, falling back per-provider to the hardcoded AI_MODELS
// list -- see app/api/ai/models/route.ts). Cached at module scope so every
// ModelSelector/AiChatView instance shares one fetch per page session
// instead of re-requesting on every mount.

type ModelsByProvider = Record<AiProvider, AiModelOption[]>;

const FALLBACK: ModelsByProvider = {
  anthropic: AI_MODELS.filter((m) => m.provider === 'anthropic'),
  gemini: AI_MODELS.filter((m) => m.provider === 'gemini'),
  openai: AI_MODELS.filter((m) => m.provider === 'openai'),
  ollama: AI_MODELS.filter((m) => m.provider === 'ollama'),
};

let sharedPromise: Promise<ModelsByProvider> | null = null;

function loadModels(): Promise<ModelsByProvider> {
  if (!sharedPromise) {
    sharedPromise = fetch('/api/ai/models')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => data.models as ModelsByProvider)
      .catch((err) => {
        console.error('[useAiModels] falling back to the hardcoded model list:', err);
        sharedPromise = null; // allow a retry on the next mount
        return FALLBACK;
      });
  }
  return sharedPromise;
}

/** Flat, deduped list across all three providers -- in the same
 * provider order as the hardcoded AI_MODELS fallback, so existing
 * "first model" defaults (AI_MODELS[0]) still land on the same provider. */
export function useAiModels(): { models: AiModelOption[]; isLoading: boolean } {
  const [models, setModels] = useState<AiModelOption[]>([...AI_MODELS]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadModels().then((byProvider) => {
      if (cancelled) return;
      const flat = [...(byProvider.anthropic || []), ...(byProvider.gemini || []), ...(byProvider.openai || []), ...(byProvider.ollama || [])];
      setModels(flat.length > 0 ? flat : [...AI_MODELS]);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { models, isLoading };
}
