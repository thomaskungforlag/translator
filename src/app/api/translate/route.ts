import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  createTranslationWorkspaceJob,
  getTranslationWorkspaceJobStatus,
  processTranslationWorkspaceJob,
} from '@/lib/translation-jobs';
import { translationWorkspaceRequestSchema } from '@/lib/translation';

function readJobIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId')?.trim();

  return jobId && jobId.length > 0 ? jobId : null;
}

// POST starts a queued translation job and returns immediately with the job id.
export async function POST(request: Request): Promise<Response> {
  try {
    const seed = translationWorkspaceRequestSchema.parse((await request.json()) as unknown);
    const job = await createTranslationWorkspaceJob(seed);

    after(() => {
      void processTranslationWorkspaceJob(job.jobId);
    });

    return NextResponse.json(job, { status: 202 });
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

// GET serves the current persisted job snapshot for browser polling.
export async function GET(request: Request): Promise<Response> {
  try {
    const jobId = readJobIdFromRequest(request);

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId query parameter.' }, { status: 400 });
    }

    const status = await getTranslationWorkspaceJobStatus(jobId);

    if (!status) {
      return NextResponse.json({ error: 'Translation job not found.' }, { status: 404 });
    }

    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[api/translate] unexpected status route failure', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({ error: 'Translation status lookup failed.' }, { status: 500 });
  }
}
