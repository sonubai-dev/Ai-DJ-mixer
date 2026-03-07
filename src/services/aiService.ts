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
}

export async function getTrendBasedRemixSettings(tracks: {name: string, language?: string}[]): Promise<TrendRemixResponse | null> {
  if (!apiKey) return null;

  try {
    const trackList = tracks.map(t => `"${t.name}" (${t.language || 'Unknown'})`).join(', ');
    
    const prompt = `
      You are a professional DJ and Music Producer expert in Indian and Global music trends.
      Analyze the following song(s): ${trackList}.
      
      Search your knowledge for top-performing, viral remixes of this song or similar songs in this genre/language on YouTube. 
      Identify the specific "winning formula" used in those hits (e.g., heavy bass boost, specific slowed+reverb ratio, 8D audio effects, or lofi vibe). 
      Apply those exact stylistic elements (beat, bass, slowed & reverb, spatial panning) to THIS song to recreate that viral success.
      Consider top-performing songs in every category and language to find the best match.

      Return a JSON object with the following structure:
      {
        "mode": "dj" | "slowed" | "3d" | "8d" | "16d" | "3d-dj" | "3d-slowed" | "8d-dj" | "8d-slowed" | "16d-dj" | "16d-slowed",
        "settings": {
          "bassBoost": number (0-20),
          "echoDelay": number (0-1000),
          "echoFeedback": number (0-100),
          "slowFactor": number (50-100),
          "reverbWet": number (0-100),
          "reverbSize": number (0-10),
          "panningSpeed": number (1-20)
        },
        "explanation": "A short sentence explaining why you chose these settings based on the song's vibe and current trends."
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

export async function generateDJTitle(language: string, mode: string): Promise<string> {
  if (!apiKey) return "Indian DJ Mix";

  try {
    const prompt = `Generate a cool, energetic, and fun DJ mix title for a ${language} song remix in ${mode} style. 
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
