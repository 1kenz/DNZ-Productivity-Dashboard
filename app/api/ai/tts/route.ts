import { NextRequest, NextResponse } from 'next/server';
import { getAiSettings } from '@/app/actions/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      provider = 'openai',
      voice,
      speed = 1.0,
      language = 'tr-TR',
      presetId = 'juniper',
      apiKeyOverride,
      apiKeys,
    } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text is required for TTS' }, { status: 400 });
    }

    // Clean markdown, code blocks and formatting characters before speaking
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Kod bloğu.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: 'Clean text is empty' }, { status: 400 });
    }

    // Truncate to reasonable TTS max length (4000 chars)
    const ttsText = cleanText.slice(0, 4000);

    const settings = await getAiSettings().catch(() => ({}));

    // Resolve API keys
    const openAiKey =
      apiKeyOverride ||
      apiKeys?.openai ||
      req.headers.get('x-openai-key') ||
      (settings as any).openaiApiKey ||
      process.env.OPENAI_API_KEY;

    const geminiKey =
      apiKeyOverride ||
      apiKeys?.gemini ||
      req.headers.get('x-gemini-key') ||
      (settings as any).geminiApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY;

    // Voice preset mapping for OpenAI HD voices
    const openAiVoiceMap: Record<string, 'nova' | 'shimmer' | 'alloy' | 'echo' | 'onyx' | 'fable'> = {
      juniper: 'nova',
      breeze: 'shimmer',
      cove: 'onyx',
      ember: 'fable',
      defne_tr: 'nova',
      nova: 'nova',
      shimmer: 'shimmer',
      alloy: 'alloy',
      echo: 'echo',
      onyx: 'onyx',
      fable: 'fable',
    };

    const targetOpenAiVoice =
      openAiVoiceMap[voice?.toLowerCase()] ||
      openAiVoiceMap[presetId?.toLowerCase()] ||
      'nova';

    // 1. Try OpenAI TTS first if OpenAI key is available
    if (openAiKey) {
      try {
        const openAiRes = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: ttsText,
            voice: targetOpenAiVoice,
            speed: Math.max(0.5, Math.min(2.0, speed)),
            response_format: 'mp3',
          }),
        });

        if (openAiRes.ok) {
          const audioBuffer = await openAiRes.arrayBuffer();
          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.byteLength.toString(),
              'Cache-Control': 'no-cache',
            },
          });
        }
      } catch (openAiErr) {
        console.warn('OpenAI TTS call failed, continuing to next provider:', openAiErr);
      }
    }

    // 2. Try Google Cloud Text-to-Speech if Gemini / Google key is available
    if (geminiKey) {
      try {
        const langPrefix = language.split('-')[0].toLowerCase();
        let googleVoiceName = 'tr-TR-Wavenet-A';
        let langCode = 'tr-TR';

        if (langPrefix === 'en') {
          langCode = 'en-US';
          googleVoiceName = targetOpenAiVoice === 'onyx' ? 'en-US-Neural2-D' : 'en-US-Neural2-F';
        } else if (langPrefix === 'de') {
          langCode = 'de-DE';
          googleVoiceName = targetOpenAiVoice === 'onyx' ? 'de-DE-Neural2-D' : 'de-DE-Neural2-F';
        } else {
          langCode = 'tr-TR';
          googleVoiceName = targetOpenAiVoice === 'onyx' ? 'tr-TR-Wavenet-B' : 'tr-TR-Wavenet-A';
        }

        const googleUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${geminiKey}`;
        const googleRes = await fetch(googleUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey,
          },
          body: JSON.stringify({
            input: { text: ttsText },
            voice: {
              languageCode: langCode,
              name: googleVoiceName,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: Math.max(0.5, Math.min(2.0, speed)),
            },
          }),
        });

        if (googleRes.ok) {
          const googleData = await googleRes.json();
          if (googleData.audioContent) {
            const buffer = Buffer.from(googleData.audioContent, 'base64');
            return new NextResponse(buffer, {
              status: 200,
              headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.byteLength.toString(),
                'Cache-Control': 'no-cache',
              },
            });
          }
        }
      } catch (googleErr) {
        console.warn('Google Cloud TTS call failed, continuing to Google Neural stream:', googleErr);
      }
    }

    // 3. Fallback to Google Neural Audio Stream (crystal clear, native pronunciation, no robotic legacy sound)
    try {
      const langCode = language.split('-')[0].toLowerCase() || 'tr';
      // Chunk text into <= 180 chars for Google stream
      const sentences = ttsText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [ttsText];
      const audioBuffers: Buffer[] = [];

      for (const sentence of sentences.slice(0, 10)) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        const streamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(trimmed.slice(0, 180))}`;
        const streamRes = await fetch(streamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          },
        });
        if (streamRes.ok) {
          const arrayBuffer = await streamRes.arrayBuffer();
          audioBuffers.push(Buffer.from(arrayBuffer));
        }
      }

      if (audioBuffers.length > 0) {
        const fullAudio = Buffer.concat(audioBuffers);
        return new NextResponse(fullAudio, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': fullAudio.byteLength.toString(),
            'Cache-Control': 'no-cache',
          },
        });
      }
    } catch (streamErr) {
      console.warn('Google Neural stream failed:', streamErr);
    }

    return NextResponse.json(
      { error: 'No TTS provider available or synthesis failed' },
      { status: 422 }
    );
  } catch (error: any) {
    console.error('TTS Route Error:', error);
    return NextResponse.json({ error: error?.message || 'TTS generation failed' }, { status: 500 });
  }
}
