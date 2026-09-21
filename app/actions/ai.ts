'use server';

import { prisma } from '@/lib/prisma';
import { AiConversation, AiMessage, AiSettings, AiProvider } from '@/types';
import { revalidatePath } from 'next/cache';

const AI_SETTINGS_ID = 'default';

export async function getAiSettings(): Promise<AiSettings> {
  try {
    const settings = await prisma.aiSettings.findUnique({
      where: { id: AI_SETTINGS_ID },
    });

    if (!settings) {
      return {
        id: AI_SETTINGS_ID,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
        geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || null,
        openaiApiKey: process.env.OPENAI_API_KEY || null,
        defaultProvider: 'openai' as AiProvider,
        defaultModel: 'gpt-5.6-luna',
        voiceLanguage: 'tr-TR',
        autoSpeak: false,
        updatedAt: new Date(),
      };
    }

    return {
      ...settings,
      anthropicApiKey: settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null,
      geminiApiKey: settings.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || null,
      openaiApiKey: settings.openaiApiKey || process.env.OPENAI_API_KEY || null,
      defaultProvider: settings.defaultProvider as AiProvider,
    };
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return {
      id: AI_SETTINGS_ID,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
      geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || null,
      openaiApiKey: process.env.OPENAI_API_KEY || null,
      defaultProvider: 'openai' as AiProvider,
      defaultModel: 'gpt-5.6-luna',
      voiceLanguage: 'tr-TR',
      autoSpeak: false,
      updatedAt: new Date(),
    };
  }
}

export async function updateAiSettings(updates: Partial<AiSettings>): Promise<AiSettings> {
  try {
    const updated = await prisma.aiSettings.upsert({
      where: { id: AI_SETTINGS_ID },
      update: {
        anthropicApiKey: updates.anthropicApiKey,
        geminiApiKey: updates.geminiApiKey,
        openaiApiKey: updates.openaiApiKey,
        defaultProvider: updates.defaultProvider,
        defaultModel: updates.defaultModel,
        voiceLanguage: updates.voiceLanguage,
        autoSpeak: updates.autoSpeak,
      },
      create: {
        id: AI_SETTINGS_ID,
        anthropicApiKey: updates.anthropicApiKey || null,
        geminiApiKey: updates.geminiApiKey || null,
        openaiApiKey: updates.openaiApiKey || null,
        defaultProvider: updates.defaultProvider || 'gemini',
        defaultModel: updates.defaultModel || 'gemini-3.8-flash',
        voiceLanguage: updates.voiceLanguage || 'tr-TR',
        autoSpeak: updates.autoSpeak ?? false,
      },
    });

    revalidatePath('/');
    return {
      ...updated,
      defaultProvider: updated.defaultProvider as AiProvider,
    };
  } catch (error) {
    console.error('Error saving AI settings:', error);
    throw error;
  }
}

export async function getAiConversations(): Promise<AiConversation[]> {
  try {
    const conversations = await prisma.aiConversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [
        { pinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return conversations.map((c) => ({
      ...c,
      provider: c.provider as AiProvider,
      messages: c.messages.map((m) => ({
        ...m,
        role: m.role as 'user' | 'assistant' | 'system',
        tokens: m.tokens ?? undefined,
        model: m.model ?? undefined,
      })),
    }));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
}

export async function createAiConversation(data: {
  title?: string;
  provider?: AiProvider;
  model?: string;
  systemPrompt?: string;
}): Promise<AiConversation> {
  try {
    const conversation = await prisma.aiConversation.create({
      data: {
        title: data.title || 'Yeni Sohbet',
        provider: data.provider || 'gemini',
        model: data.model || 'gemini-3.8-flash',
        systemPrompt: data.systemPrompt || null,
      },
      include: {
        messages: true,
      },
    });

    revalidatePath('/');
    return {
      ...conversation,
      provider: conversation.provider as AiProvider,
      messages: [],
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

export async function updateAiConversation(
  id: string,
  updates: Partial<Pick<AiConversation, 'title' | 'pinned' | 'provider' | 'model' | 'systemPrompt'>>
): Promise<AiConversation | null> {
  try {
    const existing = await prisma.aiConversation.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = await prisma.aiConversation.update({
      where: { id },
      data: updates,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    revalidatePath('/');
    return {
      ...updated,
      provider: updated.provider as AiProvider,
      messages: updated.messages.map((m) => ({
        ...m,
        role: m.role as 'user' | 'assistant' | 'system',
        tokens: m.tokens ?? undefined,
        model: m.model ?? undefined,
      })),
    };
  } catch (error) {
    console.error('Error updating conversation:', error);
    return null;
  }
}

export async function deleteAiConversation(id: string): Promise<void> {
  try {
    await prisma.aiMessage.deleteMany({
      where: { conversationId: id },
    });
    await prisma.aiConversation.deleteMany({
      where: { id },
    });
    revalidatePath('/');
  } catch (error) {
    console.error('Error deleting conversation:', error);
  }
}

export async function addAiMessage(data: {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  tokens?: number;
}): Promise<AiMessage> {
  try {
    const message = await prisma.aiMessage.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        model: data.model || null,
        tokens: data.tokens || null,
      },
    });

    // Touch the conversation updatedAt
    await prisma.aiConversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    revalidatePath('/');
    return {
      ...message,
      role: message.role as 'user' | 'assistant' | 'system',
      tokens: message.tokens ?? undefined,
      model: message.model ?? undefined,
    };
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

export async function deleteAiMessage(id: string): Promise<void> {
  try {
    await prisma.aiMessage.delete({
      where: { id },
    });
    revalidatePath('/');
  } catch (error) {
    console.warn('Error deleting message from DB (might be client temp message):', error);
  }
}

export async function deleteAiMessages(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    await prisma.aiMessage.deleteMany({
      where: {
        id: { in: ids },
      },
    });
    revalidatePath('/');
  } catch (error) {
    console.warn('Error batch deleting messages from DB:', error);
  }
}


