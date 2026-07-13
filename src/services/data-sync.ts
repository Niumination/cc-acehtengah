// ─── Background Sync: tarik data dari SPLP → simpan ke DatasetRecord ───

import { prisma } from '@/lib/prisma';
import { fetchFromSplp, SAPA_DATASET_MAP } from '@/lib/splp-bridge';

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function syncDataset(datasetSlug: string) {
  const dataset = await prisma.dataset.findUnique({ where: { slug: datasetSlug } });
  if (!dataset) throw new Error(`Dataset ${datasetSlug} not found`);

  const splpEndpoint = SAPA_DATASET_MAP[datasetSlug as keyof typeof SAPA_DATASET_MAP];
  if (!splpEndpoint) throw new Error(`No SPLP mapping for ${datasetSlug}`);

  const result = await fetchFromSplp(splpEndpoint);

  if (result.status === 'ok') {
    await prisma.datasetRecord.create({
      data: {
        datasetId: dataset.id,
        data: result.data,
        periode: getCurrentPeriod(),
        checksum: result.meta?.checksum,
      },
    });

    await prisma.dataset.update({
      where: { id: dataset.id },
      data: { lastSync: new Date() },
    });
  }
}

export async function syncAllDatasets() {
  const datasets = await prisma.dataset.findMany({ where: { isActive: true } });
  const results: { slug: string; status: 'ok' | 'error'; error?: string }[] = [];

  for (const ds of datasets) {
    try {
      await syncDataset(ds.slug);
      results.push({ slug: ds.slug, status: 'ok' });
    } catch (err) {
      results.push({
        slug: ds.slug,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
