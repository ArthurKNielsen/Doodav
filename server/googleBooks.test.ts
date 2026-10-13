import { describe, expect, it } from 'vitest';
import { parseGoogleBooksResponse } from './googleBooks';

describe('parseGoogleBooksResponse', () => {
  const isbn = '9780306406157';

  it('returns null when Google Books has no match', () => {
    expect(parseGoogleBooksResponse({ totalItems: 0 }, isbn)).toBeNull();
  });

  it('builds a book card from the first volume', () => {
    const item = parseGoogleBooksResponse(
      {
        totalItems: 1,
        items: [
          {
            volumeInfo: {
              title: 'Example Book',
              authors: ['Jane Doe', 'John Roe'],
              publisher: 'Example Press',
              publishedDate: '2001-05-01',
              pageCount: 320,
              categories: ['Testing', 'Books', 'Extra', 'Dropped'],
            },
          },
        ],
      },
      isbn,
    );
    expect(item?.name).toBe('Example Book');
    expect(item?.description).toBe('by Jane Doe, John Roe');
    expect(item?.keyFacts).toEqual([
      { label: 'Author', value: 'Jane Doe, John Roe' },
      { label: 'Publisher', value: 'Example Press' },
      { label: 'Published', value: '2001-05-01' },
      { label: 'Pages', value: '320' },
      { label: 'Subjects', value: 'Testing, Books, Extra' },
      { label: 'ISBN', value: isbn },
    ]);
    expect(item?.confidenceNote).toBe('Exact match from Google Books.');
  });

  it('ignores a volume with no title', () => {
    expect(parseGoogleBooksResponse({ items: [{ volumeInfo: {} }] }, isbn)).toBeNull();
  });
});
