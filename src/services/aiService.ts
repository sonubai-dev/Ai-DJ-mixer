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
  tracks: {name: string, genre?: string}[]
): Promise<TrendRemixResponse | null> {
  if (!apiKey) return null;

  try {
    const trackList = tracks.map(t => `"${t.name}" (${t.genre || 'Unknown'})`).join(', ');
    
    const prompt = `
      You are a world-class Music Producer. Analyze: ${trackList}.
      Identify current viral trends and determine the best remix formula for a sharp, clear, and punchy sound.
      
      Return a JSON object:
      {
        "mode": "dj" | "slowed" | "3d" | "8d" | "16d" | "3d-dj" | "3d-slowed" | "8d-dj" | "8d-slowed" | "16d-dj" | "16d-slowed",
        "settings": {
          "bassBoost": number (0-20),
          "bass": number (-12 to 12),
          "treble": number (-12 to 12),
          "slowFactor": number (50-100),
          "reverbWet": number (0-100),
          "reverbSize": number (0-10),
          "panningSpeed": number (1-20),
          "crossfadeDuration": number (0-12),
          "aiMastering": true,
          "masteringHighEndBoost": number (1.0 to 4.0, e.g., 2.5 for sharp clarity),
          "masteringLowEndTighten": number (-5 to -1, e.g., -3.0 to remove mud),
          "masteringVocalPresence": number (1.0 to 4.0, e.g., 2.5 for vocal pop),
          "masteringLimiterThreshold": number (-2 to 0, e.g., -0.5 for loudness)
        },
        "explanation": "Brief 2-sentence explanation of why these settings make it sound sharp and viral.",
        "viralScore": number (0-100)
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
      Analyze song: "${filename}".
      Return JSON:
      {
        "bpm": number,
        "key": string,
        "genre": string,
        "mood": string,
        "instruments": string[],
        "suggestions": string[] (3 short bullet points for a sharp, clear remix)
      }
      No markdown.
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
