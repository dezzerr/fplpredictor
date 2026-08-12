import { retiredFplWriteSyncResponse } from '@/lib/fpl-sync-retired';

export async function GET() {
  return retiredFplWriteSyncResponse();
}
