/**
 * Hushh Intelligence Service
 * 
 * Frontend wrapper for ChatNode AI (powered by Gemini)
 * Provides: Chat, File Upload, Image Analysis
 */

import config from '../../resources/config/config';

// Message type for chat history
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    type: 'image' | 'file';
    name: string;
    url?: string;
    base64?: string;
    mimeType: string;
  }>;
}

// API response type
interface HushhIntelligenceResponse {
  success: boolean;
  response: string;
  model: string;
  error?: string;
}

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Convert ChatMessage history to API format
const convertHistoryToApiFormat = (history: ChatMessage[]) => {
  return history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
};

/**
 * Send a chat message to Hushh Intelligence
 */
export const sendChatMessage = async (
  message: string,
  history: ChatMessage[] = [],
  image?: File,
  file?: File
): Promise<HushhIntelligenceResponse> => {
  try {
    const requestBody: Record<string, any> = {
      message,
      history: convertHistoryToApiFormat(history),
    };

    // Add image if provided
    if (image) {
      const base64 = await fileToBase64(image);
      requestBody.image = {
        base64,
        mimeType: image.type,
      };
    }

    // Add file if provided
    if (file) {
      const base64 = await fileToBase64(file);
      requestBody.file = {
        base64,
        mimeType: file.type,
        name: file.name,
      };
    }

    const supabase = config.supabaseClient;
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase.functions.invoke('chatnode-ai', {
      body: requestBody,
    });

    if (error) {
      console.error('Hushh Intelligence Error:', error);
      return {
        success: false,
        response: 'I apologize, but I encountered an issue. Please try again.',
        model: 'hushh-intelligence-v1',
        error: error.message,
      };
    }

    return data as HushhIntelligenceResponse;
  } catch (err) {
    console.error('Hushh Intelligence Error:', err);
    return {
      success: false,
      response: 'An unexpected error occurred. Please try again.',
      model: 'hushh-intelligence-v1',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Generate a unique message ID
 */
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a user message object
 */
export const createUserMessage = (
  content: string,
  attachments?: ChatMessage['attachments']
): ChatMessage => ({
  id: generateMessageId(),
  role: 'user',
  content,
  timestamp: new Date(),
  attachments,
});

/**
 * Create an assistant message object
 */
export const createAssistantMessage = (content: string): ChatMessage => ({
  id: generateMessageId(),
  role: 'assistant',
  content,
  timestamp: new Date(),
});

/**
 * Check if file type is supported
 */
export const isFileTypeSupported = (file: File): boolean => {
  const supportedTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/javascript',
    'application/pdf', // Note: PDF content extraction limited
    // Code files
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-cpp',
  ];

  return supportedTypes.includes(file.type) || 
         file.type.startsWith('text/') ||
         file.type.startsWith('image/');
};

/**
 * Get file size in human readable format
 */
export const getReadableFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Check if file size is within limits
 */
export const isFileSizeValid = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

export default {
  sendChatMessage,
  generateMessageId,
  createUserMessage,
  createAssistantMessage,
  isFileTypeSupported,
  getReadableFileSize,
  isFileSizeValid,
  MAX_FILE_SIZE,
};
