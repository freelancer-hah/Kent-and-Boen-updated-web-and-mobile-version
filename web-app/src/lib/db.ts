import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Supabase Client for cloud integration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dkoobjtqtfswxpvnxoss.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_0WFpPyG_fFkek3ldK87pkg_q1wu4nYq';
export const supabase = createClient(supabaseUrl, supabaseKey);

// Local high-speed SQLite database engine (fallback & instant offline calculation)
let localDb: DatabaseSync | null = null;

export function getLocalDb(): DatabaseSync {
  if (localDb) return localDb;

  // Resolve DB path
  const dbPath = path.resolve(process.cwd(), 'data', 'repertory.db');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at ${dbPath}`);
  }

  localDb = new DatabaseSync(dbPath);
  return localDb;
}

export interface Category {
  cat_id: number;
  name: string;
}

export interface Symptom {
  sym_id: number;
  cat_id: number;
  category_name?: string;
  name_en: string;
  name_ur: string;
  remedy_count?: number;
}

export interface RepertorizationRemedy {
  rem_id: number;
  name: string;
  shortcut: string | null;
  grade: number;
  matched: number;
  percent: number;
  weights: Record<number, number>; // sym_id -> weight
}

export interface RepertorizationResult {
  remedies: RepertorizationRemedy[];
  totalSymptoms: number;
  matchedRemediesCount: number;
  durationMs: number;
}

// 1. Get Categories (Chapters)
export function getCategories(repertoryId: number = 1): Category[] {
  const db = getLocalDb();
  const rows = db.prepare(`
    SELECT cat_id, name 
    FROM categories 
    WHERE repertory_id = ? 
    ORDER BY name ASC
  `).all(repertoryId) as unknown as Category[];
  return rows;
}

// 2. Search Symptoms (English & Urdu support)
export function searchSymptoms(
  repertoryId: number = 1,
  query: string = '',
  categoryId?: number,
  limit: number = 100
): Symptom[] {
  const db = getLocalDb();
  const trimmed = query.trim();

  let sql = `
    SELECT s.sym_id, s.cat_id, c.name as category_name, s.name_en, s.name_ur,
           (SELECT count(*) FROM remedy_symptoms rs WHERE rs.repertory_id = s.repertory_id AND rs.sym_id = s.sym_id) as remedy_count
    FROM symptoms s
    LEFT JOIN categories c ON c.repertory_id = s.repertory_id AND c.cat_id = s.cat_id
    WHERE s.repertory_id = ?
  `;
  const params: (number | string)[] = [repertoryId];

  if (categoryId && categoryId > 0) {
    sql += ` AND s.cat_id = ?`;
    params.push(categoryId);
  }

  if (trimmed) {
    // Multi-term AND search
    const words = trimmed.split(/\s+/).filter(Boolean);
    for (const w of words) {
      sql += ` AND (s.name_en LIKE ? OR s.name_ur LIKE ?)`;
      params.push(`%${w}%`, `%${w}%`);
    }
  }

  sql += ` ORDER BY s.name_en ASC LIMIT ?`;
  params.push(limit);

  return db.prepare(sql).all(...params) as unknown as Symptom[];
}

// 3. Perform Repertorization Matrix Calculation
export function calculateRepertorization(
  repertoryId: number = 1,
  symIds: number[],
  intensityWeights: Record<number, number> = {}
): RepertorizationResult {
  const t0 = performance.now();
  if (!symIds || symIds.length === 0) {
    return { remedies: [], totalSymptoms: 0, matchedRemediesCount: 0, durationMs: 0 };
  }

  const db = getLocalDb();
  const placeholders = symIds.map(() => '?').join(',');

  // Query all rubric weights for chosen symptoms
  const weightRows = db.prepare(`
    SELECT rs.sym_id, rs.rem_id, rs.weight, r.name, r.shortcut
    FROM remedy_symptoms rs
    JOIN remedies r ON r.repertory_id = rs.repertory_id AND r.rem_id = rs.rem_id
    WHERE rs.repertory_id = ? AND rs.sym_id IN (${placeholders})
  `).all(repertoryId, ...symIds) as unknown as {
    sym_id: number;
    rem_id: number;
    weight: number;
    name: string;
    shortcut: string | null;
  }[];

  // Aggregate by remedy
  const remedyMap = new Map<number, {
    rem_id: number;
    name: string;
    shortcut: string | null;
    grade: number;
    matched: number;
    weights: Record<number, number>;
  }>();

  for (const row of weightRows) {
    let entry = remedyMap.get(row.rem_id);
    if (!entry) {
      entry = {
        rem_id: row.rem_id,
        name: row.name,
        shortcut: row.shortcut,
        grade: 0,
        matched: 0,
        weights: {},
      };
      remedyMap.set(row.rem_id, entry);
    }
    const mult = intensityWeights[row.sym_id] || 1;
    const effectiveWeight = row.weight * mult;
    entry.grade += effectiveWeight;
    entry.matched += 1;
    entry.weights[row.sym_id] = row.weight;
  }

  const allRemedies = Array.from(remedyMap.values());
  const maxGrade = allRemedies.reduce((max, r) => Math.max(max, r.grade), 0);

  // Sort by highest grade, then highest matched symptoms count
  allRemedies.sort((a, b) => {
    if (b.grade !== a.grade) return b.grade - a.grade;
    if (b.matched !== a.matched) return b.matched - a.matched;
    return a.name.localeCompare(b.name);
  });

  const remedies: RepertorizationRemedy[] = allRemedies.map((r) => ({
    ...r,
    percent: maxGrade > 0 ? Math.round((r.grade / maxGrade) * 100) : 0,
  }));

  const t1 = performance.now();
  return {
    remedies,
    totalSymptoms: symIds.length,
    matchedRemediesCount: remedies.length,
    durationMs: Number((t1 - t0).toFixed(2)),
  };
}

// 4. Get Remedy Details & Relationships (Materia Medica)
export function getRemedyDetails(repertoryId: number = 1, remId: number) {
  const db = getLocalDb();

  const remedy = db.prepare(`
    SELECT rem_id, name, shortcut, is_polychrest, symptom_count
    FROM remedies
    WHERE repertory_id = ? AND rem_id = ?
  `).get(repertoryId, remId) as {
    rem_id: number;
    name: string;
    shortcut: string | null;
    is_polychrest: number;
    symptom_count: number;
  } | undefined;

  if (!remedy) return null;

  // Relations (Antidotes, Complementary, Follows well, Incompatible)
  const relations = db.prepare(`
    SELECT rr.relation, t.rem_id, t.name, t.shortcut
    FROM remedy_relations rr
    JOIN remedies t ON t.repertory_id = rr.repertory_id AND t.rem_id = rr.target_rem_id
    WHERE rr.repertory_id = ? AND rr.rem_id = ?
    ORDER BY rr.relation, t.name
  `).all(repertoryId, remId) as {
    relation: string;
    rem_id: number;
    name: string;
    shortcut: string | null;
  }[];

  // Top prominent symptoms (Grade 3/4)
  const topSymptoms = db.prepare(`
    SELECT s.sym_id, s.name_en, s.name_ur, rs.weight, c.name as category_name
    FROM remedy_symptoms rs
    JOIN symptoms s ON s.repertory_id = rs.repertory_id AND s.sym_id = rs.sym_id
    LEFT JOIN categories c ON c.repertory_id = s.repertory_id AND c.cat_id = s.cat_id
    WHERE rs.repertory_id = ? AND rs.rem_id = ?
    ORDER BY rs.weight DESC, s.name_en ASC
    LIMIT 100
  `).all(repertoryId, remId) as {
    sym_id: number;
    name_en: string;
    name_ur: string;
    weight: number;
    category_name: string;
  }[];

  return {
    remedy,
    relations,
    topSymptoms,
  };
}

// 5. Remedies List for Browser
export function getRemediesList(repertoryId: number = 1, search: string = '', limit: number = 100) {
  const db = getLocalDb();
  let sql = `
    SELECT rem_id, name, shortcut, is_polychrest, symptom_count
    FROM remedies
    WHERE repertory_id = ?
  `;
  const params: (number | string)[] = [repertoryId];
  if (search.trim()) {
    sql += ` AND (name LIKE ? OR shortcut LIKE ?)`;
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  sql += ` ORDER BY name ASC LIMIT ?`;
  params.push(limit);

  return db.prepare(sql).all(...params);
}
