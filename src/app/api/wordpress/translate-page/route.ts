import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { env } from '@/lib/env';
import { wordPressTranslatePageRequestSchema } from '@/lib/wordpress-translation-schemas';
import { translateWordPressPage } from '@/lib/wordpress-translation';

const authHeaderName = 'x-translation-service-key';

function authorizeRequest(request: Request): Response | null {
  if (!env.WORDPRESS_TRANSLATION_API_KEY) {
    return NextResponse.json(
      { error: 'WordPress translation service key is not configured.' },
      { status: 503 },
    );
  }

  const requestKey = request.headers.get(authHeaderName)?.trim();

  if (!requestKey || requestKey !== env.WORDPRESS_TRANSLATION_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized translation request.' }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  const authError = authorizeRequest(request);

  if (authError) {
    return authError;
  }

  try {
    const payload = wordPressTranslatePageRequestSchema.parse((await request.json()) as unknown);
    const result = await translateWordPressPage(payload);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('[api/wordpress/translate-page] invalid request payload', {
        issues: error.issues,
      });

      return NextResponse.json(
        { error: 'Invalid WordPress translation request payload.' },
        { status: 400 },
      );
    }

    console.error('[api/wordpress/translate-page] unexpected route failure', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({ error: 'WordPress translation route failed.' }, { status: 500 });
  }
}
