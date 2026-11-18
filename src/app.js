import { discountBasisPoints, digits, exampleQuote, grouped, itemAmount, restore, save, totals } from './quote.js'

const find = (id) => document.getElementById(id)
const currency = (value) => grouped(value) + '원'
const list = find('items')
const lines = find('quote-lines')
let quote

try {
  quote = restore(localStorage)
} catch {
  quote = exampleQuote()
}

function persist() {
  try {
    save(localStorage, quote)
    find('save-state').classList.remove('unsaved')
    find('save-label').textContent = '자동 저장됨'
  } catch {
    find('save-state').classList.add('unsaved')
    find('save-label').textContent = '자동 저장 실패'
  }
}

const fields = document.querySelectorAll('[data-field]')
for (const input of fields) {
  const key = input.dataset.field
  input.value = quote[key]
  input.addEventListener('input', () => {
    quote[key] = input.value
    renderQuote()
    persist()
  })
}

const discountInput = find('discount-rate')
discountInput.value = quote.discountRate
discountInput.addEventListener('input', () => {
  const raw = discountInput.value
  if (!/^\d*(?:\.\d{0,2})?$/.test(raw)) {
    discountInput.value = quote.discountRate
    return
  }
  const rate = discountBasisPoints(raw) / 100
  quote.discountRate = String(rate)
  if (Number(raw) > 100) discountInput.value = quote.discountRate
  renderQuote()
  persist()
})
discountInput.addEventListener('blur', () => {
  discountInput.value = quote.discountRate
})

function renderQuote() {
  for (const { dataset: { field } } of fields) {
    const fallback = field === 'customer' ? '고객사명 입력' : '—'
    find('doc-' + field).textContent = quote[field].trim() || fallback
  }
  lines.replaceChildren()
  for (const item of quote.items) {
    const row = lines.insertRow()
    const title = document.createElement('strong')
    title.textContent = item.name.trim() || '품목명 미입력'
    const titleCell = row.insertCell()
    titleCell.append(title)
    if (item.description.trim()) {
      const description = document.createElement('small')
      description.textContent = item.description
      titleCell.append(description)
    }
    row.insertCell().textContent = grouped(item.quantity)
    row.insertCell().textContent = currency(item.price)
    row.insertCell().textContent = currency(itemAmount(item))
  }
  if (!quote.items.length) {
    const cell = lines.insertRow().insertCell()
    cell.colSpan = 4
    cell.className = 'empty'
    cell.textContent = '등록된 품목이 없습니다.'
  }
  find('doc-discount-rate').textContent = quote.discountRate
  for (const [key, value] of Object.entries(totals(quote.items, quote.discountRate))) {
    find(key).textContent = (key === 'discount' && value ? '−' : '') + currency(value)
  }
}

function setNumber(input, raw) {
  const caret = input.selectionStart
  const rightDigits = digits(input.value.slice(caret)).length
  input.value = raw ? grouped(raw) : ''
  let position = input.value.length
  for (let remaining = rightDigits; remaining && position; position--) {
    if (/\d/.test(input.value[position - 1])) remaining--
  }
  input.setSelectionRange(position, position)
}

function updateItemNumbers() {
  find('empty-items').hidden = Boolean(list.rows.length)
  for (const [index, row] of Array.from(list.rows).entries()) {
    row.querySelector('.remove').setAttribute('aria-label', '품목 ' + (index + 1) + ' 삭제')
  }
}

function appendItem(item) {
  const row = find('item-template').content.firstElementChild.cloneNode(true)
  const output = row.querySelector('output')
  output.textContent = currency(itemAmount(item))
  for (const input of row.querySelectorAll('[data-item]')) {
    const key = input.dataset.item
    const numeric = key === 'quantity' || key === 'price'
    input.value = numeric && item[key] ? grouped(item[key]) : item[key]
    if (numeric) {
      input.addEventListener('beforeinput', (event) => {
        if (input.selectionStart !== input.selectionEnd) return
        const caret = input.selectionStart
        if (event.inputType === 'deleteContentBackward' && input.value[caret - 1] === ',') {
          input.setSelectionRange(caret - 1, caret - 1)
        }
        if (event.inputType === 'deleteContentForward' && input.value[caret] === ',') {
          input.setSelectionRange(caret + 1, caret + 1)
        }
      })
    }
    input.addEventListener('input', () => {
      if (!numeric || /^[0-9,]*$/.test(input.value)) {
        item[key] = numeric ? digits(input.value) : input.value
      }
      if (numeric) setNumber(input, item[key])
      output.textContent = currency(itemAmount(item))
      renderQuote()
      persist()
    })
  }
  row.querySelector('.remove').addEventListener('click', () => {
    const next = row.nextElementSibling ?? row.previousElementSibling
    quote.items.splice(quote.items.indexOf(item), 1)
    row.remove()
    updateItemNumbers()
    renderQuote()
    persist()
    const focusTarget = next?.querySelector('.remove') ?? find('add')
    focusTarget.focus()
  })
  list.append(row)
  return row.querySelector('[data-item="name"]')
}

list.addEventListener('click', (event) => {
  if (event.target.matches('td')) event.target.querySelector('input')?.focus()
})

find('add').addEventListener('click', () => {
  const item = { name: '', description: '', quantity: '1', price: '' }
  quote.items.push(item)
  const name = appendItem(item)
  updateItemNumbers()
  renderQuote()
  persist()
  name.focus()
})

find('print').addEventListener('click', () => window.print())
quote.items.forEach(appendItem)
updateItemNumbers()
renderQuote()
persist()
