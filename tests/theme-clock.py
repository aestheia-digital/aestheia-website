"""Thème horaire partagé : python3 tests/theme-clock.py --base-url http://127.0.0.1:8001"""
import argparse
from datetime import datetime
from pathlib import Path
import shutil
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:8001')
args = parser.parse_args()
base = args.base_url.rstrip('/')
root = Path(__file__).resolve().parents[1]
zone = ZoneInfo('Europe/Paris')
pages = [str(p.relative_to(root)) for p in root.rglob('*.html')]
cases = [(6, 59, 'dark'), (7, 0, 'light'), (18, 59, 'light'), (19, 0, 'dark'), (0, 0, 'dark')]
checks = 0
errors = []


def at(hour, minute=0):
    return datetime(2026, 10, 16, hour, minute, tzinfo=zone)


def check(page, theme):
    global checks
    assert page.locator('html').get_attribute('data-theme') == theme, page.url
    assert page.locator('html').evaluate('(e,t)=>e.classList.contains("theme-"+t)', theme)
    toggle = page.locator('.theme-toggle')
    assert toggle.get_attribute('aria-pressed') == str(theme == 'dark').lower(), page.url
    assert toggle.get_attribute('aria-label') == ('Passer en mode jour' if theme == 'dark' else 'Passer en mode nuit')
    assert page.evaluate('window.firstThemeFrame') == theme, page.url
    for note in page.locator('.transition-note,.sector-editorial-benefit,.sector-reality-conclusion,.sector-method-conclusion,.thalasso-turnover-benefit,.time-benefit').all():
        style = note.evaluate("e=>({width:getComputedStyle(e,'::before').width,bg:getComputedStyle(e,'::before').backgroundImage,pad:getComputedStyle(e).paddingLeft})")
        assert style['width'] == '4px', (page.url, style)
        assert ('rgb(91, 63, 216)' if theme == 'light' else 'rgb(139, 123, 255)') in style['bg'], (page.url, style)
        assert float(style['pad'][:-2]) >= 19
    checks += 1


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    for system in ['light', 'dark']:
        context = browser.new_context(timezone_id='Europe/Paris', color_scheme=system, reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.add_init_script('requestAnimationFrame(()=>{window.firstThemeFrame=document.documentElement.dataset.theme})')
        page.clock.install(time=at(12))
        for hour, minute, theme in cases:
            page.clock.set_fixed_time(at(hour, minute))
            page.goto(base + '/')
            page.wait_for_function('window.firstThemeFrame !== undefined')
            check(page, theme)
            assert page.evaluate('localStorage.getItem("aestheia-theme")') is None
        # Every HTML page applies both automatic themes using the same head script.
        for hour, theme in [(7, 'light'), (19, 'dark')]:
            page.clock.set_fixed_time(at(hour))
            for path in pages:
                page.goto(base + '/' + path)
                page.wait_for_function('window.firstThemeFrame !== undefined')
                check(page, theme)
        # Returning to a visible tab recalculates the automatic theme.
        page.clock.set_fixed_time(at(18, 59))
        page.goto(base + '/')
        page.clock.set_fixed_time(at(19))
        page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
        assert page.locator('html').get_attribute('data-theme') == 'dark'
        assert page.locator('.theme-toggle').get_attribute('aria-pressed') == 'true'
        page.clock.set_fixed_time(at(7))
        page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
        assert page.locator('html').get_attribute('data-theme') == 'light'
        # Only a manual click writes the existing preference key.
        before = page.evaluate('JSON.stringify({...localStorage})')
        page.locator('.theme-toggle').click()
        assert page.evaluate('localStorage.getItem("aestheia-theme")') == 'dark'
        page.goto(base + '/simulateur-gain-de-temps/')
        page.wait_for_function('window.firstThemeFrame !== undefined')
        check(page, 'dark')
        page.clock.set_fixed_time(at(12))
        page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
        assert page.locator('html').get_attribute('data-theme') == 'dark'
        page.locator('.theme-toggle').click()
        page.clock.set_fixed_time(at(0))
        page.goto(base + '/contact')
        page.wait_for_function('window.firstThemeFrame !== undefined')
        check(page, 'light')
        page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
        assert page.locator('html').get_attribute('data-theme') == 'light'
        page.evaluate('localStorage.removeItem("aestheia-theme")')
        assert page.evaluate('JSON.stringify({...localStorage})') == before
        # The hourly default also works if browser storage is unavailable.
        page.add_init_script('Storage.prototype.getItem=()=>{throw new Error("storage unavailable")};Storage.prototype.setItem=()=>{throw new Error("storage unavailable")}')
        page.goto(base + '/')
        page.wait_for_function('window.firstThemeFrame !== undefined')
        check(page, 'dark')
        page.locator('.theme-toggle').click()
        assert page.locator('html').get_attribute('data-theme') == 'light'
        context.close()
    assert not errors, errors
    browser.close()
print(f'PASS : {checks} contrôles, 5 horaires, {len(pages)} pages dans les deux thèmes, priorité manuelle, retour visible, premier rendu, stockage indisponible')
