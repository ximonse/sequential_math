import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CloudSyncStatusPanel from './CloudSyncStatusPanel'

describe('teacher cloud sync status', () => {
  it('shows source, counts and the latest failure without calling refresh during render', () => {
    const onRefreshNow = vi.fn()
    const html = renderToStaticMarkup(<CloudSyncStatusPanel
      cloudSyncStatus={{
        lastAttemptAt: 100,
        lastSuccessAt: 0,
        lastError: 'Nätverksfel',
        lastSource: 'cloud_fetch_error',
        localCount: 2,
        cloudCount: 0,
        mergedCount: 0
      }}
      isCloudRefreshBusy={false}
      onRefreshNow={onRefreshNow}
      formatSyncTimestamp={value => `tid:${value}`}
      getCloudSyncSourceLabel={value => `källa:${value}`}
    />)

    expect(html).toContain('Synkproblem')
    expect(html).toContain('2 / 0 / 0')
    expect(html).toContain('Nätverksfel')
    expect(onRefreshNow).not.toHaveBeenCalled()
  })
})
