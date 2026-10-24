"""Thème horaire partagé : python3 tests/theme-clock.py --base-url http://127.0.0.1:8001"""
import argparse
from datetime import datetime
from pathlib import Path
import re
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


def at(hour, minute=0, timezone=zone):
    return datetime(2026, 10, 17, hour, minute, tzinfo=timezone)


def prepare(page, hour=12, minute=0, timezone=zone):
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.add_init_script('''requestAnimationFrame(function firstContentFrame(){
        if(!document.body){requestAnimationFrame(firstContentFrame);return;}
        window.firstThemeFrame=document.documentElement.dataset.theme;
        window.themeFrameRecorded=true;
    })''')
    page.clock.install(time=at(hour, minute, timezone))


def loaded(page, path='/'):
    page.goto(base + path)
    page.wait_for_function('window.themeFrameRecorded === true')


def check(page, theme, first_frame=True):
    global checks
    assert page.locator('html').get_attribute('data-theme') == theme, page.url
    assert page.locator('html').evaluate('(e,t)=>e.classList.contains("theme-"+t)', theme)
    toggle = page.locator('.theme-toggle')
    assert toggle.get_attribute('aria-pressed') == str(theme == 'dark').lower(), page.url
    assert toggle.get_attribute('aria-label') == ('Passer en mode jour' if theme == 'dark' else 'Passer en mode nuit')
    if first_frame:
        assert page.evaluate('window.firstThemeFrame') == theme, page.url
    for note in page.locator('.transition-note,.sector-editorial-benefit,.sector-reality-conclusion,.sector-method-conclusion,.thalasso-turnover-benefit,.time-benefit').all():
        style = note.evaluate("e=>({width:getComputedStyle(e,'::before').width,bg:getComputedStyle(e,'::before').backgroundImage,pad:getComputedStyle(e).paddingLeft})")
        assert style['width'] == '3px', (page.url, style)
        assert ('rgb(91, 63, 216)' if theme == 'light' else 'rgb(139, 123, 255)') in style['bg'], (page.url, style)
        assert float(style['pad'][:-2]) >= 19
    checks += 1


# The existing synchronous head script must run before stylesheet rendering on every page.
for path in pages:
    head = re.search(r'<head\b[^>]*>(.*?)</head>', (root / path).read_text(), re.S).group(1)
    tag = re.search(r'<script\b[^>]*src=["\'][^"\']*js/theme\.js["\'][^>]*>', head).group()
    assert not re.search(r'\b(?:async|defer)\b', tag)
    assert head.index(tag) < head.index('rel="stylesheet"'), path

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    for system in ['light', 'dark']:
        context = browser.new_context(timezone_id='Europe/Paris', color_scheme=system, reduced_motion='reduce')
        page = context.new_page()
        prepare(page)
        loaded(page)
        # None or either session preference, with a conflicting legacy persistent preference.
        for manual in [None, 'light', 'dark']:
            for hour, minute, automatic in cases:
                legacy = 'light' if automatic == 'dark' else 'dark'
                page.evaluate('''({manual,legacy})=>{
                    localStorage.setItem('aestheia-theme',legacy);
                    if(manual)sessionStorage.setItem('aestheia-theme',manual);
                    else sessionStorage.removeItem('aestheia-theme');
                }''', {'manual': manual, 'legacy': legacy})
                page.clock.set_fixed_time(at(hour, minute))
                loaded(page)
                check(page, manual or automatic)
                assert page.evaluate('localStorage.getItem("aestheia-theme")') == legacy
                assert page.evaluate('sessionStorage.getItem("aestheia-theme")') == manual
        page.evaluate('sessionStorage.removeItem("aestheia-theme")')
        # Every HTML page still applies both automatic themes before its first frame.
        for hour, theme in [(7, 'light'), (19, 'dark')]:
            page.clock.set_fixed_time(at(hour))
            for path in pages:
                loaded(page, '/' + path)
                check(page, theme)
        page.clock.set_fixed_time(at(18, 59))
        loaded(page)
        page.clock.set_fixed_time(at(19))
        page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
        check(page, 'dark', first_frame=False)
        page.clock.set_fixed_time(at(7))
        page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
        check(page, 'light', first_frame=False)
        # Manual choice survives reload and navigation but never writes persistent storage.
        before = page.evaluate('JSON.stringify({...localStorage})')
        page.locator('.theme-toggle').click()
        assert page.evaluate('sessionStorage.getItem("aestheia-theme")') == 'dark'
        page.reload()
        page.wait_for_function('window.themeFrameRecorded === true')
        check(page, 'dark')
        loaded(page, '/#simulateur')
        check(page, 'dark')
        page.clock.set_fixed_time(at(12))
        page.evaluate('document.dispatchEvent(new Event("visibilitychange"))')
        check(page, 'dark', first_frame=False)
        page.locator('.theme-toggle').click()
        page.clock.set_fixed_time(at(0))
        loaded(page, '/contact')
        check(page, 'light')
        assert page.evaluate('JSON.stringify({...localStorage})') == before
        persistent_state = context.storage_state()
        context.close()
        # A new visit restores persistent browser state, without the previous sessionStorage.
        context = browser.new_context(timezone_id='Europe/Paris', color_scheme=system, reduced_motion='reduce', storage_state=persistent_state)
        page = context.new_page()
        prepare(page, 0)
        loaded(page)
        check(page, 'dark')
        assert page.evaluate('sessionStorage.getItem("aestheia-theme")') is None
        assert page.evaluate('JSON.stringify({...localStorage})') == before
        # Unavailable storage still permits the hourly default and the manual control.
        page.add_init_script('Storage.prototype.getItem=()=>{throw new Error("storage unavailable")};Storage.prototype.setItem=()=>{throw new Error("storage unavailable")}')
        loaded(page)
        check(page, 'dark')
        page.locator('.theme-toggle').click()
        check(page, 'light', first_frame=False)
        context.close()
        # Real timer transitions while the tab remains visible, including manual overrides.
        for hour, minute, automatic in [(6, 59, 'light'), (18, 59, 'dark')]:
            for manual in [None, 'light', 'dark']:
                context = browser.new_context(timezone_id='Europe/Paris', color_scheme=system, reduced_motion='reduce')
                page = context.new_page()
                if manual:
                    page.add_init_script(f"sessionStorage.setItem('aestheia-theme','{manual}')")
                prepare(page, hour, minute)
                loaded(page)
                page.clock.fast_forward(61_000)
                check(page, manual or automatic, first_frame=False)
                context.close()
    # The same instant uses the device timezone, rather than the server or a fixed Paris clock.
    for timezone, expected in [('America/New_York', 'light'), ('Asia/Tokyo', 'dark')]:
        context = browser.new_context(timezone_id=timezone, color_scheme='dark', reduced_motion='reduce')
        page = context.new_page()
        prepare(page, 12, timezone=ZoneInfo('UTC'))
        loaded(page)
        check(page, expected)
        context.close()
    assert not errors, errors
    browser.close()
print(f'PASS : {checks} contrôles, 5 horaires, systèmes clair et sombre, {len(pages)} pages, choix limité à la session, anciennes préférences ignorées, bascules en direct, premier rendu, fuseau local, stockage indisponible')
