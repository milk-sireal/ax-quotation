"""Smoke test against an already running build using Python Playwright."""
import os
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory

from playwright.sync_api import expect, sync_playwright

with sync_playwright() as playwright, TemporaryDirectory() as temp:
    executable = os.environ.get('CHROMIUM_PATH')
    browser = playwright.chromium.launch(executable_path=executable)
    page = browser.new_page(viewport={'width': 1366, 'height': 950})
    base = os.environ.get('QUOTE_URL', 'http://localhost:3000')
    errors = []
    requests = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append(request.url))
    page.goto(base)

    def check_totals(subtotal, tax, total):
        for key, value in zip(('subtotal', 'tax', 'total'), (subtotal, tax, total)):
            expect(page.locator('#' + key)).to_have_text(value + '원')

    check_totals('4,700,000', '470,000', '5,170,000')
    expect(page.locator('#quote-lines td').nth(3)).to_have_text('800,000원')
    for key, value in {
        'customer': '테스트 고객사', 'supplier': '테스트 공급자', 'manager': '테스트 담당자',
        'email': 'test@example.com', 'number': 'AX-TEST-001',
        'issued': '2026-11-18', 'expires': '2026-12-18',
    }.items():
        page.locator(f'[data-field="{key}"]').fill(value)
        expect(page.locator('#doc-' + key)).to_have_text(value)

    first = page.locator('.item').first
    first.get_by_label('수량', exact=True).fill('3')
    first.get_by_label('단가 (원)', exact=True).fill('1000000')
    expect(first.get_by_label('단가 (원)', exact=True)).to_have_value('1,000,000')
    expect(first.locator('output')).to_have_text('3,000,000원')
    check_totals('6,900,000', '690,000', '7,590,000')
    add = page.get_by_role('button', name='품목 추가')
    add.click()
    last = page.locator('.item').last
    last.get_by_label('품목명').fill('추가 교육')
    last.get_by_label('설명').fill('추가 교육 상세 설명')
    last.get_by_label('단가 (원)').fill('200000')
    check_totals('7,100,000', '710,000', '7,810,000')
    page.reload()
    expect(page.locator('#doc-customer')).to_have_text('테스트 고객사')
    expect(last.get_by_label('품목명')).to_have_value('추가 교육')
    expect(last.get_by_label('설명')).to_have_value('추가 교육 상세 설명')
    expect(page.locator('#quote-lines')).to_contain_text('추가 교육 상세 설명')
    check_totals('7,100,000', '710,000', '7,810,000')
    page.get_by_role('button', name='품목 4 삭제').click()
    expect(page.locator('.item')).to_have_count(3)
    check_totals('6,900,000', '690,000', '7,590,000')
    page.reload()
    expect(page.locator('.item')).to_have_count(3)
    print('PASS — quote editing, example totals, item changes, and reload persistence')

    for width in (320, 390, 1366):
        page.set_viewport_size({'width': width, 'height': 900})
        assert page.evaluate('document.documentElement.scrollWidth === innerWidth'), width
    print('PASS — no horizontal page overflow at 320px, 390px, or 1366px')

    page.evaluate('window.print = () => window.printInvoked = true')
    page.get_by_role('button', name='인쇄 / PDF 저장').click()
    assert page.evaluate('window.printInvoked')
    page.emulate_media(media='print')
    expect(page.locator('.editor')).to_be_hidden()
    expect(page.locator('#print')).to_be_hidden()
    expect(page.locator('.paper')).to_be_visible()

    def check_pdf(name):
        path = str(Path(temp) / name)
        page.pdf(path=path, prefer_css_page_size=True, print_background=True)
        info = subprocess.check_output(['pdfinfo', path], text=True)
        content = subprocess.check_output(['pdftotext', path, '-'], text=True)
        assert re.search(r'Page size:.*\(A4\)', info), info
        assert '7,590,000' in content and 'AX-TEST-001' in content
        assert '품목 추가' not in content and 'PDF 저장' not in content
        return int(re.search(r'^Pages:\s+(\d+)', info, re.M).group(1)), content

    pages, _ = check_pdf('quote.pdf')
    assert pages == 1
    page.emulate_media(media='screen')
    for index in range(40):
        add.click()
        page.locator('.item').last.get_by_label('품목명').fill(f'추가 항목 {index + 1}')
    page.emulate_media(media='print')
    pages, content = check_pdf('multipage.pdf')
    assert pages > 1
    assert '추가 항목 40' in content and content.count('금액') >= pages
    print(f'PASS — A4 PDF, editor hidden, and multi-page quote ({pages} pages)')

    page.emulate_media(media="screen")
    while page.locator('.item').count():
        page.locator('.remove').last.click()
    page.reload()
    expect(page.locator('.item')).to_have_count(0)
    check_totals('0', '0', '0')
    assert not errors, errors
    assert all(url.startswith(base + '/') for url in requests), requests
    print('PASS — empty quote persists, no page errors or external requests')
    browser.close()
