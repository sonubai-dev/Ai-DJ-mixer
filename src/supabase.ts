import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jkmldzubdfgyjvxvsxqf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprbWxkenViZGZneWp2eHZzeHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTIyMDIsImV4cCI6MjA4ODQ4ODIwMn0.R4J0-mePPRwp33wGxcVEL3WbjTI-80U-oGSQ716UVV8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
