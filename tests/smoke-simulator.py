"""Simulateur de l’accueil : python3 tests/smoke-simulator.py --base-url http://127.0.0.1:8001"""
import argparse
import re
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:8001')
args = parser.parse_args()
base = args.base_url.rstrip('/')
root = Path(__file__).resolve().parents[1]
assert not (root / 'simulateur-gain-de-temps/index.html').exists()
assert '/simulateur-gain-de-temps/' not in (root / 'sitemap.xml').read_text()
redirects = {parts[0]: parts[1:] for line in (root / '_redirects').read_text().splitlines() if len(parts := line.split()) == 3}
for old_path in ['/simulateur-gain-de-temps', '/simulateur-gain-de-temps/', '/simulateur-gain-de-temps/index.html']:
    assert redirects[old_path] == ['/#simulateur', '301']
for path in root.rglob('*.html'):
    assert 'simulateur-gain-de-temps' not in path.read_text(), path
cases = [
    (2, '45 min à 1 h', '3 à 4'),
    (3, '1 h 15 à 1 h 30', '5 à 6'),
    (8, '3 h 15 à 4 h', '12 à 15'),
    (15, '6 h à 7 h 30', '23 à 29'),
    (30, '12 h à 15 h', '46 à 58'),
]
errors = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    for theme in ['light', 'dark']:
        page = browser.new_page(reduced_motion='reduce')
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.goto(base + '/?theme=' + theme + '#simulateur')
        page.evaluate('document.fonts.ready')
        assert page.locator('h1').count() == 1
        section = page.locator('section.sim#simulateur')
        assert section.get_attribute('aria-labelledby') == 'sim-titre'
        assert section.locator('h2').inner_text() == "Combien d'heures l'administratif vous prend-il par semaine ?"
        assert section.evaluate("s=>s.closest('.home-demo--with-simulator').querySelector('h2').textContent") == 'Une demande ne devrait pas se perdre entre deux outils'
        assert section.evaluate("s=>s.closest('.home-demo--with-simulator').nextElementSibling.querySelector('h2').textContent") == 'Une expertise adaptée à votre métier'
        assert not any(mark in section.inner_text() for mark in ['—', '–', '«', '»'])
        assert page.locator('.time-banner').count() == 0
        assert section.locator('#sim-gain').get_attribute('aria-live') == 'polite'
        range_input = section.get_by_role('slider', name=re.compile(r'^Tâches répétitives'))
        assert [range_input.get_attribute(a) for a in ['min', 'max', 'step', 'value']] == ['2', '30', '1', '8']
        assert range_input.get_attribute('aria-describedby') == 'sim-methode'
        assert page.locator('#sim-gain').inner_text() == '3 h 15 à 4 h'
        for hours, gain, monthly in cases:
            range_input.fill(str(hours))
            assert page.locator('#sim-valeur').inner_text() == str(hours)
            assert page.locator('#sim-gain').inner_text() == gain
            assert page.locator('#sim-mois').inner_text() == monthly
        range_input.fill('8')
        range_input.focus()
        range_input.press('ArrowRight')
        assert range_input.input_value() == '9'
        assert page.locator('#sim-valeur').inner_text() == '9'
        assert range_input.evaluate("e=>getComputedStyle(e).outlineStyle") != 'none'
        for width in [320, 400, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 1000})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (theme, width)
            spacing = section.evaluate("""s => {
                const band = s.querySelector('.sim-band').getBoundingClientRect();
                const parent = s.closest('.home-demo--with-simulator');
                const note = s.previousElementSibling.getBoundingClientRect();
                const bounds = parent.getBoundingClientRect();
                const next = parent.nextElementSibling.getBoundingClientRect();
                const style = getComputedStyle(s);
                return {top: band.top - note.bottom, bottom: bounds.bottom - band.bottom,
                    contained: band.top >= bounds.top && band.bottom <= bounds.bottom && band.bottom <= next.top,
                    last: s.parentElement.classList.contains('container') && s.parentElement.lastElementChild === s,
                    marginTop: style.marginTop, marginBottom: style.marginBottom,
                    background: style.backgroundColor, image: style.backgroundImage,
                    border: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
                    shadow: style.boxShadow, radius: style.borderRadius,
                    before: getComputedStyle(s, '::before').content, after: getComputedStyle(s, '::after').content};
            }""")
            expected_gap = 32 if width <= 720 else 48
            assert abs(spacing['top'] - expected_gap) < .5, (theme, width, spacing)
            assert abs(spacing['bottom'] - expected_gap) < .5, (theme, width, spacing)
            assert spacing['contained'] and spacing['last'], (theme, width, spacing)
            assert float(spacing['marginTop'][:-2]) >= 0 and float(spacing['marginBottom'][:-2]) >= 0
            assert spacing['background'] == 'rgba(0, 0, 0, 0)' and spacing['image'] == 'none'
            assert spacing['border'] == ['0px'] * 4 and spacing['shadow'] == 'none' and spacing['radius'] == '0px'
            assert spacing['before'] == spacing['after'] == 'none'
            band_paint = section.locator('.sim-band').evaluate("e=>({background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderTopWidth,line:getComputedStyle(e,'::before').backgroundImage})")
            assert band_paint['background'] != 'rgba(0, 0, 0, 0)' and band_paint['border'] == '1px'
            assert 'linear-gradient' in band_paint['line']
            for element in section.locator('.sim-band, .sim-gain, .sim-cta').all():
                assert element.evaluate("e=>getComputedStyle(e).borderRadius") == '0px'
                box = element.bounding_box()
                assert box['x'] >= 0 and box['x'] + box['width'] <= width + .1
            assert section.locator('.sim-title').evaluate("e=>getComputedStyle(e).fontFamily") == page.locator('html').evaluate("e=>getComputedStyle(e).getPropertyValue('--font-display').trim()")
            assert section.locator('.sim-title').evaluate("e=>getComputedStyle(e).fontWeight") == '400'
            assert section.locator('.sim-gain').evaluate("e=>getComputedStyle(e).fontWeight") == '400'
            for number in ['#sim-valeur']:
                assert section.locator(number).evaluate("e=>getComputedStyle(e).fontFamily === getComputedStyle(e.parentElement).fontFamily && getComputedStyle(e).fontSize === getComputedStyle(e.parentElement).fontSize")
            assert section.locator('#sim-gain').evaluate("e=>getComputedStyle(e).fontFamily") == page.locator('html').evaluate("e=>getComputedStyle(e).getPropertyValue('--font-display').trim()")
            for label in section.locator('.sim-label').all():
                assert label.evaluate("e=>getComputedStyle(e).fontWeight") == '500'
            if width > 900:
                cells = [element.bounding_box() for element in section.locator('.sim-grid > div').all()]
                assert max(c['y'] for c in cells) < min(c['y'] + c['height'] for c in cells), cells
                main_height = section.locator('.sim-grid').bounding_box()['height'] + 36
                assert 110 <= main_height <= 135, main_height
        cta = section.get_by_role('link', name='Échangeons sur votre cas')
        existing = page.get_by_role('link', name='Réservez un échange de 30 minutes', exact=True)
        for attr in ['href', 'target', 'rel']:
            assert cta.get_attribute(attr) == existing.get_attribute(attr)
        colors = cta.evaluate("e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color,fill:getComputedStyle(e).webkitTextFillColor})")
        expected = {'bg': 'rgb(31, 43, 79)', 'fg': 'rgb(250, 252, 255)'} if theme == 'light' else {'bg': 'rgb(250, 252, 255)', 'fg': 'rgb(31, 43, 79)'}
        assert colors['bg'] == expected['bg'] and colors['fg'] == colors['fill'] == expected['fg'], colors
        old_background = section.locator('.sim-band').evaluate("e=>getComputedStyle(e).backgroundColor")
        page.locator('.theme-toggle').click()
        assert section.locator('.sim-band').evaluate("e=>getComputedStyle(e).backgroundColor") != old_background
        assert range_input.input_value() == '9'
        page.close()
    # Les points d’entrée partagés gardent leur destination sur chaque page concernée.
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    for path in root.rglob('*.html'):
        if '/js/time-entry.js' not in path.read_text():
            continue
        page.goto(base + '/' + path.relative_to(root).as_posix())
        assert page.locator('.time-floating').get_attribute('href') == '/#simulateur', path
    browser.close()
assert not errors, errors
print('PASS : calculs aux bornes et valeurs intermédiaires, clavier, 4 largeurs, 2 thèmes, bascule sans perte de saisie, CTA et liens partagés')
