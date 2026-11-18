import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exampleQuote, grouped, restore, save, totals } from '../src/quote.js'

test('example totals and won grouping', () => {
  const { items } = exampleQuote()
  assert.deepEqual(totals(items), { subtotal: 4700000n, tax: 470000n, total: 5170000n })
  assert.equal(grouped(5170000n), '5,170,000')
})

test('integer currency rounds VAT at the won and preserves large amounts', () => {
  assert.deepEqual(totals([]), { subtotal: 0n, tax: 0n, total: 0n })
  assert.equal(totals([{ quantity: '1', price: '5' }]).tax, 1n)
  assert.equal(totals([{ quantity: '1', price: '4' }]).tax, 0n)
  assert.equal(totals([{ quantity: '2', price: '9,007,199,254,740,993' }]).subtotal, 18014398509481986n)
})

test('storage preserves edits and an empty item list', () => {
  const values = new Map()
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const quote = exampleQuote()
  quote.customer = '고객사'
  quote.items = []
  save(storage, quote)
  assert.deepEqual(restore(storage), quote)
})
