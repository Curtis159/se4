"""Pending real-browser check. Serve web/ on localhost:8765, then run this file.
This test has no recorded PASS in the restricted build environment.
"""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('SE4_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    for width,height in [(1280,900),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto('http://127.0.0.1:8765',wait_until='networkidle')
        page.locator('#quick').click()
        assert page.locator('.race').count()==16
        page.locator('[data-race="Terran"]').click()
        page.locator('#begin').click()
        page.locator('#game').wait_for(state='visible',timeout=180000)
        page.wait_for_function("document.querySelector('#status').textContent.includes('Turn 0')")
        assert page.locator('.sector').count()==169
        page.locator('[data-tab="colonies"]').click()
        page.locator('.colony input').first.fill('Browser Homeworld')
        page.locator('.colony button').filter(has_text='Rename').first.click()
        page.wait_for_function("document.querySelector('.colony h3').textContent.includes('Browser Homeworld')")
        page.locator('#end-turn').click()
        page.wait_for_function("document.querySelector('#status').textContent.includes('Turn 1')",timeout=120000)
        with page.expect_download() as download_info:page.locator('#save-game').click()
        download_info.value.save_as('/tmp/se4-browser-save.json')
        page.locator('#end-turn').click()
        page.wait_for_function("document.querySelector('#status').textContent.includes('Turn 2')",timeout=120000)
        page.locator('#save-file').set_input_files('/tmp/se4-browser-save.json')
        page.wait_for_function("document.querySelector('#status').textContent.includes('Turn 1')",timeout=120000)
        assert page.locator('.colony h3').first.inner_text().startswith('Browser Homeworld')
        for name in ['research','designs','ships','log','maps']:
            page.locator(f'[data-tab="{name}"]').click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors,errors
        page.screenshot(path=f'/tmp/se4-browser-{width}.png',full_page=True)
        results.append({'viewport':[width,height],'status':page.locator('#status').inner_text(),'passed':True,'consoleErrors':errors})
        page.close()
    browser.close()
Path('tests/browser-results.json').write_text(json.dumps(results,indent=2))
print('PASS: desktop + mobile browser smoke test.')
