import { describe, expect, it } from 'vitest'
import { formatINR, formatINRShort, formatMonths, formatPct, formatPp, parseAmount, rupeesInWords } from './format'

describe('rupee formatting (Indian number system)', () => {
  it('groups in lakhs and crores', () => {
    expect(formatINR(500000)).toBe('₹5,00,000')
    expect(formatINR(12500000)).toBe('₹1,25,00,000')
    expect(formatINR(969.73, { paise: true })).toBe('₹969.73')
    expect(formatINR(969.726)).toBe('₹970')
    expect(formatINR(null)).toBe('—')
    expect(formatINR(-0.001)).toBe('₹0')
  })
  it('short forms use lakh/crore, in English and Hindi', () => {
    expect(formatINRShort(500000)).toBe('₹5 lakh')
    expect(formatINRShort(12500000)).toBe('₹1.25 crore')
    expect(formatINRShort(500000, 'hi')).toBe('₹5 लाख')
    expect(formatINRShort(12500000, 'hi')).toBe('₹1.25 करोड़')
    expect(formatINRShort(45000)).toBe('₹45,000')
  })
  it('input hints', () => {
    expect(rupeesInWords(480000)).toBe('₹4.8 lakh')
    expect(rupeesInWords(25000)).toBe('₹25 thousand')
    expect(rupeesInWords(500)).toBe('')
  })
  it('parses typed amounts', () => {
    expect(parseAmount('5,00,000')).toBe(500000)
    expect(parseAmount('₹ 4 80 000.50')).toBe(480000.5)
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
  })
  it('rates, percentage points and tenure', () => {
    expect(formatPct(17.0702)).toBe('17.07%')
    expect(formatPp(3.14159)).toBe('+3.14 pp')
    expect(formatPp(-0.5)).toBe('−0.50 pp')
    expect(formatMonths(40)).toBe('3 yr 4 mo')
    expect(formatMonths(240)).toBe('20 yr')
  })
})
