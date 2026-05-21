import { NextResponse } from 'next/server';

import { getModelOptions } from '@/lib/model-options';

export async function GET(): Promise<Response> {
  const options = await getModelOptions();

  return NextResponse.json(options);
}
