import { readOnlyFplSyncStatusResponse } from '@/lib/fpl-sync-retired'

export async function GET() {
  return readOnlyFplSyncStatusResponse()
}
