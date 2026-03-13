import { normalizeProjectPhotos } from './projectPhotos';

describe('normalizeProjectPhotos', () => {
  it('parses legacy arrays of JSON strings', () => {
    const photos = normalizeProjectPhotos([
      JSON.stringify({
        id: 123,
        url: 'data:image/jpeg;base64,abc',
        name: 'legacy.jpg'
      })
    ]);

    expect(photos).toEqual([
      {
        id: '123',
        url: 'data:image/jpeg;base64,abc',
        name: 'legacy.jpg',
        type: 'image'
      }
    ]);
  });

  it('normalizes stringified arrays from the database', () => {
    const photos = normalizeProjectPhotos(JSON.stringify([
      {
        id: 'file-1',
        url: 'data:application/pdf;base64,abc',
        name: 'quote.pdf'
      }
    ]));

    expect(photos).toEqual([
      {
        id: 'file-1',
        url: 'data:application/pdf;base64,abc',
        name: 'quote.pdf',
        type: 'pdf'
      }
    ]);
  });
});
