import { NextRequest, NextResponse } from 'next/server';
import { runAiCompletion, AiConfig, DifferentialResult } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { selectedSymptoms = [], topRemedies = [], patientInfo = {}, config = { provider: 'gemini' } } = body;

    if (!topRemedies || topRemedies.length === 0) {
      return NextResponse.json({ error: 'No remedies available to perform differential analysis.' }, { status: 400 });
    }

    const topCandidates = topRemedies.slice(0, 5);
    const symptomsList = selectedSymptoms.map((s: { name_en: string; category_name?: string }) => `• [${s.category_name || 'General'}] ${s.name_en}`).join('\n');
    const remediesSummary = topCandidates.map((r: { name: string; grade: number; matched: number; percent: number }) => `• ${r.name}: Grade ${r.grade}, Matched ${r.matched} symptoms (${r.percent}%)`).join('\n');

    const hasKey = config.apiKey || process.env.GEMINI_API_KEY || (config.provider === 'ollama');
    let differentialData: DifferentialResult;

    if (hasKey) {
      try {
        const systemPrompt = `You are a world-renowned Professor of Classical Homeopathic Materia Medica and Repertorization.
Given a patient case with selected rubrics and top-scoring mathematical remedies, perform an expert differential analysis to determine the true Similimum.

Return ONLY a valid JSON object matching this schema:
{
  "similimum": {
    "remedyName": "String (Name of most indicated remedy)",
    "keynoteReasoning": "String (Explanation why this remedy best covers the totality, modalities, and mental state)"
  },
  "comparisons": [
    {
      "remedyName": "String",
      "indication": "String (Key symptoms in this case that favor this remedy)",
      "contraindicationOrDifferentia": "String (Why it falls short or how it differs from the chosen Similimum)",
      "score": Number (original grade score)
    }
  ],
  "potencyAdvice": {
    "suggestedPotency": "String (e.g. 30C, 200C, 1M, or 0/3 LM)",
    "posology": "String (e.g. Single dose on tongue, or 3 drops in water twice daily for 2 days)",
    "rationale": "String (Explanation based on Hahnemannian/Kentian vital force principles)"
  },
  "restrictions": ["String", "String"] (List of dietary & chemical antidotes to avoid, e.g. raw onions, coffee, camphor, mint)
}`;

        const userPrompt = `Patient Context: ${patientInfo.age ? `${patientInfo.gender || 'Patient'}, ${patientInfo.age} yrs.` : 'Adult Clinic Patient'}\n
Case Rubrics (${selectedSymptoms.length}):
${symptomsList || 'General acute consultation'}

Top Repertorized Remedies:
${remediesSummary}

Perform the differential analysis now.`;

        const responseText = await runAiCompletion(userPrompt, systemPrompt, config);
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        differentialData = JSON.parse(cleaned);
      } catch (aiErr) {
        console.warn('AI Differential fallback triggered:', (aiErr as Error).message);
        differentialData = generateHeuristicDifferential(topCandidates, selectedSymptoms);
      }
    } else {
      differentialData = generateHeuristicDifferential(topCandidates, selectedSymptoms);
    }

    return NextResponse.json({
      success: true,
      analysis: differentialData,
    });
  } catch (error) {
    console.error('API /api/ai/differential error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to generate differential analysis.' },
      { status: 500 }
    );
  }
}

/**
 * Intelligent classical heuristic generator when no API key is set
 */
function generateHeuristicDifferential(
  topCandidates: { name: string; grade: number; matched: number; percent: number }[],
  symptoms: { name_en: string; category_name?: string }[]
): DifferentialResult {
  const winner = topCandidates[0] || { name: 'Sulphur', grade: 10, matched: 3, percent: 100 };

  return {
    similimum: {
      remedyName: winner.name,
      keynoteReasoning: `${winner.name} ranks highest in the totality with ${winner.matched} matched rubrics and total weight of ${winner.grade}. It strongly covers both the general modalities and particular manifestations of the case.`,
    },
    comparisons: topCandidates.slice(0, 4).map((r, idx) => ({
      remedyName: r.name,
      indication: `Matched ${r.matched} rubrics with ${r.percent}% relative intensity weight.`,
      contraindicationOrDifferentia: idx === 0
        ? 'Best overall similimum fit across mental and physical totality.'
        : `Second-order consideration; verify modality reactions before substituting for ${winner.name}.`,
      score: r.grade,
    })),
    potencyAdvice: {
      suggestedPotency: symptoms.length > 5 ? '200C' : '30C',
      posology: 'Single dose (3-4 globule pills dry on tongue), followed by placebo (Sac Lac) and observation.',
      rationale: 'In accordance with Organon § 273-274, administer the single minimum dose and allow the vital reaction to unfold before repeating.',
    },
    restrictions: [
      'Avoid raw onions, garlic, and pungent spices 1 hour before and after dose',
      'Avoid strong black coffee and peppermint/menthol toothpastes',
      'Avoid topical camphor, eucalyptus, and strong essential oils (act as antidotes)',
    ],
  };
}
