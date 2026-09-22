'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AiConversation,
  AiMessage,
  AI_MODELS,
  AiModelOption,
  AiSettings,
  PendingAiRequest,
} from '@/types';
import {
  getAiConversations,
  createAiConversation,
  deleteAiConversation,
  updateAiConversation,
  addAiMessage,
  deleteAiMessage,
  deleteAiMessages,
  getAiSettings,
} from '@/app/actions/ai';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ModelSelector } from './ModelSelector';
import { VoiceInputButton } from './VoiceInputButton';
import { MessageBubble } from './MessageBubble';
import { PromptTemplates } from './PromptTemplates';
import { ConversationSidebar } from './ConversationSidebar';
import { ApiKeyConfigModal } from './ApiKeyConfigModal';
import { LiveVoiceModal } from './LiveVoiceModal';
import { ReportVaultModal } from './ReportVaultModal';
import styles from './AiChatView.module.css';

interface AiChatViewProps {
  /** Set by a task's "Ask AI" button (via AppContext.pendingAiRequest,
   * relayed through page.tsx) -- consumed once on mount/change below,
   * then cleared via onPendingRequestConsumed. */
  pendingRequest?: PendingAiRequest | null;
  onPendingRequestConsumed?: () => void;
}

export const AiChatView: React.FC<AiChatViewProps> = ({ pendingRequest, onPendingRequestConsumed }) => {
  const { todos, projects } = useApp();
  const { t, language } = useLanguage();

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Defaults to OpenAI's "Luna" model on a fresh/cold start -- falls back
  // to the first listed model only if Luna isn't found in AI_MODELS.
  const [selectedModel, setSelectedModel] = useState<AiModelOption>(
    AI_MODELS.find((m) => m.id === 'gpt-5.6-luna') || AI_MODELS[0]
  );
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // Multi-message selection mode (WhatsApp style)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [denizSpeechIntro, setDenizSpeechIntro] = useState('');
  const [denizCustomSystemPrompt, setDenizCustomSystemPrompt] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations and settings
  const refreshConversations = async () => {
    try {
      const list = await getAiConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        setActiveConversationId(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getAiSettings().then((s) => {
      setAiSettings(s);
      // 'gemini-3.8-flash' was the original hardcoded fallback and there's
      // no settings UI to actually choose a default model, so a stored
      // value of exactly that is just leftover, never an intentional
      // pick -- skip it so the Luna default above isn't silently
      // overwritten by it on load.
      if (s.defaultModel && s.defaultModel !== 'gemini-3.8-flash') {
        const found = AI_MODELS.find((m) => m.id === s.defaultModel);
        if (found) setSelectedModel(found);
      }
    });
    refreshConversations();
  }, []);

  // Update active conversation & messages when id changes.
  //
  // `conversations` is a dependency too (not just activeConversationId) so
  // that if `conversations` finishes loading *after* activeConversationId
  // is already set, the matching conversation's messages still get loaded
  // once it's found. But that means this effect also re-fires on every
  // *unrelated* update to the conversations list -- e.g. handleSendMessage
  // renaming the conversation's title right after the first message, or
  // ConversationSidebar pinning/renaming one elsewhere -- and it used to
  // call setMessages(conv.messages || []) every single time, stomping the
  // live `messages` state (which has already moved ahead with the
  // optimistically-appended user/assistant messages) back down to whatever
  // stale snapshot `conversations` happens to hold for this conversation --
  // silently erasing the person's own just-typed message from the screen.
  //
  // skipNextMessagesLoadRef lets handleSendMessage/handleNewChat say "I'm
  // switching activeConversationId to a conversation whose messages I
  // already know are right (I just set them myself), don't reload" for the
  // one render where a brand-new conversation is created; everything else
  // (clicking a different chat in the sidebar, deleting the active one)
  // still loads that conversation's real history as before.
  const loadedConversationIdRef = useRef<string | null>(null);
  const skipNextMessagesLoadRef = useRef(false);
  useEffect(() => {
    if (activeConversationId) {
      const conv = conversations.find((c) => c.id === activeConversationId);
      if (conv) {
        setActiveConversation(conv);
        const isSwitchingConversation = loadedConversationIdRef.current !== activeConversationId;
        if (isSwitchingConversation && !skipNextMessagesLoadRef.current) {
          setMessages(conv.messages || []);
        }
        skipNextMessagesLoadRef.current = false;
        loadedConversationIdRef.current = activeConversationId;
        const modelOpt = AI_MODELS.find((m) => m.id === conv.model);
        if (modelOpt) setSelectedModel(modelOpt);
      }
    } else {
      setActiveConversation(null);
      setMessages([]);
      loadedConversationIdRef.current = null;
    }
  }, [activeConversationId, conversations]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleNewChat = async () => {
    try {
      const created = await createAiConversation({
        title: 'Yeni Sohbet',
        provider: selectedModel.provider,
        model: selectedModel.id,
      });
      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.id);
      setMessages([]);
      textareaRef.current?.focus();
    } catch (e) {
      console.warn('DB conversation creation failed, creating local fallback conversation:', e);
      const fallbackConv: AiConversation = {
        id: 'conv-' + Date.now(),
        title: 'Yeni Sohbet',
        provider: selectedModel.provider,
        model: selectedModel.id,
        pinned: false,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setConversations((prev) => [fallbackConv, ...prev]);
      setActiveConversationId(fallbackConv.id);
      setMessages([]);
      textareaRef.current?.focus();
    }
  };

  const handleDeleteChat = async (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) {
        const nextActive = remaining[0] || null;
        setActiveConversationId(nextActive ? nextActive.id : null);
        setMessages(nextActive ? nextActive.messages || [] : []);
      }
      return remaining;
    });

    try {
      await deleteAiConversation(id);
    } catch (e) {
      console.error('Delete chat error:', e);
    }
  };

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    const nextPin = !currentPin;
    setConversations((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, pinned: nextPin } : c))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    );

    try {
      await updateAiConversation(id, { pinned: nextPin });
    } catch (e) {
      console.error('Toggle pin error:', e);
    }
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)));
    setActiveConversation((prev) => (prev && prev.id === id ? { ...prev, title: trimmed } : prev));

    try {
      await updateAiConversation(id, { title: trimmed });
    } catch (e) {
      console.error('Rename chat error:', e);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt !== undefined ? customPrompt : inputPrompt).trim();
    if (!textToSend || isLoading) return;

    let targetConvId = activeConversationId;

    // If no conversation exists, create one first
    if (!targetConvId) {
      try {
        const titleDraft = textToSend.slice(0, 30) + '...';
        const created = await createAiConversation({
          title: titleDraft,
          provider: selectedModel.provider,
          model: selectedModel.id,
        });
        targetConvId = created.id;
        setConversations((prev) => [created, ...prev]);
        skipNextMessagesLoadRef.current = true;
        setActiveConversationId(created.id);
      } catch (e) {
        console.warn('DB conversation creation failed in send message, using local ID:', e);
        const fallbackId = 'conv-' + Date.now();
        targetConvId = fallbackId;
        const fallbackConv: AiConversation = {
          id: fallbackId,
          title: textToSend.slice(0, 30) + '...',
          provider: selectedModel.provider,
          model: selectedModel.id,
          pinned: false,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setConversations((prev) => [fallbackConv, ...prev]);
        skipNextMessagesLoadRef.current = true;
        setActiveConversationId(fallbackId);
      }
    }

    const userMessage: AiMessage = {
      id: 'temp-' + Date.now(),
      conversationId: targetConvId,
      role: 'user',
      content: textToSend,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Save user message to DB (non-blocking)
      await addAiMessage({
        conversationId: targetConvId,
        role: 'user',
        content: textToSend,
      }).catch((e) => console.warn('addAiMessage skipped/warn:', e));

      // Update title if it was first message
      if (messages.length === 0) {
        const smartTitle = textToSend.slice(0, 32);
        updateAiConversation(targetConvId, { title: smartTitle }).catch(() => {});
        setConversations((prev) =>
          prev.map((c) => (c.id === targetConvId ? { ...c, title: smartTitle } : c))
        );
      }

      // Call API
      const conversationHistory = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const clientApiKeys = typeof window !== 'undefined' ? {
        gemini: localStorage.getItem('dnz_ai_gemini_key') || undefined,
        anthropic: localStorage.getItem('dnz_ai_anthropic_key') || undefined,
        openai: localStorage.getItem('dnz_ai_openai_key') || undefined,
      } : {};

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          provider: selectedModel.provider,
          model: selectedModel.id,
          conversationId: targetConvId,
          apiKeys: clientApiKeys,
          systemPrompt: getLiveDenizSystemPrompt(),
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMsg: AiMessage = {
        id: 'msg-' + Date.now(),
        conversationId: targetConvId,
        role: 'assistant',
        content: data.content,
        model: data.model,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      // (The assistant reply is already persisted server-side -- see
      // app/api/ai/chat/route.ts's own addAiMessage call keyed off the
      // conversationId sent in this request -- so nothing to save here.)
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: AiMessage = {
        id: 'err-' + Date.now(),
        conversationId: targetConvId,
        role: 'assistant',
        content: `❌ ${t('ai.errorOccurred') || 'Bir hata oluştu'}: ${err?.message || 'Yapay zeka ile iletişim kurulamadı.'}`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to construct dynamic Deniz context with up-to-the-second tasks for SITREP & Voice
  const getLiveDenizSystemPrompt = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = todos.filter(
      (t) => !t.completed && t.deadline && new Date(t.deadline) < today
    );
    const dueTodayTasks = todos.filter((t) => {
      if (t.completed || !t.deadline) return false;
      const d = new Date(t.deadline);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    const urgentTasks = todos.filter(
      (t) => !t.completed && (t.priority === 'urgent' || t.priority === 'high')
    );
    const activeTasks = todos.filter((t) => !t.completed);
    const completedTasks = todos.filter((t) => t.completed);

    if (language === 'de') {
      return `Sie sind Deniz, der persönliche KI-Chef-Assistent von DNZ Productivity OS.
Sie sprechen direkt und interaktiv mit dem Benutzer. Sie kennen alle Projekte, Aufgaben und Zeitpläne im Detail und sind loyal, professionell, respektvoll und proaktiv.

📊 AKTUELLE SYSTEMDATEN:
- Gesamtaufgaben: ${todos.length} (${activeTasks.length} aktiv, ${completedTasks.length} erledigt).
- Überfällige Aufgaben (${overdueTasks.length}): ${overdueTasks.map((t) => t.title).join(', ') || 'Keine'}
- Heute fällige Aufgaben (${dueTodayTasks.length}): ${dueTodayTasks.map((t) => t.title).join(', ') || 'Keine'}
- Dringende / Hohe Priorität (${urgentTasks.length}): ${urgentTasks.map((t) => t.title).join(', ') || 'Keine'}
- Aktive Projekte: ${projects.map((p) => p.name).join(', ') || 'Allgemein'}

SITREP & SPRACHASSISTENT-ANWEISUNGEN:
1. Wenn der Benutzer "sitrep", "lagebericht", "status" oder ähnliches anfordert, analysieren Sie sofort die aktuellen Daten und erstellen Sie eine professionelle Executive SITREP-Zusammenfassung auf Deutsch.
2. Halten Sie Sprachantworten prägnant, klar, natürlich und ohne Aufzählungszeichen.`;
    }

    if (language === 'en') {
      return `You are Deniz, the Executive Personal AI Assistant for DNZ Productivity OS.
You are conversing with the user in live voice and text. You know the user's projects, tasks, and schedule thoroughly and serve as a loyal, highly professional, polite, proactive assistant.

📊 CURRENT SYSTEM DATA:
- Total Tasks: ${todos.length} (${activeTasks.length} active, ${completedTasks.length} completed).
- Overdue Tasks (${overdueTasks.length}): ${overdueTasks.map((t) => t.title).join(', ') || 'None'}
- Due Today (${dueTodayTasks.length}): ${dueTodayTasks.map((t) => t.title).join(', ') || 'None'}
- Urgent / High Priority (${urgentTasks.length}): ${urgentTasks.map((t) => t.title).join(', ') || 'None'}
- Active Projects: ${projects.map((p) => p.name).join(', ') || 'General'}

SITREP & VOICE ASSISTANT INSTRUCTIONS:
1. When the user asks for "sitrep", "situation report", "status update", or "daily briefing", analyze current data immediately and provide an executive SITREP evaluation in English.
2. Keep spoken replies natural, concise, clear, polite, and conversational without bullet points.`;
    }

    return `Sen DNZ Productivity OS'un üst düzey Yönetici Kişisel Asistanısın (Adın Deniz).
Kullanıcı seninle canlı sesli olarak karşılıklı konuşuyor. Sen kullanıcının projelerini, görevlerini ve zamanını çok iyi bilen sadık, son derece profesyonel, samimi, saygılı ve proaktif bir kişisel asistansın.

📊 GÜNCEL SİSTEM VERİLERİ:
- Toplam Görev: ${todos.length} (${activeTasks.length} aktif, ${completedTasks.length} tamamlandı).
- Geciken Görevler (${overdueTasks.length}): ${overdueTasks.map((t) => t.title).join(', ') || 'Yok'}
- Bugün Bitişliler (${dueTodayTasks.length}): ${dueTodayTasks.map((t) => t.title).join(', ') || 'Yok'}
- Kritik / Yüksek Öncelikli Görevler (${urgentTasks.length}): ${urgentTasks.map((t) => t.title).join(', ') || 'Yok'}
- Projeler: ${projects.map((p) => p.name).join(', ') || 'Genel'}

ÖZEL SITREP (DURUM RAPORU) VE SESLİ ASİSTAN TALİMATLARI:
1. Kullanıcı "sitrep", "durum raporu", "durum değerlendirmesi", "güncel durum nedir" veya benzeri bir talepte bulunduğunda:
   - Hemen güncel verileri analiz et.
   - Durumu profesyonel bir yönetici SITREP formatında değerlendir (aktif görevler, geciken/kritik riskler, önerilen sıradaki aksiyon).
   - Hem ekranda okunabilecek netlikte hem de sesli konuşmaya uygun akıcı bir dille cevap ver.
2. Tüm yanıtlarını sesli konuşmaya uygun, kısa, net, saygılı, madde işaretsiz ve doğal bir konuşma diliyle aktar.`;
  };

  // Consumes a task's "Ask AI" request (see AskAiButton.tsx / AppContext's
  // pendingAiRequest / page.tsx) once this view is mounted: either sends
  // the task straight into the chat as a written message, or opens Live
  // Voice with a spoken opener about it -- same two entry points
  // handleTriggerDenizSitrep already uses below, just seeded from a task
  // instead of the day's full task list.
  useEffect(() => {
    if (!pendingRequest) return;

    if (pendingRequest.mode === 'text') {
      const prompt =
        language === 'de'
          ? `Kannst du mir bei der Aufgabe "${pendingRequest.taskTitle}" helfen?`
          : language === 'en'
          ? `Could you help me with the task "${pendingRequest.taskTitle}"?`
          : `"${pendingRequest.taskTitle}" görevi hakkında bana yardımcı olur musun?`;
      handleSendMessage(prompt);
    } else {
      const voiceLang = aiSettings?.voiceLanguage || 'tr-TR';
      const intro = voiceLang.startsWith('de')
        ? `Du möchtest über die Aufgabe "${pendingRequest.taskTitle}" sprechen. Wie kann ich dir dabei helfen?`
        : voiceLang.startsWith('en')
        ? `You'd like to talk about the task "${pendingRequest.taskTitle}". How can I help you with it?`
        : `"${pendingRequest.taskTitle}" görevin hakkında konuşmak istiyorsun. Bu konuda nasıl yardımcı olabilirim?`;
      setDenizSpeechIntro(intro);
      setDenizCustomSystemPrompt(getLiveDenizSystemPrompt());
      setIsLiveVoiceOpen(true);
    }

    onPendingRequestConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRequest]);

  // Deniz SITREP Trigger (Generates written SITREP + launches interactive live voice assistant)
  const handleTriggerDenizSitrep = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = todos.filter(
      (t) => !t.completed && t.deadline && new Date(t.deadline) < today
    );
    const dueTodayTasks = todos.filter((t) => {
      if (t.completed || !t.deadline) return false;
      const d = new Date(t.deadline);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    const urgentTasks = todos.filter(
      (t) => !t.completed && (t.priority === 'urgent' || t.priority === 'high')
    );
    const activeTasks = todos.filter((t) => !t.completed);

    // 1. Detailed Written Executive Report Prompt for Chat Feed
    let writtenPrompt = '';
    if (language === 'de') {
      writtenPrompt = `Sie sind Deniz, der persönliche KI-Chef-Assistent von DNZ Productivity OS.
Analysieren Sie meinen heutigen Aufgabenstatus und erstellen Sie ein klares, motivierendes DNZ SITREP (Daily Executive Situation Report) auf Deutsch.

📊 AKTUELLE DATEN:
- Gesamtaufgaben: ${todos.length} (${activeTasks.length} aktiv, ${todos.filter((t) => t.completed).length} erledigt)
- Überfällig (${overdueTasks.length}): ${overdueTasks.map((t) => t.title).join(', ') || 'Keine'}
- Heute fällig (${dueTodayTasks.length}): ${dueTodayTasks.map((t) => t.title).join(', ') || 'Keine'}
- Dringend / Hoch (${urgentTasks.length}): ${urgentTasks.map((t) => t.title).join(', ') || 'Keine'}
- Projekte: ${projects.map((p) => p.name).join(', ') || 'Allgemein'}

Bitte erstellen Sie einen eleganten Lagebericht mit folgender Vorlage:
# 🎙️ DNZ SITREP — TAGESBERICHT
## 1. 🎯 Kernfokus für heute
## 2. ⚠️ Kritische & Dringende Aufgaben
## 3. ⏱️ Zeitmanagement & Empfohlene Pomodoro-Reihenfolge
## 4. 💡 Strategische Notiz von Deniz & Motivation`;
    } else if (language === 'en') {
      writtenPrompt = `You are Deniz, the Executive Personal AI Assistant for DNZ Productivity OS.
Analyze my task status for today and generate a crisp, motivating, prioritized DNZ SITREP (Daily Executive Situation Report) in English.

📊 CURRENT SYSTEM DATA:
- Total Tasks: ${todos.length} (${activeTasks.length} active, ${todos.filter((t) => t.completed).length} completed)
- Overdue Tasks (${overdueTasks.length}): ${overdueTasks.map((t) => t.title).join(', ') || 'None'}
- Due Today (${dueTodayTasks.length}): ${dueTodayTasks.map((t) => t.title).join(', ') || 'None'}
- Urgent / High Priority (${urgentTasks.length}): ${urgentTasks.map((t) => t.title).join(', ') || 'None'}
- Active Projects: ${projects.map((p) => p.name).join(', ') || 'General'}

Please generate an Apple-style, inspiring briefing using this template:
# 🎙️ DNZ SITREP — DAILY EXECUTIVE REPORT
## 1. 🎯 Core Focus for Today
## 2. ⚠️ Critical & Urgent Action Items
## 3. ⏱️ Time Management & Recommended Execution Order (Pomodoro Blocks)
## 4. 💡 Deniz Strategic Note & Daily Motivation`;
    } else {
      writtenPrompt = `Sen DNZ Productivity OS'un üst düzey Yönetici Kişisel Asistanısın (Adın Deniz).
Bugünkü görev durumumu analiz et ve bana net, motive edici, önceliklendirilmiş bir DNZ SITREP (Daily Executive Situation Report) hazırla.

📊 MEVCUT SİSTEM VERİLERİ:
- Toplam Görev Sayısı: ${todos.length} (${activeTasks.length} aktif, ${todos.filter((t) => t.completed).length} tamamlandı)
- Geciken Görevler (${overdueTasks.length}): ${overdueTasks.map((t) => t.title).join(', ') || 'Yok'}
- Bugün Bitişli Görevler (${dueTodayTasks.length}): ${dueTodayTasks.map((t) => t.title).join(', ') || 'Yok'}
- Kritik / Yüksek Öncelikli Görevler (${urgentTasks.length}): ${urgentTasks.map((t) => t.title).join(', ') || 'Yok'}
- Aktif Projeler: ${projects.map((p) => p.name).join(', ') || 'Genel'}

Lütfen şu şablonla Apple tarzı, net ve ilham verici bir rapor üret:
# 🎙️ DNZ SITREP — GÜNLÜK DURUM RAPORU
## 1. 🎯 Bugünün Ana Odak Noktası (Core Focus)
## 2. ⚠️ Kritik & Acil Aksiyon Maddeleri
## 3. ⏱️ Zaman Yönetimi & Önerilen İcra Sırası (Tavsiye edilen Pomodoro blokları)
## 4. 💡 Deniz Stratejik Notu & Motivasyon`;
    }

    // Send written request into chat conversation
    handleSendMessage(writtenPrompt);

    // 2. Interactive Spoken Greeting for Deniz Live Voice Assistant
    const voiceLang = aiSettings?.voiceLanguage || 'tr-TR';
    let spokenIntro = '';
    if (voiceLang.startsWith('tr')) {
      spokenIntro = `Merhaba efendim. Ben Deniz, kişisel asistanınız. Bugün için hazırladığım DNZ SITREP durum değerlendirmesini ekrana aktardım. Sisteminizde ${activeTasks.length} aktif görev bulunuyor. ${
        urgentTasks.length > 0
          ? `${urgentTasks.length} kritik ve acil işiniz var.`
          : 'Öncelikleriniz dengeli görünüyor.'
      } ${
        overdueTasks.length > 0 ? `${overdueTasks.length} gecikmiş görev tespit ettim.` : ''
      } ${
        urgentTasks[0]
          ? `İlk olarak "${urgentTasks[0].title}" görevine odaklanmanızı tavsiye ederim.`
          : 'Bugün harika bir odaklanma günü olabilir.'
      } Nasıl ilerlemek istersiniz, bugün size nasıl yardımcı olabilirim?`;
    } else if (voiceLang.startsWith('de')) {
      spokenIntro = `Guten Tag. Ich bin Deniz, Ihre persönliche Assistentin. Ich habe Ihr persönliches DNZ SITREP auf dem Bildschirm vorbereitet. Sie haben ${activeTasks.length} aktive Aufgaben und ${urgentTasks.length} dringende Prioritäten. Womit möchten Sie heute beginnen?`;
    } else {
      spokenIntro = `Good day, sir. I am Deniz, your personal executive assistant. I have prepared your DNZ SITREP situation report on your screen. You have ${activeTasks.length} active tasks and ${urgentTasks.length} high priorities. How would you like to proceed today?`;
    }

    setDenizSpeechIntro(spokenIntro);
    setDenizCustomSystemPrompt(getLiveDenizSystemPrompt());
    setIsLiveVoiceOpen(true);
  };

  const handleDeleteMessage = async (messageId: string) => {
    const confirmMsg = t('ai.deleteMessageConfirm') || 'Bu mesajı silmek istediğinize emin misiniz?';
    if (!window.confirm(confirmMsg)) return;

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: (c.messages || []).filter((m) => m.id !== messageId) }
            : c
        )
      );
    }
    try {
      await deleteAiMessage(messageId);
    } catch (err) {
      console.warn('Error deleting message:', err);
    }
  };

  // WhatsApp-style Multi-select message handlers
  const handleToggleSelect = (messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessageIds.length === messages.length) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(messages.map((m) => m.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedMessageIds.length === 0) return;
    const idsToDelete = [...selectedMessageIds];

    const confirmMsg = `${idsToDelete.length} ${t('ai.batchDeleteConfirm') || 'mesajı silmek istediğinize emin misiniz?'}`;
    if (!window.confirm(confirmMsg)) return;

    setMessages((prev) => prev.filter((m) => !idsToDelete.includes(m.id)));
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: (c.messages || []).filter((m) => !idsToDelete.includes(m.id)) }
            : c
        )
      );
    }

    setSelectedMessageIds([]);
    setIsSelectionMode(false);

    try {
      await deleteAiMessages(idsToDelete);
    } catch (err) {
      console.warn('Error batch deleting messages:', err);
    }
  };

  const handleCancelSelection = () => {
    setSelectedMessageIds([]);
    setIsSelectionMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={styles.container}>
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setIsSelectionMode(false);
          setSelectedMessageIds([]);
        }}
        onNewChat={() => {
          handleNewChat();
          setIsSelectionMode(false);
          setSelectedMessageIds([]);
        }}
        onDeleteConversation={handleDeleteChat}
        onTogglePin={handleTogglePin}
        onRenameConversation={handleRenameChat}
        onOpenSettings={() => setIsConfigOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
      />

      <div className={styles.mainChat}>
        <div className={styles.topBar}>
          {isSelectionMode ? (
            <div className={styles.selectionBar}>
              <div className={styles.selectionInfo}>
                <span className={styles.selectionBadge}>{selectedMessageIds.length}</span>
                <span>{t('ai.selectedCount', { count: selectedMessageIds.length }) || `${selectedMessageIds.length} selected`}</span>
              </div>

              <div className={styles.selectionActions}>
                <button
                  type="button"
                  className={styles.selectionActionBtn}
                  onClick={handleSelectAll}
                >
                  {selectedMessageIds.length === messages.length ? (t('ai.deselectAll') || 'Deselect') : (t('ai.selectAll') || 'Select All')}
                </button>

                <button
                  type="button"
                  className={`${styles.selectionActionBtn} ${styles.deleteBatchBtn}`}
                  onClick={handleBatchDelete}
                  disabled={selectedMessageIds.length === 0}
                  title={t('ai.deleteSelected') || 'Delete Selected'}
                >
                  🗑️ {selectedMessageIds.length > 0 ? `${t('ai.deleteSelected') || 'Delete'} (${selectedMessageIds.length})` : (t('common.delete') || 'Delete')}
                </button>

                <button
                  type="button"
                  className={styles.selectionActionBtn}
                  onClick={handleCancelSelection}
                >
                  ✕ {t('ai.cancel') || 'Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.leftControls}>
                <ModelSelector
                  selectedModelId={selectedModel.id}
                  onSelectModel={(m) => {
                    setSelectedModel(m);
                    if (activeConversationId) {
                      updateAiConversation(activeConversationId, {
                        provider: m.provider,
                        model: m.id,
                      });
                    }
                  }}
                />
              </div>

              <div className={styles.rightControls}>
                {messages.length > 0 && (
                  <button
                    type="button"
                    className={styles.iconActionBtn}
                    onClick={() => setIsSelectionMode(true)}
                    title={t('ai.multiSelect') || 'Select'}
                  >
                    <span>☑️</span>
                    <span>{t('ai.multiSelect') || 'Select'}</span>
                  </button>
                )}

                <button
                  type="button"
                  className={`${styles.iconActionBtn} ${styles.briefingBtn}`}
                  onClick={handleTriggerDenizSitrep}
                  title={t('ai.denizSitrep') || t('ai.jarvisBriefing') || 'DNZ SITREP'}
                >
                  <span>🎙️</span>
                  <span>{t('ai.denizSitrep') || t('ai.jarvisBriefing') || 'DNZ SITREP'}</span>
                </button>

                <button
                  type="button"
                  className={styles.iconActionBtn}
                  onClick={() => setIsVaultOpen(true)}
                  title={t('ai.reportVaultBtn') || 'Report Vault'}
                >
                  <span>📁</span>
                  <span>{t('ai.reportVaultBtn') || 'Report Vault'}</span>
                </button>

                <button
                  type="button"
                  className={`${styles.iconActionBtn} ${styles.highlight}`}
                  onClick={() => setIsLiveVoiceOpen(true)}
                  title={t('ai.liveVoice') || 'Live Voice Mode'}
                >
                  <span>🎙️</span>
                  <span>{t('ai.liveVoice') || 'Live Voice Mode'}</span>
                </button>

                <button
                  type="button"
                  className={styles.iconActionBtn}
                  onClick={() => setIsConfigOpen(true)}
                  title={t('settings.title') || 'Settings'}
                >
                  <span>⚙️</span>
                  <span>{t('settings.title') || 'Settings'}</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className={styles.messageFeed}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>{selectedModel.icon}</div>
              <h2 className={styles.emptyTitle}>Deniz • {selectedModel.name}</h2>
              <p className={styles.emptySubtitle}>
                {t('ai.assistantDescription') || 'Ask anything or use voice dictation for software engineering, cybersecurity research, German language practice, or task planning.'}
              </p>

              <PromptTemplates
                onSelectTemplate={(prompt) => {
                  setInputPrompt(prompt);
                  textareaRef.current?.focus();
                }}
              />
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onDelete={handleDeleteMessage}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedMessageIds.includes(msg.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#818cf8', fontSize: '0.85rem' }}>
                  <span>⏳</span>
                  <span>{t('ai.thinking', { name: selectedModel.name }) || `${selectedModel.name} is thinking...`}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputBox}>
            <VoiceInputButton
              language={aiSettings?.voiceLanguage || 'tr-TR'}
              onTranscriptChange={(text) => {
                setInputPrompt(text);
              }}
            />

            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder={t('ai.inputPlaceholder', { name: selectedModel.name }) || `Ask or dictate something to ${selectedModel.name}...`}
              rows={1}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button
              type="button"
              className={styles.sendBtn}
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isLoading}
              title="Gönder (Enter)"
            >
              ➔
            </button>
          </div>

          <div className={styles.inputFooter}>
            <span>Shift + Enter: {t('aiChat.newLine')} • Enter: {t('aiChat.send')}</span>
            <span>🎙️ {t('ai.speak') || 'Voice Dictation'}</span>
          </div>
        </div>
      </div>

      <ApiKeyConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaved={(s) => setAiSettings(s)}
      />

      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => {
          setIsLiveVoiceOpen(false);
          setDenizSpeechIntro('');
          setDenizCustomSystemPrompt('');
        }}
        selectedModel={selectedModel}
        language={aiSettings?.voiceLanguage || 'tr-TR'}
        initialSpokenText={denizSpeechIntro}
        customSystemPrompt={denizCustomSystemPrompt || getLiveDenizSystemPrompt()}
        onNewMessage={async (userText, replyText) => {
          // Mirrors handleSendMessage's "no conversation yet -- create one"
          // logic above. Before this, a Live Voice turn that started with
          // no chat selected (e.g. opened straight from the mic button, or
          // from the SITREP/task-voice entry points) silently no-op'd here
          // -- activeConversationId was null, so the whole block was
          // skipped and the exchange was never saved anywhere and no new
          // chat ever appeared in the sidebar.
          let targetConvId = activeConversationId;
          const isNewConversation = !targetConvId;

          if (!targetConvId) {
            try {
              const titleDraft = userText.slice(0, 30) + '...';
              const created = await createAiConversation({
                title: titleDraft,
                provider: selectedModel.provider,
                model: selectedModel.id,
              });
              targetConvId = created.id;
              setConversations((prev) => [created, ...prev]);
              skipNextMessagesLoadRef.current = true;
              setActiveConversationId(created.id);
            } catch (e) {
              console.warn('DB conversation creation failed in live voice, using local ID:', e);
              const fallbackId = 'conv-' + Date.now();
              targetConvId = fallbackId;
              const fallbackConv: AiConversation = {
                id: fallbackId,
                title: userText.slice(0, 30) + '...',
                provider: selectedModel.provider,
                model: selectedModel.id,
                pinned: false,
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              setConversations((prev) => [fallbackConv, ...prev]);
              skipNextMessagesLoadRef.current = true;
              setActiveConversationId(fallbackId);
            }
          }

          const userMsg: AiMessage = {
            id: 'temp-' + Date.now(),
            conversationId: targetConvId,
            role: 'user',
            content: userText,
            createdAt: new Date(),
          };
          const assistantMsg: AiMessage = {
            id: 'temp-' + (Date.now() + 1),
            conversationId: targetConvId,
            role: 'assistant',
            content: replyText,
            model: selectedModel.id,
            createdAt: new Date(),
          };
          // A brand-new conversation starts this turn's messages fresh;
          // an existing one appends to whatever's already on screen.
          setMessages((prev) => (isNewConversation ? [userMsg, assistantMsg] : [...prev, userMsg, assistantMsg]));

          addAiMessage({
            conversationId: targetConvId,
            role: 'user',
            content: userText,
          }).catch((e) => console.warn('addAiMessage (live voice, user) skipped/warn:', e));
          addAiMessage({
            conversationId: targetConvId,
            role: 'assistant',
            content: replyText,
            model: selectedModel.id,
          }).catch((e) => console.warn('addAiMessage (live voice, assistant) skipped/warn:', e));

          refreshConversations();
        }}
      />

      <ReportVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
      />
    </div>
  );
};
