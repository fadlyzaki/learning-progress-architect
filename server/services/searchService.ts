import { GoogleGenAI } from '@google/genai';
import type { SearchLink } from '../types.ts';

export type SearchRequest = {
  query: string;
  maxResults?: number;
};

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

function extractHostname(uri: string): string | undefined {
  try {
    return new URL(uri).hostname;
  } catch {
    return undefined;
  }
}

function isHomepageRoot(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.pathname === '/' || url.pathname === '';
  } catch {
    return false;
  }
}

export async function searchLearningResources(input: SearchRequest): Promise<SearchLink[]> {
  if (!ai) {
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find authoritative learning resources for: ${input.query}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

    const seen = new Set<string>();
    const links: SearchLink[] = [];

    for (const chunk of chunks) {
      const uri: string | undefined = chunk?.web?.uri;
      const title: string | undefined = chunk?.web?.title;

      if (!uri || !title) continue;
      if (isHomepageRoot(uri)) continue;
      if (seen.has(uri)) continue;

      seen.add(uri);
      links.push({
        title,
        url: uri,
        source: extractHostname(uri),
      });
    }

    return links.slice(0, input.maxResults ?? 3);
  } catch {
    return [];
  }
}
