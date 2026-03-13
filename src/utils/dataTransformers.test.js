import { dedupeProjectHistory } from './dataTransformers';

describe('dedupeProjectHistory', () => {
  it('collapses duplicate events with nearly identical timestamps', () => {
    const history = [
      { type: 'invoiceGenerated', date: '2026-03-12T10:00:00.000Z' },
      { id: 'event-1', type: 'invoiceGenerated', date: '2026-03-12T10:00:01.200Z' }
    ];

    expect(dedupeProjectHistory(history)).toEqual([
      { id: 'event-1', type: 'invoiceGenerated', date: '2026-03-12T10:00:01.200Z' }
    ]);
  });

  it('keeps distinct events when the timestamps are meaningfully different', () => {
    const history = [
      { id: 'event-1', type: 'sent', date: '2026-03-12T10:00:00.000Z' },
      { id: 'event-2', type: 'sent', date: '2026-03-12T10:00:05.000Z' }
    ];

    expect(dedupeProjectHistory(history)).toEqual(history);
  });

  it('ignores malformed history items', () => {
    const history = [
      null,
      { foo: 'bar' },
      { id: 'event-1', type: 'created', date: '2026-03-12T10:00:00.000Z' }
    ];

    expect(dedupeProjectHistory(history)).toEqual([
      { id: 'event-1', type: 'created', date: '2026-03-12T10:00:00.000Z' }
    ]);
  });
});
