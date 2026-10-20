import { NextRequest, NextResponse } from 'next/server';
import { searchSymptoms, Symptom } from '@/lib/db';
import { runAiCompletion, AiConfig, ExtractedRubricCandidate } from '@/lib/ai';

// Common Roman Urdu / Urdu Clinical Concepts mapped to Kent & Boenninghausen Repertory English rubrics
const CLINICAL_CONCEPT_DICTIONARY: { patterns: RegExp[]; rubrics: string[] }[] = [
  // Head & Headache Modalities
  {
    patterns: [/sar.*dhoop/i, /dhoop.*sar/i, /head.*sun/i],
    rubrics: ['Head, pain, sun, from exposure to', 'Head, pain, forehead, sunlight', 'Head, pain, occiput, sun, heat of', 'Head, pain, vertex, walking in the sun']
  },
  {
    patterns: [/thandi patti/i, /cold application/i, /sar.*thandi/i],
    rubrics: ['Head, pain, cold applications amel.', 'Head, pain, forehead, cold applications amel.', 'Head, pain, forehead, cold applications, hand amel.']
  },
  {
    patterns: [/sar.*dard/i, /sar me dard/i, /headache/i, /\bsar\b/i, /head pain/i],
    rubrics: ['Head, pain, morning', 'Head, pain, evening', 'Head, pain, forehead', 'Head, pain, temples', 'Head, pain, vertex']
  },
  // Stomach & Abdomen
  {
    patterns: [/pait.*dard/i, /stomach.*pain/i, /\bpait\b/i, /abdomen/i, /shikam/i],
    rubrics: ['Stomach, pain, burning', 'Stomach, pain, cramping', 'Abdomen, pain, cramping', 'Stomach, fullness, sensation of']
  },
  // Nausea & Vomiting
  {
    patterns: [/qay\b/i, /ulti\b/i, /vomit/i, /nausea/i, /matli/i],
    rubrics: ['Stomach, vomiting', 'Stomach, nausea', 'Stomach, vomiting, food', 'Stomach, nausea, headache, during']
  },
  // Fever & Chill
  {
    patterns: [/bukhar/i, /tap\b/i, /fever/i, /chill/i, /sardi/i],
    rubrics: ['Fever, heat in general', 'Chill, shivering', 'Fever, sun, exposure to, from', 'Fever, evening']
  },
  // Cough & Respiratory
  {
    patterns: [/khansi/i, /cough/i, /balgham/i, /seena/i, /chest/i],
    rubrics: ['Cough, dry', 'Cough, night', 'Cough, morning', 'Cough, cold air, in', 'Respiration, difficult']
  },
  // Mind / Mental Generals
  {
    patterns: [/ghussa/i, /gussa/i, /anger/i, /irritab/i],
    rubrics: ['Mind, anger, irascibility', 'Mind, irritability', 'Mind, violent']
  },
  {
    patterns: [/khauf/i, /dar\b/i, /fear/i, /anxiety/i, /tashweesh/i],
    rubrics: ['Mind, fear, death, of', 'Mind, anxiety', 'Mind, fear, crowd, in a', 'Mind, fear, alone, of being']
  },
  {
    patterns: [/bechain/i, /restless/i],
    rubrics: ['Mind, restlessness', 'Generals, restlessness']
  },
  {
    patterns: [/kamzor/i, /naqahat/i, /weakness/i, /debility/i, /prostrat/i],
    rubrics: ['Generalities, weakness, physical', 'Generalities, prostration of mind and body']
  },
  // Thirst & Modalities
  {
    patterns: [/pyas nahi/i, /thirstless/i, /bila pyas/i],
    rubrics: ['Stomach, thirstlessness', 'Fever, thirstlessness during']
  },
  {
    patterns: [/pyas\b/i, /pyaas\b/i, /thirst\b/i],
    rubrics: ['Stomach, thirst, extreme', 'Stomach, thirst, unquenchable']
  },
  {
    patterns: [/harkat.*barh/i, /motion agg/i],
    rubrics: ['Generalities, motion, from, agg.', 'Head, pain, motion, from, agg.']
  },
  {
    patterns: [/aaraam.*sakoon/i, /rest amel/i, /sukoon/i],
    rubrics: ['Generalities, rest, in, amel.', 'Head, pain, lying, amel.']
  }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const narrative = (body.narrative || '').trim();
    const repertoryId = Number(body.repertory_id) || 1;
    const config: AiConfig = body.config || { provider: 'gemini' };

    if (!narrative) {
      return NextResponse.json({ error: 'Please provide a clinical narrative or complaint.' }, { status: 400 });
    }

    let searchTerms: string[] = [];
    let isAi = false;
    let aiError: string | null = null;

    // Check if AI can be used
    const hasKey = config.apiKey || process.env.GEMINI_API_KEY || (config.provider === 'ollama');

    if (hasKey) {
      try {
        const systemPrompt = `You are an expert Classical Homeopath specializing in Kent's Repertory and Boenninghausen's Therapeutic Pocket Book.
Analyze the patient complaint provided in English, Urdu, or Roman Urdu (e.g. "sar me shadeed dard jo dhoop me barhta hai aur thandi patti se aaraam").

Translate the patient's totality into 3 to 6 English repertory search terms matching standard Kentian rubrics.

FEW-SHOT EXAMPLES:
Case 1: "3 din se sar me shadeed dard hai jo dhoop me barhta hai aur thandi patti se aaraam"
Output: ["Head pain sun", "Head pain cold applications", "Head pain heat"]

Case 2: "pait me shadeed dard, qay aur bechaini bohot hai"
Output: ["Stomach pain burning", "Stomach vomiting", "Mind restlessness"]

Case 3: "cough worse at night and cold air"
Output: ["Cough night", "Cough cold air", "Respiration difficult"]

CRITICAL: Return ONLY a valid JSON array of 3 to 6 concise English search strings:
["term1", "term2", "term3"]`;

        const responseText = await runAiCompletion(narrative, systemPrompt, config);
        
        // Extract JSON array using regex
        const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            searchTerms = parsed.map((s: unknown) => String(s).trim()).filter(Boolean);
            isAi = true;
          }
        }
      } catch (err: any) {
        console.warn('AI Rubric extraction error:', err.message);
        aiError = err.message;
      }
    }

    const candidatesMap = new Map<number, ExtractedRubricCandidate>();

    // 1. If AI returned search terms, query SQLite
    if (searchTerms.length > 0) {
      for (const term of searchTerms) {
        const matches = searchSymptoms(repertoryId, term, undefined, 8);
        for (const m of matches) {
          if (!candidatesMap.has(m.sym_id)) {
            candidatesMap.set(m.sym_id, {
              ...m,
              matchReason: `AI Totality match: "${term}"`,
              confidence: 'High',
            });
          }
        }
      }
    }

    // 2. Clinical Concept Dictionary matching (for Roman Urdu & English)
    // Runs to enrich or as fallback so the doctor ALWAYS gets accurate rubrics!
    for (const entry of CLINICAL_CONCEPT_DICTIONARY) {
      const isMatched = entry.patterns.some((pattern) => pattern.test(narrative));
      if (isMatched) {
        for (const rubricName of entry.rubrics) {
          // Exact rubric lookup or phrase search in SQLite
          const matches = searchSymptoms(repertoryId, rubricName, undefined, 4);
          for (const m of matches) {
            if (!candidatesMap.has(m.sym_id)) {
              candidatesMap.set(m.sym_id, {
                ...m,
                matchReason: `Matched clinical modality: "${rubricName}"`,
                confidence: 'High',
              });
            }
          }
        }
      }
    }

    const candidateList = Array.from(candidatesMap.values()).slice(0, 20);

    return NextResponse.json({
      success: true,
      source: isAi ? 'ai_gemini' : 'clinical_dictionary',
      searchTerms,
      aiError,
      rubrics: candidateList,
      totalMatches: candidateList.length,
    });
  } catch (error) {
    console.error('API /api/ai/rubrics error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to extract rubrics.' },
      { status: 500 }
    );
  }
}
