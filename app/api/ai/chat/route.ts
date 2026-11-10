import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiSettings, addAiMessage } from '@/app/actions/ai';

interface AiSource {
  title?: string;
  url: string;
}

// Shape of the items OpenAI's Responses API (POST /v1/responses) returns in
// `output` -- only the fields this route actually reads. A response can also
// contain e.g. `web_search_call` items alongside the `message` item; those
// are ignored here since only the message's text and citations are needed.
interface OpenAiResponseAnnotation {
  type?: string;
  url?: string;
  title?: string;
}

interface OpenAiResponseContentPart {
  type?: string;
  text?: string;
  annotations?: OpenAiResponseAnnotation[];
}

interface OpenAiResponseOutputItem {
  type?: string;
  content?: OpenAiResponseContentPart[];
}

/**
 * Appends a short "Kaynaklar" (Sources) list to a reply when the model
 * actually used its web search tool -- shared by all three providers so a
 * researched answer always looks the same regardless of which one answered.
 * Returns `text` unchanged when there are no sources to show.
 */
function appendSourcesFooter(text: string, sources: AiSource[]): string {
  if (!sources || sources.length === 0) return text;

  const seen = new Set<string>();
  const lines = sources
    .filter((s) => {
      if (!s.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    })
    .slice(0, 8)
    .map((s) => `- [${s.title || s.url}](${s.url})`);

  if (lines.length === 0) return text;
  return `${text}\n\n---\n**Kaynaklar:**\n${lines.join('\n')}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, provider, model, systemPrompt, conversationId, apiKeyOverride, apiKeys } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const settings = await getAiSettings().catch(() => ({}));

    // Resolve API key with multiple fallback sources (client body, headers, DB settings, env)
    let apiKey = apiKeyOverride;
    if (!apiKey && apiKeys && typeof apiKeys === 'object') {
      apiKey = apiKeys[provider];
    }
    if (!apiKey) {
      const headerKey = req.headers.get(`x-${provider}-key`) || req.headers.get('x-api-key');
      if (headerKey) apiKey = headerKey;
    }
    if (!apiKey) {
      if (provider === 'anthropic') {
        apiKey = (settings as any).anthropicApiKey || process.env.ANTHROPIC_API_KEY;
      } else if (provider === 'gemini') {
        apiKey = (settings as any).geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      } else if (provider === 'openai') {
        apiKey = (settings as any).openaiApiKey || process.env.OPENAI_API_KEY;
      }
    }

    let replyText = '';

    // Handle when API key is missing (Ollama does not require an API key)
    if (!apiKey && provider !== 'ollama') {
      replyText = `⚠️ **${provider.toUpperCase()} API Anahtarı Bulunamadı.**\n\nBu modeli (${model}) kullanabilmek için lütfen **AI Ayarları (⚙️)** butonuna tıklayarak API anahtarınızı girin veya sunucu \`.env\` dosyanıza ekleyin.\n\n*Örnek: \`${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'}=...\`*`;
      
      return NextResponse.json({
        content: replyText,
        model,
        provider,
        warning: 'API_KEY_MISSING',
      });
    }

    // Whether this call is a live-voice turn -- see LiveVoiceModal.tsx /
    // AiChatView.tsx's voice system prompts, both of which include this
    // marker. Voice replies are meant to be read aloud, so we skip
    // appending a markdown "Kaynaklar" (Sources) list to them.
    const isVoiceTurn = Boolean(systemPrompt?.includes('sesli'));

    // Call Provider -- all three now search the web via each provider's own
    // native tool-use mechanism, so answers can reflect current information
    // instead of only the model's training data. Sources (when the model
    // actually used the tool) are appended as a short Markdown list.
    if (provider === 'gemini') {
      const requested = model || 'gemini-3.8-flash';
      const isPro = requested.includes('pro');
      const baseCandidates = isPro
        ? [requested, 'gemini-3.1-pro-preview', 'gemini-pro-latest', 'gemini-3.8-flash', 'gemini-3.5-flash-lite']
        : [requested, 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
      const candidates = Array.from(new Set(baseCandidates));

      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const payload: any = {
        contents,
        // Grounding with Google Search -- lets Gemini issue real web
        // searches and cite them instead of answering from memory alone.
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: systemPrompt?.includes('sesli') ? 350 : 2048,
        },
      };

      if (systemPrompt) {
        payload.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      const callGenerateContent = async (mName: string): Promise<{ text: string; sources: AiSource[] }> => {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || `GenerateContent ${mName} error: ${res.status}`);
        }

        const data = await res.json();
        const candidate = data?.candidates?.[0];
        const text = (candidate?.content?.parts || [])
          .map((p: any) => p?.text)
          .filter(Boolean)
          .join('');
        if (!text) throw new Error(`Empty response from ${mName}`);

        const chunks = candidate?.groundingMetadata?.groundingChunks || [];
        const sources: AiSource[] = chunks
          .map((c: any) => ({ title: c?.web?.title, url: c?.web?.uri }))
          .filter((s: AiSource) => Boolean(s.url));

        return { text, sources };
      };

      // Try each candidate model in order (falls back if one name is
      // invalid/unavailable) rather than racing them -- with search
      // grounding on, we want the response we actually asked for, not
      // just whichever model happened to answer first.
      let lastErr: any = null;
      for (const candidate of candidates) {
        try {
          const { text, sources } = await callGenerateContent(candidate);
          replyText = isVoiceTurn ? text : appendSourcesFooter(text, sources);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          const msg: string = err instanceof Error ? err.message : String(err);
          // A quota/billing error is tied to the API key's Cloud Billing
          // tier, not to which model name we ask for -- every remaining
          // candidate would just fail the exact same way, so stop here
          // instead of burning through 3-4 more failing requests (which
          // only delays the error and eats further into the same quota).
          if (/quota|429|rate.?limit|RESOURCE_EXHAUSTED/i.test(msg)) break;
        }
      }
      if (lastErr) {
        console.error('All Gemini API attempts failed:', lastErr?.message || lastErr);
        const rawMessage: string = lastErr?.message || 'Bilinmeyen hata';
        const isQuotaError = /quota|429|rate.?limit|RESOURCE_EXHAUSTED/i.test(rawMessage);
        // The single most common cause of confusion here: a paid Gemini
        // Advanced / Google AI Pro subscription (the consumer chat app) is
        // a completely separate product from the Gemini API used by this
        // app -- it does not raise this API key's rate limit at all. The
        // API's quota is governed only by the Cloud Billing account (if
        // any) attached to the API key's own Google Cloud project; see
        // https://ai.google.dev/gemini-api/docs/billing.
        replyText = isQuotaError
          ? `⚠️ **Gemini kotası doldu.** Bu API anahtarının kullanım kotası/faturalandırma limiti dolmuş görünüyor (denenen Gemini modelleri aynı hatayı verdi, bu bir model sorunu değil).\n\nÖnemli: Gemini Advanced / Google AI Pro gibi bir kişisel/tüketici aboneliğiniz olsa bile bu, bu API anahtarının kotasını **yükseltmez** -- ikisi tamamen ayrı şeylerdir. API kotası yalnızca bu anahtarın bağlı olduğu Google Cloud projesine eklenmiş bir faturalandırma hesabına (Cloud Billing) göre belirlenir. [Google AI Studio](https://aistudio.google.com/) üzerinden bu projeye faturalandırma ekleyin (ai.google.dev/gemini-api/docs/billing), ya da bu arada model seçiciden Claude veya GPT gibi başka bir sağlayıcıya geçebilirsiniz.\n\n*Teknik detay: ${rawMessage}*`
          : `⚠️ **Gemini Yanıt Veremedi:** ${rawMessage}`;
      }
    } else if (provider === 'openai') {
      const openAiModel = model || 'gpt-6-astra';
      const openAiInput: Array<{ role: string; content: string }> = [];

      if (systemPrompt) {
        openAiInput.push({ role: 'system', content: systemPrompt });
      }

      for (const m of messages) {
        openAiInput.push({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        });
      }

      // OpenAI's web-search tool is only exposed through the Responses API
      // (POST /v1/responses). The older Chat Completions `web_search_options`
      // parameter only works on the narrow "-search-preview" model family and
      // is rejected ("Unknown parameter: 'web_search_options'") by every
      // regular chat model this app actually lists in its picker -- so this
      // call goes through Responses instead, which supports real web search
      // across the full range of GA chat models.
      const openAiBody: { model: string; input: typeof openAiInput; temperature?: number; tools: Array<{ type: string }> } = {
        model: openAiModel,
        input: openAiInput,
        temperature: 0.7,
        tools: [{ type: 'web_search' }],
      };

      let res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(openAiBody),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg: string = errJson?.error?.message || '';
        // Newer "reasoning" style OpenAI models (the o-series, and some
        // GPT-5 family tiers such as the economical "Luna" model) reject a
        // custom `temperature` value outright -- only the API default is
        // allowed. Retry once without it instead of failing the whole turn.
        if (/temperature/i.test(errMsg) && /not supported/i.test(errMsg)) {
          delete openAiBody.temperature;
          res = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(openAiBody),
          });
        }
        if (!res.ok) {
          const retryErrJson = await res.json().catch(() => ({}));
          throw new Error(retryErrJson?.error?.message || errMsg || `OpenAI API Error: ${res.status} ${res.statusText}`);
        }
      }

      const data = await res.json();
      const outputItems: OpenAiResponseOutputItem[] = data?.output || [];
      const messageItem = outputItems.find((item) => item.type === 'message');
      const textParts: OpenAiResponseContentPart[] = (messageItem?.content || []).filter(
        (c) => c.type === 'output_text'
      );
      const rawText = textParts.map((c) => c.text || '').join('\n').trim() || 'OpenAI yanıt veremedi.';
      const sources: AiSource[] = textParts
        .flatMap((c) => c.annotations || [])
        .filter((a) => a.type === 'url_citation' && Boolean(a.url))
        .map((a) => ({ title: a.title, url: a.url as string }));

      replyText = isVoiceTurn ? rawText : appendSourcesFooter(rawText, sources);
    } else if (provider === 'anthropic') {
      const claudeModel = model || 'claude-opus-5';
      const claudeMessages = messages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));

      const payload: any = {
        model: claudeModel,
        max_tokens: 2048,
        messages: claudeMessages,
        // Server-side web search tool -- Claude decides on its own whether
        // a given question actually needs a search.
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      };

      if (systemPrompt) {
        payload.system = systemPrompt;
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Anthropic Claude API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      // With web_search enabled, `content` interleaves text blocks with
      // server_tool_use / web_search_tool_result blocks -- concatenate
      // just the text blocks, and collect each one's citations.
      const blocks: any[] = data?.content || [];
      const textBlocks = blocks.filter((b) => b?.type === 'text');
      const rawText = textBlocks.map((b) => b.text).join('\n\n') || 'Claude yanıt veremedi.';

      const seenUrls = new Set<string>();
      const sources: AiSource[] = [];
      for (const block of textBlocks) {
        for (const citation of block.citations || []) {
          if (citation?.url && !seenUrls.has(citation.url)) {
            seenUrls.add(citation.url);
            sources.push({ title: citation.title, url: citation.url });
          }
        }
      }

      replyText = isVoiceTurn ? rawText : appendSourcesFooter(rawText, sources);

    } else if (provider === 'ollama') {
      const ollamaModel = model || 'llama3.2';
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
      const ollamaMessages: Array<{ role: string; content: string }> = [];

      if (systemPrompt) {
        ollamaMessages.push({ role: 'system', content: systemPrompt });
      }

      for (const m of messages) {
        ollamaMessages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        });
      }

      try {
        const res = await fetch(`${ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            messages: ollamaMessages,
            stream: false,
            // Reasoning models served by Ollama (Qwen3, DeepSeek-R1, etc.)
            // run an internal "thinking" pass before the real answer. That
            // scratch-pad is very often in Chinese -- regardless of the
            // conversation's language, it's how these models were trained --
            // and without `think: false` Ollama can merge it straight into
            // `message.content`, which is what shows up as a seemingly
            // random Chinese reply. This is a no-op for models that don't
            // support thinking.
            think: false,
            options: {
              temperature: 0.7,
            },
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || `Ollama API Error (${res.status}): ${res.statusText}`);
        }

        const data = await res.json();
        // Defensive: strip a <think>...</think> block if one still slipped
        // into content anyway (older Ollama builds / models that ignore
        // the `think` flag above).
        const rawOllamaContent: string = data?.message?.content || '';
        replyText =
          rawOllamaContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() ||
          'Ollama boş yanıt döndürdü.';
      } catch (err: any) {
        console.error('Ollama connection failed:', err);
        const isConnRefused = /fetch failed|ECONNREFUSED|network|ENOTFOUND/i.test(err?.message || '');
        replyText = isConnRefused
          ? `⚠️ **Ollama Servisine Bağlanılamadı (Local LLM)**\n\nOllama yerel makinenizde çalışmıyor veya port meşgul olabilir.\n\n- **Kontrol:** Terminalinizde \`ollama list\` veya \`ollama serve\` komutunu çalıştırın.\n- **Model İndirme:** \`${ollamaModel}\` modelini indirmek için terminalde: \`ollama run ${ollamaModel}\`\n- **Varsayılan Adres:** \`${ollamaBaseUrl}\`\n\n*Hata Detayı: ${err?.message || 'Bağlantı reddedildi'}`
          : `⚠️ **Ollama Hatası:** ${err?.message || 'Bilinmeyen hata'}`;
      }
    }

    // If conversationId is supplied, save to database
    if (conversationId) {
      try {
        await addAiMessage({
          conversationId,
          role: 'assistant',
          content: replyText,
          model,
        });
      } catch (dbErr) {
        console.error('Failed to auto-save assistant message to DB:', dbErr);
      }
    }

    return NextResponse.json({
      content: replyText,
      model,
      provider,
    });
  } catch (error: any) {
    console.error('AI Chat Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Yapay zeka ile iletişim kurulurken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
