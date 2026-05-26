/** @jest-environment node */

import { demoWorkspaceSeed } from '@/lib/demo-workspace';
import * as translationJobsModule from '@/lib/translation-jobs';

import { GET, POST } from './route';

jest.mock('next/server', () => {
  const actual = jest.requireActual<typeof import('next/server')>('next/server');

  return {
    ...actual,
    after: jest.fn((callback: () => void) => {
      callback();
    }),
  };
});

jest.mock('@/lib/translation-jobs', (): typeof import('@/lib/translation-jobs') => {
  const actual =
    jest.requireActual<typeof import('@/lib/translation-jobs')>('@/lib/translation-jobs');

  return {
    ...actual,
    createTranslationWorkspaceJob: jest.fn(),
    getTranslationWorkspaceJobStatus: jest.fn(),
    processTranslationWorkspaceJob: jest.fn(),
  };
});

describe('api/translate route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts a translation job and returns a queued response', async () => {
    const mockedCreateTranslationWorkspaceJob = jest.mocked(
      translationJobsModule.createTranslationWorkspaceJob,
    );
    const mockedProcessTranslationWorkspaceJob = jest.mocked(
      translationJobsModule.processTranslationWorkspaceJob,
    );

    mockedCreateTranslationWorkspaceJob.mockResolvedValue({
      jobId: 'job-123',
      status: 'queued',
      statusUrl: '/api/translate?jobId=job-123',
    });

    const response = await POST(
      new Request('http://localhost/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          ...demoWorkspaceSeed,
          provider: 'poe',
          model: 'Claude-Sonnet-4.5',
        }),
      }),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      jobId: 'job-123',
      status: 'queued',
      statusUrl: '/api/translate?jobId=job-123',
    });
    expect(mockedCreateTranslationWorkspaceJob).toHaveBeenCalledWith({
      ...demoWorkspaceSeed,
      provider: 'poe',
      model: 'Claude-Sonnet-4.5',
    });
    expect(mockedProcessTranslationWorkspaceJob).toHaveBeenCalledWith('job-123');
  });

  it('returns the job status payload', async () => {
    const mockedGetTranslationWorkspaceJobStatus = jest.mocked(
      translationJobsModule.getTranslationWorkspaceJobStatus,
    );

    mockedGetTranslationWorkspaceJobStatus.mockResolvedValue({
      jobId: 'job-123',
      status: 'completed',
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T10:02:00.000Z',
      result: {
        project: {
          title: demoWorkspaceSeed.title,
          contentType: demoWorkspaceSeed.contentType,
          targetLanguage: demoWorkspaceSeed.targetLanguage,
          styleProfile: demoWorkspaceSeed.styleProfile,
          progress: 100,
          segments: [],
          glossary: demoWorkspaceSeed.glossary,
          qaFindings: [],
          pipelineStages: [],
        },
        mode: 'openai' as const,
        warnings: [],
      },
    });

    const response = await GET(
      new Request('http://localhost/api/translate?jobId=job-123', {
        method: 'GET',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      jobId: 'job-123',
      status: 'completed',
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T10:02:00.000Z',
      result: {
        project: {
          title: demoWorkspaceSeed.title,
          contentType: demoWorkspaceSeed.contentType,
          targetLanguage: demoWorkspaceSeed.targetLanguage,
          styleProfile: demoWorkspaceSeed.styleProfile,
          progress: 100,
          segments: [],
          glossary: demoWorkspaceSeed.glossary,
          qaFindings: [],
          pipelineStages: [],
        },
        mode: 'openai',
        warnings: [],
      },
    });
    expect(mockedGetTranslationWorkspaceJobStatus).toHaveBeenCalledWith('job-123');
  });
});
