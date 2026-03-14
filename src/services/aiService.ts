import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
// Note: The API key is injected via Vite define in vite.config.ts
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

import { RemixSettings, RemixMode } from '../types';

export interface TrendRemixResponse {
  mode: RemixMode;
  settings: RemixSettings;
  explanation: string;
  viralScore?: number;
}

export interface SongStructureAnalysis {
  bpm: number;
  key: string;
  genre: string;
  mood: string;
  instruments: string[];
  suggestions: string[];
}

export async function getTrendBasedRemixSettings(
  tracks: {name: string, genre?: string}[], 
  plan: 'free' | 'pro' | 'studio' = 'free'
): Promise<TrendRemixResponse | null> {
  if (!apiKey) return null;

  try {
    const trackList = tracks.map(t => `"${t.name}" (${t.genre || 'Unknown'})`).join(', ');
    
    // Tailor the prompt based on the plan
    let planContext = "";
    if (plan === 'free') {
      planContext = "Provide a standard, popular remix style suitable for general audiences.";
    } else if (plan === 'pro') {
      planContext = "Provide a high-quality, trending remix style with detailed parameter tuning for professional sound.";
    } else if (plan === 'studio') {
      planContext = "Provide an elite, studio-grade remix configuration. Analyze deep cuts and niche viral trends to create a unique, chart-topping sound. Maximize audio fidelity in your suggestions.";
    }

    const prompt = `
      You are a world-class Music Producer and DJ specializing in Indian regional music trends (Bhojpuri, Punjabi, Haryanvi, South Indian, etc.) and global viral sounds.
      
      Analyze the following song(s): ${trackList}.
      
      Your Task:
      1. Deeply analyze the metadata, genre, and likely sub-genre of these tracks.
      2. Identify current viral trends on Instagram Reels, YouTube Shorts, and Spotify Charts specifically for these genres in India.
      3. Determine the "winning formula" for a remix that would go viral right now (e.g., "Bhojpuri Lofi Flip", "Punjabi Drill Remix", "Haryanvi Hard Bass", "Slowed + Reverb with 8D spatial audio").
      4. ${planContext}
      
      Return a JSON object with this structure:
      {
        "mode": "dj" | "slowed" | "3d" | "8d" | "16d" | "3d-dj" | "3d-slowed" | "8d-dj" | "8d-slowed" | "16d-dj" | "16d-slowed",
        "settings": {
          "bassBoost": number (0-20),
          "echoDelay": number (0-1000),
          "echoFeedback": number (0-100),
          "slowFactor": number (50-100),
          "reverbWet": number (0-100),
          "reverbSize": number (0-10),
          "panningSpeed": number (1-20),
          "crossfadeDuration": number (0-12)
        },
        "explanation": "A comprehensive, professional explanation. Mention specific regional trends, why this mode fits the song's energy, and how the technical settings (like bass boost or reverb) enhance the specific cultural vibe of the track.",
        "viralScore": number (0-100, estimated viral potential based on current Indian social media data)
      }
      Do not include markdown formatting. Just the JSON string.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
    });

    const text = response.text?.trim().replace(/```json|```/g, '') || "{}";
    return JSON.parse(text) as TrendRemixResponse;
  } catch (error) {
    console.error("AI Trend Analysis Analysis Error:", error);
    return null;
  }
}

export async function analyzeSongStructure(filename: string): Promise<SongStructureAnalysis | null> {
  if (!apiKey) return null;

  try {
    const prompt = `
      Analyze the song structure and cultural context for: "${filename}".
      
      Provide a highly detailed analysis in a JSON object:
      {
        "bpm": number (estimated),
        "key": string (e.g., "C Minor"),
        "genre": string (be specific, e.g., "Bhojpuri Pop", "Punjabi Hip-Hop"),
        "mood": string,
        "instruments": string[] (list of dominant instruments, including traditional ones like Dhol, Tumbi, Harmonium if applicable),
        "suggestions": string[] (4-5 detailed bullet points on how to remix this track specifically for the Indian market, considering current viral styles)
      }
      Do not include markdown.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
    });

    const text = response.text?.trim().replace(/```json|```/g, '') || "{}";
    return JSON.parse(text) as SongStructureAnalysis;
  } catch (error) {
    console.error("AI Structure Analysis Error:", error);
    return null;
  }
}

export async function generateDJTitle(genre: string, mode: string): Promise<string> {
  if (!apiKey) return "Indian DJ Mix";

  try {
    const prompt = `Generate a cool, energetic, and fun DJ mix title for a ${genre} song remix in ${mode} style. 
    Keep it short (under 6 words). Use Indian DJ slang if appropriate (like 'Dhamaka', 'Blast', 'Vibe'). 
    Do not use quotes. Just the title.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
    });

    return response.text?.trim() || `Indian ${mode} Mix`;
  } catch (error) {
    console.error("AI Title Generation Error:", error);
    return `Indian ${mode} Mix`;
  }
}

export async function guessBPMFromMetadata(filename: string): Promise<number | null> {
  if (!apiKey) return null;

  try {
    const prompt = `Guess the BPM (Beats Per Minute) of the song with the filename or title: "${filename}". 
    Return ONLY the number. If you don't know, return "0". Do not write any text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
    });

    const text = response.text?.trim();
    const bpm = parseInt(text || "0");
    return bpm > 0 ? bpm : null;
  } catch (error) {
    console.error("AI BPM Guess Error:", error);
    return null;
  }
}
