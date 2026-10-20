# Kent & Boenninghausen Repertorization Web Application

A modern, high-performance web application for homeopathic doctors and practitioners, migrating and updating the classical Kent Repertory and Boenninghausen Repertory into an integrated digital system.

## Features

- **Classical Repertory Search**: Fast search across rubrics, sub-rubrics, and chapters from Kent and Boenninghausen repertories.
- **SQLite Repertory Database**: Comprehensive embedded SQLite database (`data/repertory.db`) containing categorized rubrics, symptoms, and remedies with their respective grade weights (1-4).
- **Interactive Repertorization Engine**: Real-time rubric addition, remedy matrix calculation, totality scoring, and comparative remedy analysis.
- **Patient Management & Visit History**: Cloud-synchronized patient profiles, consultation records, visit history, and prescription archiving via Supabase.
- **Modern Responsive Interface**: Clean, accessible UI designed for clinics and consultations on desktop and tablet viewports.

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Database (Repertory)**: SQLite (`better-sqlite3`)
- **Cloud Backend (Patients & Visits)**: Supabase
- **Styling**: Vanilla CSS & modern design tokens

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file based on `.env.example`:
```bash
cp .env.example .env.local
```
Update the Supabase credentials with your project URL and public anon key:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
web-app/
├── data/
│   └── repertory.db       # Embedded SQLite repertory database
├── public/                # Static assets & icons
├── src/
│   ├── app/
│   │   ├── api/           # Next.js API routes (symptoms, remedies, repertorize, etc.)
│   │   ├── globals.css    # Global stylesheet and theme tokens
│   │   ├── layout.tsx     # App layout
│   │   └── page.tsx       # Main clinical repertorization dashboard
│   ├── lib/
│   │   └── db.ts          # SQLite database connection & query helpers
│   └── types/             # TypeScript definitions
├── package.json
└── tsconfig.json
```
