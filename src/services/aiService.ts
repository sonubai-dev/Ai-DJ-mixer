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
    const isMashup = tracks.length > 1;

    const prompt = `
      You are a professional DJ and Music Producer expert in Indian and Global music trends.
      Analyze the following song(s): ${trackList}.
      
      ${isMashup 
        ? 'Since there are multiple songs, suggest the best "Mashup" settings to blend them perfectly.' 
        : `Search your knowledge for top-performing, viral remixes of this song or similar songs in this genre/language on YouTube. 
           Identify the specific "winning formula" used in those hits (e.g., heavy bass boost, specific slowed+reverb ratio, or lofi vibe). 
           Apply those exact stylistic elements (beat, bass, slowed & reverb settings) to THIS song to recreate that viral success.
           Consider top-performing songs in every category and language to find the best match.`}

      Return a JSON object with the following structure:
      {
        "mode": "${isMashup ? 'mashup' : 'dj" | "slowed" | "mashup'}",
        "settings": {
          "bassBoost": number (0-20),
          "echoDelay": number (0-1000),
          "echoFeedback": number (0-100),
          "slowFactor": number (50-100),
          "reverbWet": number (0-100),
          "reverbSize": number (0-10),
          "crossfadeDuration": number (0-10)
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
    console.error("AI Trend Analysis Error:", error);
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

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (!apiKey) return "API Key missing";

  try {
    // Convert Blob to Base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(audioBlob);
    const base64Data = await base64Promise;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || "audio/wav",
              data: base64Data
            }
          },
          {
            text: "Transcribe this audio. If it's a song, write down the lyrics. If it's speech, transcribe the speech."
          }
        ]
      }
    });

    return response.text?.trim() || "Transcription failed";
  } catch (error) {
    console.error("AI Transcription Error:", error);
    return "Error transcribing audio";
  }
}
