import { NextRequest, NextResponse } from 'next/server';
import { getLocalDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getLocalDb();
    const user = db.prepare(`
      SELECT id, username, email, doctor_name, degree, clinic_name, address, phone 
      FROM clinic_users 
      ORDER BY id ASC 
      LIMIT 1
    `).get();
    return NextResponse.json({ success: true, user: user || null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const db = getLocalDb();

    if (action === 'login') {
      const { identifier, password } = body;
      if (!identifier || !password) {
        return NextResponse.json({ success: false, error: 'Email/Username and password required' }, { status: 400 });
      }

      const user = db.prepare(`
        SELECT id, username, email, doctor_name, degree, clinic_name, address, phone, password
        FROM clinic_users
        WHERE (email = ? OR username = ?)
      `).get(identifier.trim(), identifier.trim()) as any;

      if (!user || user.password !== password) {
        return NextResponse.json({ success: false, error: 'Invalid username/email or password' }, { status: 401 });
      }

      const { password: _, ...safeUser } = user;
      return NextResponse.json({ success: true, user: safeUser, message: 'Login successful' });
    }

    if (action === 'register') {
      const { username, email, password, doctor_name, degree, clinic_name, address, phone } = body;
      if (!email || !password || !doctor_name) {
        return NextResponse.json({ success: false, error: 'Doctor name, email and password are required' }, { status: 400 });
      }

      // Check if exists
      const existing = db.prepare('SELECT id FROM clinic_users WHERE email = ? OR username = ?').get(email.trim(), username?.trim() || email.trim());
      if (existing) {
        return NextResponse.json({ success: false, error: 'Doctor account with this email or username already exists' }, { status: 400 });
      }

      const res = db.prepare(`
        INSERT INTO clinic_users (username, email, password, doctor_name, degree, clinic_name, address, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        username?.trim() || email.split('@')[0],
        email.trim(),
        password,
        doctor_name.trim(),
        degree?.trim() || 'B.H.M.S',
        clinic_name?.trim() || 'Homeopathic Clinic',
        address?.trim() || '',
        phone?.trim() || ''
      );

      const newUser = db.prepare(`
        SELECT id, username, email, doctor_name, degree, clinic_name, address, phone
        FROM clinic_users WHERE id = ?
      `).get(res.lastInsertRowid);

      return NextResponse.json({ success: true, user: newUser, message: 'Account created successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
