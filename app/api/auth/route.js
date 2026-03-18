// app/api/auth/route.js — No auth needed
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  // No auth system — everyone is local user
  return NextResponse.json({ user: { id: 'local-user-jarvis', email: 'local@jarvis.app' }, message: 'Local mode' });
}
export async function GET() {
  return NextResponse.json({ user: { id: 'local-user-jarvis' } });
}
