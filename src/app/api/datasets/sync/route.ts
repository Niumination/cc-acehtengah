import { NextRequest, NextResponse } from 'next/server';
import { syncDataset, syncAllDatasets } from '@/services/data-sync';
import { handleApiError, successResponse } from '@/lib/error-handler';
import { z } from 'zod';

const SyncRequestSchema = z.object({
  slug: z.string().optional(),
  all: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SyncRequestSchema.parse(body);

    if (parsed.all) {
      const results = await syncAllDatasets();
      return NextResponse.json(successResponse(results));
    }

    if (parsed.slug) {
      await syncDataset(parsed.slug);
      return NextResponse.json(successResponse({ slug: parsed.slug, synced: true }));
    }

    return NextResponse.json(
      { success: false, error: 'Specify slug or all=true' },
      { status: 400 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
