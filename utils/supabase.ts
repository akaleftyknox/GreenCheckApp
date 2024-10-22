import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { getMimeType } from '@/utils/getMimeType'; // Ensure this path is correct

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase URL or Anon Key is missing. Check your .env.local file.');
}

const supabaseOptions: any = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
};

// Conditionally set storage based on platform
if (Platform.OS !== 'web') {
  // For native platforms, use AsyncStorage
  supabaseOptions.auth.storage = AsyncStorage;
} else {
  // For web, use default storage (localStorage)
  // Alternatively, implement a custom storage if needed
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  supabaseOptions
);