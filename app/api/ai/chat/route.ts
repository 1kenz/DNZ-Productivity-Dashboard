import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiSettings, addAiMessage } from '@/app/actions/ai';

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

    // Call Provider
    if (provider === 'gemini') {
      const requested = model || 'gemini-3.6-flash';
      const isPro = requested.includes('pro');
      const baseCandidates = isPro
        ? [requested, 'gemini-3.1-pro-preview', 'gemini-pro-latest', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']
        : [requested, 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
      const candidates = Array.from(new Set(baseCandidates));

      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const payload: any = {
        contents,
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

      const lastUserMessage = messages[messages.length - 1]?.content || '';

      // 1. Google Interactions API caller (Google's latest recommended API)
      const callInteractionsApi = async (mName: string): Promise<string> => {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            model: mName,
            input: lastUserMessage,
            system_instruction: systemPrompt || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || `Interactions ${mName} error: ${res.status}`);
        }

        const data = await res.json();
        const text =
          data?.output_text ||
          data?.steps?.[data.steps?.length - 1]?.model_output?.text ||
          data?.steps?.[data.steps?.length - 1]?.text ||
          data?.output?.[0]?.text;
        if (!text) throw new Error(`Empty response from interactions ${mName}`);
        return text;
      };

      // 2. Google generateContent caller
      const callGenerateContent = async (mName: string): Promise<string> => {
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
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`Empty response from ${mName}`);
        return text;
      };

      try {
        const tasks = [
          ...candidates.map((m) => callInteractionsApi(m)),
          ...candidates.map((m) => callGenerateContent(m)),
        ];
        // Parallel race: Fastest response from Interactions or GenerateContent wins instantly
        replyText = await Promise.any(tasks);
      } catch (aggregateErr: any) {
        const errList = aggregateErr?.errors?.map((e: any) => e?.message).join(' | ') || aggregateErr?.message || 'Bilinmeyen hata';
        console.error('All Gemini API attempts failed:', errList);
        replyText = `⚠️ **Gemini Yanıt Veremedi:** ${errList}`;
      }
    } else if (provider === 'openai') {
      const openAiModel = model || 'gpt-4o';
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
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `OpenAI API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      replyText = data?.choices?.[0]?.message?.content || 'OpenAI yanıt veremedi.';
    } else if (provider === 'anthropic') {
      const claudeModel = model || 'claude-3-7-sonnet';
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
      replyText = data?.content?.[0]?.text || 'Claude yanıt veremedi.';
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
