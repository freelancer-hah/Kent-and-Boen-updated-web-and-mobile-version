import { NextRequest, NextResponse } from 'next/server';
import { getLocalDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patient_id,
      repertory_id,
      complaint,
      symptoms_json,
      prescribed_remedy,
      potency,
      dosage,
      notes,
    } = body;

    if (!patient_id) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }

    const db = getLocalDb();
    const res = db.prepare(`
      INSERT INTO patient_visits (
        patient_id, repertory_id, complaint, symptoms_json, prescribed_remedy, potency, dosage, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(patient_id),
      Number(repertory_id || 1),
      complaint || '',
      typeof symptoms_json === 'string' ? symptoms_json : JSON.stringify(symptoms_json || []),
      prescribed_remedy || '',
      potency || '30C',
      dosage || '',
      notes || ''
    );

    return NextResponse.json({
      success: true,
      visitId: res.lastInsertRowid,
      message: 'Consultation visit recorded successfully',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
