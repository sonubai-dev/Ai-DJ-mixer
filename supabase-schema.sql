-- Database Schema for AI DJ Mixer

-- 1. Profiles table to track daily limits
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  daily_count INTEGER DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT NOW(),
  email TEXT
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. Mixes table to track generated songs and payment status
-- Note: Existing table might already have name, mode, settings, tracks
CREATE TABLE IF NOT EXISTS mixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  mode TEXT,
  settings JSONB,
  tracks JSONB,
  unlocked BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on mixes
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;

-- Mixes Policies
CREATE POLICY "Users can view their own mixes" ON mixes
  FOR SELECT USING (auth.uid() = "userId");

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
