import { createClient } from '@supabase/supabase-js';

// Environment variables
const env = {
  // Webhook Configuration
  webhookUrl: import.meta.env.VITE_WEBHOOK_URL as string,
  webhookAuthHeader: import.meta.env.VITE_WEBHOOK_AUTH_HEADER as string,
  webhookAuthToken: import.meta.env.VITE_WEBHOOK_AUTH_TOKEN as string,

  // Speech Recognition Configuration
  speechRecognitionLanguage: import.meta.env.VITE_SPEECH_RECOGNITION_LANGUAGE as string,

  // Supabase Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
};

// Validate required environment variables
const requiredEnvVars = [
  'webhookUrl',
  'webhookAuthHeader',
  'webhookAuthToken',
  'supabaseUrl',
  'supabaseAnonKey',
] as const;

for (const key of requiredEnvVars) {
  if (!env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Create Supabase client
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

// Export configuration
export const config = {
  webhook: {
    url: env.webhookUrl,
    headers: {
      'Content-Type': 'application/json',
      [env.webhookAuthHeader]: env.webhookAuthToken,
    },
  },
  speech: {
    language: env.speechRecognitionLanguage || 'fr-FR',
  },
  supabase: {
    url: env.supabaseUrl,
    anonKey: env.supabaseAnonKey,
  },
} as const;