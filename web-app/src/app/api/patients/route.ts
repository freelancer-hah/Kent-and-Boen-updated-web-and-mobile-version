import { NextRequest, NextResponse } from 'next/server';
import { getLocalDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const patientId = searchParams.get('id');
    const db = getLocalDb();

    if (patientId) {
      const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(Number(patientId));
      if (!patient) {
        return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
      }
      const visits = db.prepare(`
        SELECT * FROM patient_visits WHERE patient_id = ? ORDER BY visited_at DESC
      `).all(Number(patientId));
      return NextResponse.json({ success: true, patient, visits });
    }

    let sql = 'SELECT * FROM patients';
    const params: string[] = [];
    if (search.trim()) {
      sql += ' WHERE name LIKE ? OR phone LIKE ? OR city LIKE ?';
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }
    sql += ' ORDER BY id DESC LIMIT 50';

    const patients = db.prepare(sql).all(...params);
    const doctor = db.prepare('SELECT * FROM clinic_users LIMIT 1').get() || null;

    return NextResponse.json({ success: true, patients, doctor });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getLocalDb();

    if (body.type === 'doctor_profile') {
      db.prepare(`
        UPDATE doctor_profile 
        SET name = ?, degree = ?, clinic_name = ?, address = ?, phone = ?, email = ?
        WHERE id = 1
      `).run(
        body.name || '',
        body.degree || '',
        body.clinic_name || '',
        body.address || '',
        body.phone || '',
        body.email || ''
      );
      return NextResponse.json({ success: true, message: 'Doctor profile updated' });
    }

    // New patient creation
    const { name, age, gender, phone, city, history } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Patient name is required' }, { status: 400 });
    }

    const res = db.prepare(`
      INSERT INTO patients (name, age, gender, phone, city, history)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name.trim(), age || '', gender || 'Male', phone || '', city || '', history || '');

    return NextResponse.json({
      success: true,
      patientId: res.lastInsertRowid,
      message: 'Patient registered successfully',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
