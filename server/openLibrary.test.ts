import { describe, expect, it } from 'vitest';
import { isIsbn13, parseOpenLibraryResponse } from './openLibrary';

describe('isIsbn13', () => {
  it('accepts 978 and 979 prefixes only', () => {
    expect(isIsbn13('9780306406157')).toBe(true);
    expect(isIsbn13('9790306406157')).toBe(true);
    expect(isIsbn13('5000159484695')).toBe(false);
  });
});

describe('parseOpenLibraryResponse', () => {
  const isbn = '9780306406157';

  it('returns null for an unknown ISBN', () => {
    expect(parseOpenLibraryResponse({}, isbn)).toBeNull();
  });

  it('builds a book card from the record', () => {
    const item = parseOpenLibraryResponse(
      {
        [`ISBN:${isbn}`]: {
          title: 'Example Book',
          authors: [{ name: 'Jane Doe' }],
          publishers: [{ name: 'Example Press' }],
          publish_date: '2001',
          number_of_pages: 320,
          subjects: [{ name: 'Testing' }, { name: 'Books' }],
        },
      },
      isbn,
    );
    expect(item?.name).toBe('Example Book');
    expect(item?.category).toBeNull();
    expect(item?.isFood).toBe(false);
    expect(item?.allergens).toBeNull();
    expect(item?.keyFacts).toEqual([
      { label: 'Author', value: 'Jane Doe' },
      { label: 'Publisher', value: 'Example Press' },
      { label: 'Published', value: '2001' },
      { label: 'Pages', value: '320' },
      { label: 'Subjects', value: 'Testing, Books' },
      { label: 'ISBN', value: isbn },
    ]);
  });
});
