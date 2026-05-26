import { env } from './env';
import {
  isTranslationWorkspaceResponse,
  type TranslationJobStatus,
  type TranslationWorkspaceJobSnapshot,
  type TranslationWorkspaceJobStartResponse,
} from './translation-job-shared';
import type { TranslationWorkspaceSeed } from './workspace';

export type TranslationWorkspaceJobRecord = {
  jobId: string;
  status: TranslationJobStatus;
  createdAt: string;
  updatedAt: string;
  request: TranslationWorkspaceSeed & {
    provider?: 'openai' | 'poe';
    model?: string;
  };
  result?: unknown;
  error?: string;
};

const translationJobBlobPrefix = 'translation-jobs';

// This module is the job boundary for long-running translations:
// - the route writes a queued job record and returns immediately
// - the worker updates the record to running/completed/failed
// - the client polls the public snapshot without importing server-only code
type InMemoryTranslationJobStore = Map<string, string>;

function getInMemoryTranslationJobStore(): InMemoryTranslationJobStore {
  const globalScope = globalThis as typeof globalThis & {
    __translationJobStore?: InMemoryTranslationJobStore;
  };

  if (!globalScope.__translationJobStore) {
    globalScope.__translationJobStore = new Map<string, string>();
  }

  return globalScope.__translationJobStore;
}

function getTranslationJobPath(jobId: string): string {
  return `${translationJobBlobPrefix}/${jobId}.json`;
}

function isBlobStorageConfigured(): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN);
}

function toIsoTimestamp(value: number | Date = Date.now()): string {
  return typeof value === 'number' ? new Date(value).toISOString() : value.toISOString();
}

function createJobId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toPublicSnapshot(record: TranslationWorkspaceJobRecord): TranslationWorkspaceJobSnapshot {
  const snapshot: TranslationWorkspaceJobSnapshot = {
    jobId: record.jobId,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  if (record.result !== undefined && isTranslationWorkspaceResponse(record.result)) {
    snapshot.result = record.result;
  }

  if (record.error !== undefined) {
    snapshot.error = record.error;
  }

  return snapshot;
}

function writeTranslationJobRecord(record: TranslationWorkspaceJobRecord): Promise<void> | void {
  const serialized = JSON.stringify(record);

  if (!isBlobStorageConfigured()) {
    getInMemoryTranslationJobStore().set(record.jobId, serialized);

    return;
  }

  return import('@vercel/blob').then(async ({ put }) => {
    await put(getTranslationJobPath(record.jobId), serialized, {
      access: 'private',
      contentType: 'application/json',
      token: env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
      addRandomSuffix: false,
    });
  });
}

function readTranslationJobRecordSync(jobId: string): TranslationWorkspaceJobRecord | null {
  if (!isBlobStorageConfigured()) {
    const raw = getInMemoryTranslationJobStore().get(jobId);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as TranslationWorkspaceJobRecord;
  }

  return null;
}

async function readTranslationJobRecord(
  jobId: string,
): Promise<TranslationWorkspaceJobRecord | null> {
  if (!isBlobStorageConfigured()) {
    return readTranslationJobRecordSync(jobId);
  }

  const { get } = await import('@vercel/blob');

  const result = await get(getTranslationJobPath(jobId), {
    access: 'private',
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  if (!result || result.stream === null) {
    return null;
  }

  const raw = await new Response(result.stream).text();

  return JSON.parse(raw) as TranslationWorkspaceJobRecord;
}

export async function createTranslationWorkspaceJob(
  request: TranslationWorkspaceSeed & {
    provider?: 'openai' | 'poe';
    model?: string;
  },
): Promise<TranslationWorkspaceJobStartResponse> {
  const jobId = createJobId();
  const now = toIsoTimestamp();

  const writeResult = writeTranslationJobRecord({
    jobId,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    request,
  });

  if (writeResult) {
    await writeResult;
  }

  return {
    jobId,
    status: 'queued',
    statusUrl: `/api/translate?jobId=${encodeURIComponent(jobId)}`,
  };
}

export async function getTranslationWorkspaceJobStatus(
  jobId: string,
): Promise<TranslationWorkspaceJobSnapshot | null> {
  const record = await readTranslationJobRecord(jobId);

  if (!record) {
    return null;
  }

  return toPublicSnapshot(record);
}

export async function cancelTranslationWorkspaceJob(
  jobId: string,
): Promise<TranslationWorkspaceJobSnapshot | null> {
  const record = isBlobStorageConfigured()
    ? await readTranslationJobRecord(jobId)
    : readTranslationJobRecordSync(jobId);

  if (!record) {
    return null;
  }

  if (record.status === 'completed' || record.status === 'failed' || record.status === 'canceled') {
    return toPublicSnapshot(record);
  }

  const canceledRecord: TranslationWorkspaceJobRecord = {
    ...record,
    status: 'canceled',
    updatedAt: toIsoTimestamp(),
    error: undefined,
    result: undefined,
  };

  const writeResult = writeTranslationJobRecord(canceledRecord);

  if (writeResult) {
    await writeResult;
  }

  return toPublicSnapshot(canceledRecord);
}

export async function processTranslationWorkspaceJob(jobId: string): Promise<void> {
  const record = isBlobStorageConfigured()
    ? await readTranslationJobRecord(jobId)
    : readTranslationJobRecordSync(jobId);

  if (!record) {
    return;
  }

  const latestRecord = isBlobStorageConfigured()
    ? await readTranslationJobRecord(jobId)
    : readTranslationJobRecordSync(jobId);

  if (!latestRecord || latestRecord.status === 'canceled') {
    return;
  }

  const runningWriteResult = writeTranslationJobRecord({
    ...latestRecord,
    status: 'running',
    updatedAt: toIsoTimestamp(),
  });

  if (runningWriteResult) {
    await runningWriteResult;
  }

  try {
    const { runTranslationWorkspace } = await import('./translation-provider');
    const result = await runTranslationWorkspace(latestRecord.request);
    const latestCompletedRecord = isBlobStorageConfigured()
      ? await readTranslationJobRecord(jobId)
      : readTranslationJobRecordSync(jobId);

    if (!latestCompletedRecord || latestCompletedRecord.status !== 'running') {
      return;
    }

    const completedWriteResult = writeTranslationJobRecord({
      ...latestCompletedRecord,
      status: 'completed',
      updatedAt: toIsoTimestamp(),
      result,
      error: undefined,
    });

    if (completedWriteResult) {
      await completedWriteResult;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const latestFailedRecord = isBlobStorageConfigured()
      ? await readTranslationJobRecord(jobId)
      : readTranslationJobRecordSync(jobId);

    if (!latestFailedRecord || latestFailedRecord.status !== 'running') {
      return;
    }

    const failedWriteResult = writeTranslationJobRecord({
      ...latestFailedRecord,
      status: 'failed',
      updatedAt: toIsoTimestamp(),
      error: message,
    });

    if (failedWriteResult) {
      await failedWriteResult;
    }
  }
}
