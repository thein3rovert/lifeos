import { afterEach, describe, expect, it, vi } from 'vitest';
import { agentApi } from '@/lib/api/agent';

describe('agentApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('serializes message contexts separately from visible content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await agentApi.sendMessage('conversation/1', 'Visible message', 'request-1', [
      {
        kind: 'card',
        panelType: 'suggestions',
        itemId: 'suggestion-1',
        label: 'Delegate reporting',
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/agent\/conversations\/conversation%2F1\/messages$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'Visible message',
          requestId: 'request-1',
          contexts: [
            {
              kind: 'card',
              panelType: 'suggestions',
              itemId: 'suggestion-1',
              label: 'Delegate reporting',
            },
          ],
          delivery: 'queue',
        }),
      })
    );
  });
});
