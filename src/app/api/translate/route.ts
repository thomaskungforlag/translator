import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { translationWorkspaceRequestSchema, runTranslationWorkspace } from '@/lib/translation';

export async function POST(request: Request): Promise<Response> {
  try {
    const seed = translationWorkspaceRequestSchema.parse((await request.json()) as unknown);
    const result = await runTranslationWorkspace(seed);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('[api/translate] invalid request payload', {
        issues: error.issues,
      });

      return NextResponse.json({ error: 'Invalid translation request payload.' }, { status: 400 });
    }

    console.error('[api/translate] unexpected route failure', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({ error: 'Translation route failed.' }, { status: 500 });
  }
}
