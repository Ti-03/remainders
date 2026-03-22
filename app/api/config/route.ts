import { NextRequest, NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/lib/storage';

export async function GET() {
  const config = await readConfig();
  return NextResponse.json({ data: config, error: null });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await writeConfig(body);
    return NextResponse.json({ success: true, error: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
