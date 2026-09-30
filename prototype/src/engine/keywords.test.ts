import { describe, expect, it } from 'vitest'
import { buildIndex, cosine, sharedKeywords, stem, STOP_WORDS, tokenise } from './keywords.ts'

describe('tokeniser', () => {
  it('lower-cases, splits on anything that is not a letter or digit, and drops stop words', () => {
    expect(tokenise("Women's Cotton Kurti, Blue, L")).toEqual(['women', 'cotton', 'kurti', 'blue', 'l'])
    expect(tokenise('Set of the two and a pair')).toEqual(['set', 'two', 'pair'])
  })

  it('has a fixed stop-word list of plain function words only (never a product word)', () => {
    for (const w of ['a', 'an', 'the', 'and', 'of', 'for', 'with']) expect(STOP_WORDS.has(w)).toBe(true)
    for (const w of ['cotton', 'kurti', 'blue', 'women', 'men', 'pack']) expect(STOP_WORDS.has(w)).toBe(false)
  })

  it('cleans up plurals lightly so kurtis and kurti are the same word, without mangling short words', () => {
    expect(stem('kurtis')).toBe('kurti')
    expect(stem('sarees')).toBe('saree')
    expect(stem('sandals')).toBe('sandal')
    expect(stem('dresses')).toBe('dress')
    expect(stem('berries')).toBe('berry')
    expect(stem('boxes')).toBe('box')
    expect(stem('jeans')).toBe('jean')
    expect(stem('glass')).toBe('glass')
    expect(stem('bus')).toBe('bus')
    expect(stem('xs')).toBe('xs')
    expect(tokenise('Kurtis and Sarees')).toEqual(['kurti', 'saree'])
  })

  it('is deterministic and keeps repeats (term counts feed the weights)', () => {
    expect(tokenise('blue blue kurti')).toEqual(['blue', 'blue', 'kurti'])
    expect(tokenise('')).toEqual([])
    expect(tokenise('  ,, ')).toEqual([])
  })
})

describe('TF-IDF and cosine (hand-worked)', () => {
  // N = 3 listings. idf = ln((1+N)/(1+df)) + 1, so df 2 -> 1.28768 and df 1 -> 1.69315.
  const index = buildIndex([
    { id: 'd1', text: 'cotton kurti blue' },
    { id: 'd2', text: 'cotton kurti red' },
    { id: 'd3', text: 'steel bottle blue' },
  ])

  it('weights a rare word more than a common one', () => {
    expect(index.idf.get('cotton')).toBeCloseTo(1.28768, 4)
    expect(index.idf.get('red')).toBeCloseTo(1.69315, 4)
    expect(index.idf.get('nothing')).toBeUndefined()
  })

  it('cosine of two listings sharing two of three words is about 0.598', () => {
    expect(cosine(index, 'd1', 'd2')).toBeCloseTo(0.59797, 4)
  })

  it('cosine of two listings sharing one word of three is about 0.273', () => {
    expect(cosine(index, 'd1', 'd3')).toBeCloseTo(0.27345, 4)
  })

  it('is 1 for the same listing, symmetric, and 0 when nothing is shared', () => {
    expect(cosine(index, 'd1', 'd1')).toBeCloseTo(1, 9)
    expect(cosine(index, 'd2', 'd1')).toBeCloseTo(cosine(index, 'd1', 'd2'), 12)
    const apart = buildIndex([
      { id: 'a', text: 'cotton kurti' },
      { id: 'b', text: 'steel bottle' },
    ])
    expect(cosine(apart, 'a', 'b')).toBe(0)
  })

  it('an unknown or empty listing has no similarity to anything', () => {
    expect(cosine(index, 'd1', 'nope')).toBe(0)
    const empty = buildIndex([
      { id: 'a', text: 'the and' },
      { id: 'b', text: 'cotton' },
    ])
    expect(cosine(empty, 'a', 'b')).toBe(0)
  })

  it('names the shared words, heaviest first, for the keyword chips', () => {
    expect(sharedKeywords(index, 'd1', 'd2')).toEqual(['cotton', 'kurti'])
    expect(sharedKeywords(index, 'd1', 'd3')).toEqual(['blue'])
    expect(sharedKeywords(index, 'd1', 'nope')).toEqual([])
    const rare = buildIndex([
      { id: 'x', text: 'cotton zari saree' },
      { id: 'y', text: 'cotton zari saree' },
      { id: 'z', text: 'cotton shirt' },
      { id: 'w', text: 'cotton shirt' },
    ])
    // zari and saree appear in two listings (idf 1.51), cotton in four (idf 1.0): the rare words come first.
    expect(sharedKeywords(rare, 'x', 'y')).toEqual(['saree', 'zari', 'cotton'])
    expect(sharedKeywords(rare, 'x', 'y', 2)).toEqual(['saree', 'zari'])
  })
})
