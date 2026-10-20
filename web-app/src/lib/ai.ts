/**
 * AI Clinical Assistant Service
 * Supports Google Gemini (Default), DeepSeek, and Local Ollama providers.
 */

export interface AiConfig {
  provider: 'gemini' | 'deepseek' | 'ollama';
  apiKey?: string;
  baseUrl?: string; // for custom Ollama or proxy
  model?: string;
}

export interface ExtractedRubricCandidate {
  sym_id: number;
  cat_id: number;
  category_name?: string;
  name_en: string;
  name_ur: string;
  remedy_count?: number;
  matchReason?: string;
  confidence?: 'High' | 'Medium' | 'Related';
}

export interface DifferentialResult {
  similimum: {
    remedyName: string;
    shortcut?: string;
    keynoteReasoning: string;
  };
  comparisons: {
    remedyName: string;
    indication: string;
    contraindicationOrDifferentia: string;
    score: number;
  }[];
  potencyAdvice: {
    suggestedPotency: string;
    posology: string; // repetition rule
    rationale: string;
  };
  restrictions: string[];
}

/**
 * Call Google Gemini REST API directly with automatic model fallback
 */
async function callGemini(prompt: string, systemInstruction: string, apiKey: string, preferredModel: string = 'gemini-1.5-flash'): Promise<string> {
  const modelsToTry = [preferredModel, 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'].filter(
    (m, i, arr) => arr.indexOf(m) === i
  );

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error (${response.status} on ${model}): ${errorText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
    } catch (err: any) {
      lastError = err;
      // If error is 404 (model not found), try the next model in the list
      if (err.message && err.message.includes('404')) {
        continue;
      }
      // For auth errors (400, 403), throw immediately so the user knows
      throw err;
    }
  }

  throw lastError || new Error('Gemini API call failed across all models.');
}

/**
 * Call OpenAI-compatible endpoint (DeepSeek / Ollama)
 */
async function callOpenAiCompatible(
  prompt: string,
  systemInstruction: string,
  config: AiConfig
): Promise<string> {
  const isOllama = config.provider === 'ollama';
  const defaultUrl = isOllama ? 'http://localhost:11434/v1/chat/completions' : 'https://api.deepseek.com/v1/chat/completions';
  const url = config.baseUrl || defaultUrl;
  const model = config.model || (isOllama ? 'llama3.1' : 'deepseek-chat');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${config.provider.toUpperCase()} API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Unified AI Completion Runner
 */
export async function runAiCompletion(
  prompt: string,
  systemInstruction: string,
  config: AiConfig
): Promise<string> {
  const provider = config.provider || 'gemini';
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (provider === 'gemini') {
    if (!apiKey) {
      throw new Error('MISSING_API_KEY: Please provide a Gemini API Key in settings or GEMINI_API_KEY in .env.local');
    }
    return callGemini(prompt, systemInstruction, apiKey, config.model || 'gemini-2.0-flash');
  }

  return callOpenAiCompatible(prompt, systemInstruction, config);
}
