/** @jest-environment node */

import { demoWorkspaceSeed } from './demo-workspace';

const ORIGINAL_ENV = process.env;

type TranslationProviderModule = typeof import('./translation-provider');

async function loadJobsModule() {
  jest.resetModules();

  return import('./translation-jobs');
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe('translation-jobs', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete (globalThis as typeof globalThis & { __translationJobStore?: Map<string, string> })
      .__translationJobStore;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
    delete (globalThis as typeof globalThis & { __translationJobStore?: Map<string, string> })
      .__translationJobStore;
  });

  it('stores a job and updates it after processing', async () => {
    const result = {
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
    };

    jest.doMock('./translation-provider', (): TranslationProviderModule => {
      const actual = jest.requireActual<TranslationProviderModule>('./translation-provider');

      return {
        ...actual,
        runTranslationWorkspace: jest.fn().mockResolvedValue(result),
      };
    });

    const {
      createTranslationWorkspaceJob,
      getTranslationWorkspaceJobStatus,
      processTranslationWorkspaceJob,
    } = await loadJobsModule();

    const job = await createTranslationWorkspaceJob({
      ...demoWorkspaceSeed,
      provider: 'openai',
      model: 'gpt-5-mini',
    });

    const queuedStatus = await getTranslationWorkspaceJobStatus(job.jobId);

    expect(queuedStatus?.jobId).toBe(job.jobId);
    expect(queuedStatus?.status).toBe('queued');
    expect(queuedStatus?.createdAt).toMatch(/.+/);
    expect(queuedStatus?.updatedAt).toMatch(/.+/);

    await processTranslationWorkspaceJob(job.jobId);

    const completedStatus = await getTranslationWorkspaceJobStatus(job.jobId);

    expect(completedStatus?.jobId).toBe(job.jobId);
    expect(completedStatus?.status).toBe('completed');
    expect(completedStatus?.createdAt).toMatch(/.+/);
    expect(completedStatus?.updatedAt).toMatch(/.+/);
    expect(completedStatus?.result).toEqual(result);
  });

  it('cancels a running job and preserves the canceled state after the worker finishes', async () => {
    const result = {
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
    };
    const deferred = createDeferred<typeof result>();

    jest.doMock('./translation-provider', (): TranslationProviderModule => {
      const actual = jest.requireActual<TranslationProviderModule>('./translation-provider');

      return {
        ...actual,
        runTranslationWorkspace: jest.fn().mockReturnValue(deferred.promise),
      };
    });

    const {
      cancelTranslationWorkspaceJob,
      createTranslationWorkspaceJob,
      getTranslationWorkspaceJobStatus,
      processTranslationWorkspaceJob,
    } = await loadJobsModule();

    const job = await createTranslationWorkspaceJob({
      ...demoWorkspaceSeed,
      provider: 'openai',
      model: 'gpt-5-mini',
    });

    const processingPromise = processTranslationWorkspaceJob(job.jobId);

    const canceledSnapshot = await cancelTranslationWorkspaceJob(job.jobId);

    expect(canceledSnapshot?.status).toBe('canceled');

    deferred.resolve(result);
    await processingPromise;

    const canceledStatus = await getTranslationWorkspaceJobStatus(job.jobId);

    expect(canceledStatus?.status).toBe('canceled');
    expect(canceledStatus?.result).toBeUndefined();
  });
});
