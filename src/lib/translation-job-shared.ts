import type { TranslationWorkspaceResponse } from './translation-provider-utils';

export type TranslationJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

export type TranslationWorkspaceJobSnapshot = {
  jobId: string;
  status: TranslationJobStatus;
  createdAt: string;
  updatedAt: string;
  result?: TranslationWorkspaceResponse;
  error?: string;
};

export type TranslationWorkspaceJobStartResponse = {
  jobId: string;
  status: TranslationJobStatus;
  statusUrl: string;
};

function isTranslationJobStatus(value: unknown): value is TranslationJobStatus {
  return (
    value === 'queued' ||
    value === 'running' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'canceled'
  );
}

export function isTranslationWorkspaceResponse(
  value: unknown,
): value is TranslationWorkspaceResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.project !== undefined &&
    (record.mode === 'openai' || record.mode === 'poe' || record.mode === 'fallback') &&
    Array.isArray(record.warnings)
  );
}

export function parseTranslationWorkspaceJobSnapshot(
  value: unknown,
): TranslationWorkspaceJobSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.jobId !== 'string' ||
    !isTranslationJobStatus(record.status) ||
    typeof record.createdAt !== 'string' ||
    typeof record.updatedAt !== 'string'
  ) {
    return null;
  }

  if (record.error !== undefined && typeof record.error !== 'string') {
    return null;
  }

  if (
    record.result !== undefined &&
    (typeof record.result !== 'object' || record.result === null)
  ) {
    return null;
  }

  const snapshot: TranslationWorkspaceJobSnapshot = {
    jobId: record.jobId,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  if (record.result !== undefined && isTranslationWorkspaceResponse(record.result)) {
    snapshot.result = record.result;
  }

  if (typeof record.error === 'string') {
    snapshot.error = record.error;
  }

  return snapshot;
}
