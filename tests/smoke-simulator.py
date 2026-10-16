"""Vérifications navigateur locales : python3 tests/smoke-simulator.py --base-url http://127.0.0.1:8001"""
import argparse
import json
from pathlib import Path
import re
import shutil
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:8000')
parser.add_argument('--report')
args = parser.parse_args()
base = args.base_url.rstrip('/')
root = Path(__file__).resolve().parents[1]
examples = [
    ('medecine-esthetique', {'rappels': 6, 'devis': 3}, '3,5 à 4,5 h', 'soit 160 à 205 h par an'),
    ('spa-hotelier', {'demandes': 4, 'echanges': 4, 'analyse': 2}, '3,5 à 5 h', 'soit 165 à 230 h par an'),
    ('thalasso-thermal', {'dossiers': 5, 'echanges': 4, 'avis': 2}, '4 à 5,5 h', 'soit 175 à 255 h par an'),
    ('instituts-independantes', {'suivi': 4, 'messages': 2, 'contenus': 3}, '3 à 4,5 h', 'soit 140 à 205 h par an'),
]
report = {'banner': [], 'contrast': [], 'fallback': False}


def rgb(value):
    return [float(n) for n in re.findall(r'[\d.]+', value)][:3]


def contrast(a, b):
    def lum(color):
        values = [v / 255 for v in color]
        values = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
        return sum(v * w for v, w in zip(values, [.2126, .7152, .0722]))
    low, high = sorted([lum(a), lum(b)])
    return (high + .05) / (low + .05)


def align_cards(page):
    cards = page.locator('.offer-card')
    sizes = [c.bounding_box()['height'] for c in cards.all()]
    assert max(sizes) - min(sizes) < 1, sizes
    for selector in ['h3', 'p[data-offer-content]:not(.commercial-offer-proposal):not(.offer-result)', '.commercial-offer-proposal', '.offer-result']:
        boxes = [c.locator(selector).bounding_box() for c in cards.all() if c.locator(selector).is_visible()]
        if boxes:
            assert max(b['y'] for b in boxes) - min(b['y'] for b in boxes) < 1, (selector, boxes)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    page = browser.new_page(reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    for theme in ['light', 'dark']:
        for width in [1440, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1000})
            page.goto(base + '/?theme=' + theme)
            if page.get_by_role('button', name='Tout refuser', exact=True).is_visible():
                page.get_by_role('button', name='Tout refuser', exact=True).click()
            page.evaluate('document.fonts.ready')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            for note in page.locator('.transition-note').all():
                bg = note.evaluate("e=>getComputedStyle(e,'::before').backgroundImage")
                assert 'rgb(62, 62, 193)' in bg and 'rgb(55, 127, 215)' in bg, bg
            banner = page.locator('.time-banner')
            report['banner'].append({'theme': theme, 'width': width, 'height': round(banner.bounding_box()['height'])})
            bg = banner.locator('.time-banner-inner').evaluate('(e)=>({color:getComputedStyle(e).backgroundColor,image:getComputedStyle(e).backgroundImage})')
            assert ('rgb(239, 235, 252)' in bg['image']) if theme == 'light' else bg['color'] == 'rgb(24, 33, 79)'
            backgrounds = [[239, 235, 252], [227, 236, 252]] if theme == 'light' else [[24, 33, 79]]
            for selector in ['h3', '.time-banner-intro p', '.time-banner-note', '.time-banner-name', '.time-banner-task', '.time-banner-weekly', '.time-banner-unit', '.time-banner-annual', '.time-banner-link']:
                fg = rgb(banner.locator(selector).first.evaluate('(e)=>getComputedStyle(e).color'))
                surfaces = backgrounds
                if selector not in ['h3', '.time-banner-intro p', '.time-banner-note', '.time-banner-link']:
                    surfaces = [[255 * .8 + v * .2 for v in color] for color in backgrounds] if theme == 'light' else [[16, 23, 63]]
                if selector == '.time-banner-link':
                    surfaces = [rgb(banner.locator(selector).evaluate('(e)=>getComputedStyle(e).backgroundColor'))]
                ratio = min(contrast(fg, surface) for surface in surfaces)
                if width == 1440:
                    report['contrast'].append({'theme': theme, 'selector': selector, 'ratio': round(ratio, 2), 'AA': ratio >= 4.5})
            cards = page.locator('.offer-card')
            assert page.locator('.offer-disclosure[aria-expanded=true]').count() == 0
            if width == 1440:
                for indexes in [[0], [1], [2, 3]]:
                    for index in indexes:
                        cards.nth(index).locator('button').click()
                    align_cards(page)
                for index in [0, 2]:
                    cards.nth(index).locator('button').click()
                align_cards(page)
            else:
                before = cards.nth(1).bounding_box()['height']
                cards.nth(0).locator('button').click()
                assert cards.nth(1).bounding_box()['height'] == before
            # Check the existing floating control while scanning the page.
            for progress in [0, .2, .4, .6, .8, 1]:
                page.evaluate('p=>scrollTo({top:p*(document.body.scrollHeight-innerHeight),behavior:"instant"})', progress)
                page.wait_for_timeout(40)
                floating = page.locator('.time-floating')
                if floating.is_visible():
                    box = floating.bounding_box()
                    if box is None:
                        continue
                    assert width - box['x'] - box['width'] >= 15.9
                    assert box['x'] >= 0
                    assert floating.evaluate('(e)=>getComputedStyle(e).borderRadius') == '0px'
                    collisions = floating.evaluate("""e => {
                        if (e.hidden) return [];
                        const a=e.getBoundingClientRect();
                        return [...document.querySelectorAll('a,button,input,select,iframe')].filter(other=>{
                            if (other===e || other.contains(e) || e.contains(other)) return false;
                            const b=other.getBoundingClientRect();
                            return b.width>0 && b.height>0 && a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
                        }).map(other=>other.tagName+':'+other.textContent.trim().slice(0,50));
                    }""")
                    assert not collisions, collisions
            banner.scroll_into_view_if_needed()
            page.wait_for_timeout(80)
            assert page.locator('.time-floating').is_hidden()
            for profile, values, week, annual in examples:
                href = banner.locator(f'a[href="/simulateur-gain-de-temps/?profil={profile}"]').last.get_attribute('href')
                page.goto(base + href + '&theme=' + theme)
                assert page.locator('.time-task input').count() == 6
                assert page.locator('[aria-pressed=true]').get_attribute('data-profile') == profile
                assert page.locator('.time-invite').is_visible()
                for task, hours in values.items():
                    page.locator(f'[data-task="{task}"]').fill(str(hours))
                assert page.locator('.time-result-value').inner_text() == week
                assert page.locator('.time-annual').inner_text() == annual
                assert page.locator('.time-benefit').evaluate('(e)=>parseFloat(getComputedStyle(e).paddingLeft)') >= 19
                assert page.locator('.time-result').get_attribute('aria-live') == 'polite'
                body = parse_qs(urlparse(page.locator('.time-email').get_attribute('href')).query)['body'][0]
                for label in page.locator('.time-task label').all_text_contents():
                    assert label in body
                assert 'Secteur :' in body and week + ' par semaine' in body
                assert not re.search(r'\d+\.\d|%', page.locator('[data-time-simulator]').inner_text())
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                if profile == 'medecine-esthetique':
                    assert 'clientes' not in page.locator('[data-time-simulator]').inner_text()
                    assert 'patients' in page.locator('.time-benefit').inner_text()
                page.locator('.time-profiles button[aria-pressed=false]').first.click()
                assert all(field.input_value() == '0' for field in page.locator('.time-task input').all())
                assert page.locator('.time-email').get_attribute('href') is None
                page.goto(base + '/?theme=' + theme)
                banner = page.locator('.time-banner')
            print(f'PASS : {theme}, {width} px')
    page.goto(base + '/simulateur-gain-de-temps/')
    assert page.locator('[aria-pressed=true]').get_attribute('data-profile') == 'spa-hotelier'
    stored = page.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage},cookies:document.cookie})')
    requests = []
    page.on('request', lambda request: requests.append(request.url))
    page.locator('[data-profile=medecine-esthetique]').click()
    page.locator('.time-task input').first.focus()
    page.keyboard.press('ArrowRight')
    assert page.locator('.time-task input').first.input_value() == '0.5'
    assert page.locator('.time-result-value').inner_text() == 'moins de 0,5 h'
    assert page.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage},cookies:document.cookie})') == stored
    assert not requests
    # Exercise the fallback with subgrid disabled only in this test page.
    fallback = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    css = (root / 'css/home-certifications.css').read_text().replace('@supports (grid-template-rows: subgrid)', '@supports (unsupported-test: true)').replace('@supports not (grid-template-rows: subgrid)', '@supports (display: grid)')
    fallback.route('**/css/home-certifications.css*', lambda route: route.fulfill(body=css, content_type='text/css'))
    fallback.add_init_script("const originalSupports=CSS.supports.bind(CSS);CSS.supports=(property,value)=>property==='grid-template-rows'&&value==='subgrid'?false:originalSupports(property,value)")
    fallback.on('pageerror', lambda error: errors.append(str(error)))
    fallback.goto(base + '/')
    fallback.evaluate('document.fonts.ready')
    for i in [0, 1, 2, 3]:
        fallback.locator('.offer-disclosure').nth(i).click()
        fallback.wait_for_timeout(60)
        align_cards(fallback)
    expanded_height = fallback.locator('.offer-card').first.bounding_box()['height']
    for _ in range(3):
        fallback.evaluate('dispatchEvent(new Event("resize"))')
        fallback.wait_for_timeout(60)
        align_cards(fallback)
        assert abs(fallback.locator('.offer-card').first.bounding_box()['height'] - expanded_height) < 1
    for button in fallback.locator('.offer-disclosure').all():
        button.click()
    fallback.wait_for_timeout(60)
    align_cards(fallback)
    assert fallback.locator('.offer-card').first.bounding_box()['height'] < expanded_height
    report['fallback'] = True
    assert all(item['AA'] for item in report['contrast']), report['contrast']
    assert not errors, errors
    browser.close()
if args.report:
    Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False))
