import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiSettings, addAiMessage } from '@/app/actions/ai';

interface AiSource {
  title?: string;
  url: string;
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

    // Handle when API key is missing
    if (!apiKey) {
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
        }
      }
      if (lastErr) {
        console.error('All Gemini API attempts failed:', lastErr?.message || lastErr);
        replyText = `⚠️ **Gemini Yanıt Veremedi:** ${lastErr?.message || 'Bilinmeyen hata'}`;
      }
    } else if (provider === 'openai') {
      const openAiModel = model || 'gpt-6-astra';
      const openAiMessages = [];

      if (systemPrompt) {
        openAiMessages.push({ role: 'system', content: systemPrompt });
      }

      for (const m of messages) {
        openAiMessages.push({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        });
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: openAiModel,
          messages: openAiMessages,
          temperature: 0.7,
          // Lets the model issue real web searches via OpenAI's own
          // search-augmented Chat Completions tool.
          web_search_options: {},
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `OpenAI API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const message = data?.choices?.[0]?.message;
      const rawText = message?.content || 'OpenAI yanıt veremedi.';
      const annotations: any[] = message?.annotations || [];
      const sources: AiSource[] = annotations
        .filter((a) => a?.type === 'url_citation' && a?.url_citation?.url)
        .map((a) => ({ title: a.url_citation.title, url: a.url_citation.url }));

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
