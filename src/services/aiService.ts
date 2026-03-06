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

export async function generateMashupPlan(
  currentTracks: { name: string; language?: string }[],
  userInstruction: string
): Promise<{
  recommendedSongs: string[];
  settings: RemixSettings;
  responseMessage: string;
}> {
  if (!apiKey) {
    return {
      recommendedSongs: [],
      settings: {
        bassBoost: 0,
        echoDelay: 0,
        echoFeedback: 0,
        slowFactor: 100,
        reverbWet: 0,
        reverbSize: 0,
        crossfadeDuration: 2
      },
      responseMessage: "API Key is missing. I cannot generate a plan."
    };
  }

  try {
    const prompt = `
      Act as a professional DJ and Music Curator.
      
      Current Playlist: ${JSON.stringify(currentTracks)}
      User Instructions: "${userInstruction}"
      
      Task:
      1. Analyze the current playlist and user instructions.
      2. Recommend 3-5 songs that would mix perfectly with the current tracks to create a seamless mashup/jukebox.
      3. Determine the best remix settings (speed, reverb, bass) based on the user's request (e.g., "slowed and reverb", "high energy").
      4. Provide a friendly, DJ-like response message explaining your choices.
      
      Output JSON format:
      {
        "recommendedSongs": ["Song Name - Artist", "Song Name - Artist"],
        "settings": {
          "bassBoost": number (0-20),
          "echoDelay": number (0-1000),
          "echoFeedback": number (0-100),
          "slowFactor": number (50-150, where 100 is normal speed, <100 is slowed),
          "reverbWet": number (0-100),
          "reverbSize": number (0-10),
          "crossfadeDuration": number (0-10)
        },
        "responseMessage": "Your message here..."
      }
      Do not include markdown formatting. Just the JSON string.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
    });

    const text = response.text?.trim().replace(/```json|```/g, '') || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating mashup plan:', error);
    return {
      recommendedSongs: [],
      settings: {
        bassBoost: 0,
        echoDelay: 0,
        echoFeedback: 0,
        slowFactor: 100,
        reverbWet: 0,
        reverbSize: 0,
        crossfadeDuration: 2
      },
      responseMessage: "Sorry, I couldn't generate a plan right now."
    };
  }
}
