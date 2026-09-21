import { NextRequest, NextResponse } from 'next/server';
import { getAiSettings } from '@/app/actions/ai';

// Speech-to-text for the desktop (Electron) app's Live Voice mode.
//
// The browser build keeps using the free, built-in Web Speech API
// (hooks/useSpeechRecognition.ts) -- it works fine there because real
// Chrome ships with Google's proprietary speech-service key baked in.
// Electron's bundled Chromium does NOT include that key, so
// webkitSpeechRecognition silently fails there (see
// hooks/useVoiceCapture.ts for the MediaRecorder-based replacement used
// only when running inside the desktop app). This route is that
// replacement's server side: it accepts a recorded audio clip and
// transcribes it with OpenAI's speech-to-text API.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio');
    const language = (formData.get('language') as string) || '';
    const apiKeyOverride = (formData.get('apiKey') as string) || undefined;

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: 'Audio file is required for transcription' }, { status: 400 });
    }

    // A clip this small is silence/noise picked up before real speech
    // started -- skip the API call rather than pay for and wait on an
    // empty transcription.
    if (audio.size < 2000) {
      return NextResponse.json({ text: '' });
    }

    const settings = await getAiSettings().catch(() => null);
    const openAiKey =
      apiKeyOverride ||
      req.headers.get('x-openai-key') ||
      settings?.openaiApiKey ||
      process.env.OPENAI_API_KEY;

    if (!openAiKey) {
      return NextResponse.json(
        { error: 'no-api-key' },
        { status: 422 }
      );
    }

    // Re-wrap so OpenAI sees a filename/type we control, regardless of what
    // the browser's MediaRecorder happened to label the Blob.
    const fileName = audio.type.includes('ogg') ? 'speech.ogg' : audio.type.includes('wav') ? 'speech.wav' : 'speech.webm';
    const upstreamForm = new FormData();
    upstreamForm.append('file', audio, fileName);
    upstreamForm.append('model', 'gpt-4o-mini-transcribe');
    if (language) upstreamForm.append('language', language.split('-')[0]);

    const openAiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: upstreamForm,
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text().catch(() => '');
      throw new Error(`OpenAI transcription failed: ${openAiRes.status} ${errText}`);
    }

    const data = await openAiRes.json();
    return NextResponse.json({ text: (data && data.text) || '' });
  } catch (error: unknown) {
    console.error('STT Route Error:', error);
    const message = error instanceof Error ? error.message : 'Speech-to-text failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
