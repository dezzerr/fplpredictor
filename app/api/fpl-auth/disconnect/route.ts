import { retiredFplWriteSyncResponse } from '@/lib/fpl-sync-retired';

export async function POST() {
  return retiredFplWriteSyncResponse();
}
