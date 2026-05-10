import { NextResponse } from 'next/server';

import { translationWorkspaceRequestSchema, runTranslationWorkspace } from '@/lib/translation';

export async function POST(request: Request): Promise<Response> {
  const seed = translationWorkspaceRequestSchema.parse((await request.json()) as unknown);
  const result = await runTranslationWorkspace(seed);

  return NextResponse.json(result);
}
