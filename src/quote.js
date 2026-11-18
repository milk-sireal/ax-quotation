export const storageKey = 'ax-learninglab-quote-v1'

export function exampleQuote(now = new Date()) {
  const date = (value) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(value)
  const issued = date(now)
  return {
    supplier: 'AX러닝랩',
    manager: '홍길동',
    email: 'contact@example.com',
    customer: '',
    discountRate: '0',
    number: 'AX-' + issued.replaceAll('-', '') + '-001',
    issued,
    expires: date(new Date(now.getTime() + 30 * 86400000)),
    items: [
      { name: '생성형 AI 기초 교육', description: '생성형 AI의 개념과 프롬프트 활용 기초', quantity: '1', price: '800000' },
      { name: '직무별 AI 실무 교육', description: '직무별 업무 사례 기반 AI 실습', quantity: '2', price: '1200000' },
      { name: 'AI 업무 자동화 교육', description: '반복 업무 자동화 워크플로 설계 및 실습', quantity: '1', price: '1500000' },
    ],
  }
}

export function digits(value) {
  return String(value).replace(/[^0-9]/g, '')
}

export function itemAmount(item) {
  return BigInt(digits(item.quantity)) * BigInt(digits(item.price))
}

export function discountBasisPoints(value) {
  if (!/^\d*(?:\.\d{0,2})?$/.test(String(value))) return 0
  return Math.min(10000, Math.round((Number(value) || 0) * 100))
}

export function totals(items, discountRate = '0') {
  const subtotal = items.reduce((sum, item) => sum + itemAmount(item), 0n)
  const discount = (subtotal * BigInt(discountBasisPoints(discountRate)) + 5000n) / 10000n
  const taxable = subtotal - discount
  const tax = (taxable + 5n) / 10n
  return { subtotal, discount, tax, total: taxable + tax }
}

const formatter = new Intl.NumberFormat('ko-KR')
export function grouped(value) {
  return formatter.format(BigInt(value))
}

export function restore(storage) {
  const defaults = exampleQuote()
  const saved = JSON.parse(storage.getItem(storageKey))
  if (!saved || !Array.isArray(saved.items)) return defaults
  const quote = { ...defaults }
  for (const key of Object.keys(defaults)) {
    if (typeof saved[key] === 'string') quote[key] = saved[key]
  }
  quote.discountRate = String(discountBasisPoints(quote.discountRate) / 100)
  quote.items = saved.items.map((item) => ({
    name: String(item?.name ?? ''),
    description: String(item?.description ?? ''),
    quantity: digits(item?.quantity ?? ''),
    price: digits(item?.price ?? ''),
  }))
  return quote
}

export function save(storage, quote) {
  storage.setItem(storageKey, JSON.stringify(quote))
}
