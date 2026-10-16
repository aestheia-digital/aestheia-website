"""Vérifications navigateur locales : python3 tests/smoke-simulator.py --base-url http://127.0.0.1:8001"""
import argparse
import json
from pathlib import Path
import re
import shutil
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:8000')
parser.add_argument('--report')
args = parser.parse_args()
base = args.base_url.rstrip('/')
root = Path(__file__).resolve().parents[1]
examples = [
    ('medecine-esthetique', {'rappels': 6, 'devis': 3}, '3\u00a0h\u00a030 à 4\u00a0h\u00a030', 'soit 160 à 205 h par an'),
    ('spa-hotelier', {'demandes': 4, 'echanges': 4, 'analyse': 2}, '3\u00a0h\u00a030 à 5\u00a0h', 'soit 165 à 230 h par an'),
    ('thalasso-thermal', {'dossiers': 5, 'echanges': 4, 'avis': 2}, '3\u00a0h\u00a045 à 5\u00a0h\u00a030', 'soit 175 à 255 h par an'),
    ('instituts-independantes', {'suivi': 4, 'messages': 2, 'contenus': 3}, '3\u00a0h à 4\u00a0h\u00a030', 'soit 140 à 205 h par an'),
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
                assert ('rgb(91, 63, 216)' if theme == 'light' else 'rgb(139, 123, 255)') in bg and 'rgb(56, 189, 248)' in bg, bg
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
                assert page.locator('.time-profiles [aria-pressed=true]').get_attribute('data-profile') == profile
                assert page.locator('.time-invite').is_visible()
                for task, hours in values.items():
                    page.locator(f'[data-task="{task}"]').fill(str(hours))
                assert page.locator('.time-result-value [data-time-final]').inner_text() == week
                assert page.locator('.time-annual [data-time-final]').inner_text() == annual
                assert page.locator('.time-benefit').evaluate('(e)=>parseFloat(getComputedStyle(e).paddingLeft)') >= 19
                assert page.locator('.time-result').get_attribute('aria-live') == 'polite'
                assert page.locator('.time-email').count() == 0
                assert page.locator('.time-results a[href^="mailto:"]').count() == 0
                assert page.locator('.time-declared').inner_text() == f'{sum(values.values())}\u00a0h par semaine'
                assert page.locator('.time-calculated > p').all_text_contents()[:2] == ['Temps déclaré, toutes tâches confondues', f'{sum(values.values())}\u00a0h par semaine']
                assert not re.search(r'\d+\.\d|%', page.locator('[data-time-simulator]').inner_text())
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                if profile == 'medecine-esthetique':
                    assert 'clientes' not in page.locator('[data-time-simulator]').inner_text()
                    assert 'patients' in page.locator('.time-benefit').inner_text()
                page.locator('.time-profiles button[aria-pressed=false]').first.click()
                assert all(field.input_value() == '0' for field in page.locator('.time-task input').all())
                assert page.locator('.time-calculated').is_hidden()
                page.goto(base + '/?theme=' + theme)
                banner = page.locator('.time-banner')
            print(f'PASS : {theme}, {width} px')
    page.goto(base + '/simulateur-gain-de-temps/')
    assert page.locator('.time-profiles [aria-pressed=true]').get_attribute('data-profile') == 'spa-hotelier'
    stored = page.evaluate('JSON.stringify({local:{...localStorage},session:{...sessionStorage},cookies:document.cookie})')
    requests = []
    page.on('request', lambda request: requests.append(request.url))
    page.locator('[data-profile=medecine-esthetique]').click()
    page.locator('.time-task input').first.focus()
    page.keyboard.press('ArrowRight')
    assert abs(float(page.locator('.time-task input').first.input_value()) - 1/12) < 1e-10
    assert page.locator('.time-task output').first.inner_text() == '5\u00a0min'
    assert page.locator('.time-result-value [data-time-final]').inner_text() == 'moins de 15\u00a0min'
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
    # New presentation checks, with real pixel samples of the shared ribbon.
    from io import BytesIO
    from PIL import Image
    report['ribbons'] = []
    report['weights'] = []
    for theme in ['light', 'dark']:
        for width in [1440, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1000})
            page.goto(base + '/?theme=' + theme)
            page.evaluate('document.fonts.ready')
            for selector in ['.time-banner-inner', '.time-banner-sectors', '.time-banner-link', '.time-floating']:
                assert page.locator(selector).evaluate('e=>getComputedStyle(e).borderRadius') == '0px', selector
            weights = page.evaluate('''()=>Object.fromEntries(['.time-banner h3','.time-banner-name','.time-banner-weekly','.time-banner-annual','.time-banner-link','.time-floating'].map(s=>[s,Number(getComputedStyle(document.querySelector(s)).fontWeight)]))''')
            assert weights['.time-banner-link'] == weights['.time-floating'] == 500, weights
            assert max(weights.values()) <= 600, weights
            assert weights['.time-banner-weekly'] == weights['.time-banner-annual'] == 500, weights
            for count in page.locator('.time-banner .time-count').all():
                assert count.evaluate('e=>getComputedStyle(e).fontVariantNumeric') == 'tabular-nums'
            if width == 1440:
                report['weights'].append({'theme': theme, 'home': weights})
                note = page.locator('.transition-note').filter(has_text='Résultat recherché')
                style = note.evaluate("e=>({image:getComputedStyle(e,'::before').backgroundImage,width:getComputedStyle(e,'::before').width,padding:getComputedStyle(e).paddingLeft})")
                assert style['width'] == '3px' and float(style['padding'][:-2]) >= 19
                pixels = Image.open(BytesIO(note.screenshot())).convert('RGB')
                samples = []
                for at in [.05, .95]:
                    y = min(pixels.height - 1, int(pixels.height * at))
                    color = pixels.getpixel((1, y))
                    adjacent = pixels.getpixel((10, y))
                    samples.append({'height': at, 'color': '#%02X%02X%02X' % color, 'contrast': round(contrast(color, adjacent), 2)})
                assert samples[0]['color'] != samples[1]['color'], samples
                report['ribbons'].append({'theme': theme, 'computed': style, 'samples': samples})
            page.goto(base + '/simulateur-gain-de-temps/?theme=' + theme)
            for selector in ['.time-inputs', '.time-results', '.time-profiles button', '.time-action']:
                for element in page.locator(selector).all():
                    assert element.evaluate('e=>getComputedStyle(e).borderRadius') == '0px', selector
            excessive = page.locator('[data-time-simulator]').evaluate('''root=>[...root.querySelectorAll('*')].filter(e=>e.childNodes.length && [...e.childNodes].some(n=>n.nodeType===3 && n.textContent.trim()) && !e.closest('.time-result-value') && Number(getComputedStyle(e).fontWeight)>500).map(e=>e.outerHTML)''')
            assert not excessive, excessive
            invite = page.locator('.time-invite')
            assert invite.evaluate('e=>getComputedStyle(e).fontWeight') == '400'
            booking = page.locator('.time-booking')
            colors = booking.evaluate('e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderTopColor})')
            assert colors == {'fg': 'rgb(31, 43, 79)', 'bg': 'rgb(255, 255, 255)', 'border': 'rgb(31, 43, 79)'}, colors
            page.locator('.time-task input').first.fill('10')
            booking.hover()
            assert booking.evaluate('e=>getComputedStyle(e).backgroundColor') == 'rgb(237, 242, 251)'
            booking.focus()
            # Keyboard focus must remain visible independently of hover.
            page.keyboard.press('Tab')
            page.keyboard.press('Shift+Tab')
            assert booking.evaluate('e=>getComputedStyle(e).outlineWidth') == '2px'
            assert contrast([31, 43, 79], [255, 255, 255]) >= 4.5
            assert booking.get_attribute('href') == 'https://calendar.app.google/qx6dT7WJfTrsFe6j9'
            assert booking.evaluate('e=>getComputedStyle(e).borderTopColor') == 'rgb(31, 43, 79)'
            assert page.locator('.time-benefit').evaluate("e=>getComputedStyle(e,'::before').width") == '3px'
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

    report['start_action'] = []
    for theme in ['light', 'dark']:
        for width in [1440, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1000})
            page.goto(base + '/simulateur-gain-de-temps/?theme=' + theme)
            page.evaluate('document.fonts.ready')
            start = page.locator('.time-start')
            booking = page.locator('.time-booking')
            assert start.is_hidden() and booking.is_visible()
            assert page.locator('.time-invite').inner_text() == 'Déplacez un curseur pour voir votre gain'
            page.locator('.time-task input').first.fill('5')
            assert start.is_visible()
            assert page.locator('.time-actions a').all_text_contents() == ['Savoir par où commencer', 'Réserver un échange de 30 minutes']
            assert start.get_attribute('href') == '/#premier-pas' and start.get_attribute('target') is None
            assert booking.get_attribute('href') == 'https://calendar.app.google/qx6dT7WJfTrsFe6j9'
            a,b = start.bounding_box(),booking.bounding_box()
            assert abs(a['width']-b['width']) < 1 and abs(a['height']-b['height']) < 1, (theme,width,a,b)
            assert abs(b['y']-a['y']-a['height']-12) < 1
            style = start.evaluate('e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,border:getComputedStyle(e).borderTopColor,radius:getComputedStyle(e).borderRadius,weight:getComputedStyle(e).fontWeight,size:getComputedStyle(e).fontSize})')
            assert style['bg'] == 'rgb(91, 63, 216)' and style['color'] == 'rgb(255, 255, 255)',style
            assert style['border'] == 'rgba(0, 0, 0, 0)' and style['radius'] == '0px' and style['weight'] == '500',style
            assert style['size'] == booking.evaluate('e=>getComputedStyle(e).fontSize')
            ratio = contrast(rgb(style['color']),rgb(style['bg']))
            assert ratio >= 4.5
            start.hover()
            assert start.evaluate('e=>getComputedStyle(e).backgroundColor') == 'rgb(108, 77, 230)'
            assert contrast([255,255,255],[108,77,230]) >= 4.5
            start.focus()
            page.keyboard.press('Tab')
            assert booking.evaluate('e=>e===document.activeElement')
            page.keyboard.press('Shift+Tab')
            assert start.evaluate('e=>e===document.activeElement && getComputedStyle(e).outlineWidth==="2px"')
            page.locator('.time-task input').first.fill('0')
            assert start.is_hidden() and booking.is_visible() and page.locator('.time-invite').is_visible()
            page.locator('.time-task input').first.fill('5')
            start.click()
            page.wait_for_url(base + '/#premier-pas')
            page.evaluate('document.fonts.ready')
            page.wait_for_function('''()=>{const top=document.querySelector("#premier-pas").getBoundingClientRect().top;return top>=Math.max(0,document.querySelector(".site-header").getBoundingClientRect().bottom) && top<innerHeight/2}''')
            target = page.locator('#premier-pas')
            assert target.locator('.eyebrow').text_content().strip() == 'Premier pas', (theme,width,repr(target.locator('.eyebrow').text_content()),page.url)
            assert target.get_by_role('link',name='Parlez-moi de votre projet',exact=True).get_attribute('href') == 'https://forms.gle/W7JrgaJ6yDSuwgFe7'
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            report['start_action'].append({'theme':theme,'width':width,'contrast':round(ratio,2),'height':round(a['height'],2),'anchor':page.url})

    # Long duration labels, declared total, and the retained booking action.
    report['minute_layouts'] = []
    for theme in ['light', 'dark']:
        for width in [1440, 1024, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1000})
            page.goto(base + '/?theme=' + theme)
            page.evaluate('document.fonts.ready')
            assert page.locator('.time-banner-weekly [data-time-final]').all_text_contents() == [item[2] for item in examples]
            assert page.locator('.time-banner-annual [data-time-final]').all_text_contents() == [item[3] for item in examples]
            # Every complete hour/minute duration occupies one line, including the animated overlay.
            for element in page.locator('.time-banner-weekly [data-time-final]').all():
                assert element.evaluate("""e => {
                    const node=e.firstChild;
                    return [...node.textContent.matchAll(/\\d+\\u00a0(?:h(?:\\u00a0\\d+)?|min)/g)].every(match=>{
                        const r=document.createRange();r.setStart(node,match.index);r.setEnd(node,match.index+match[0].length);
                        return r.getClientRects().length===1;
                    });
                }""")
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.goto(base + '/simulateur-gain-de-temps/?theme=' + theme)
            inputs = page.locator('.time-task input')
            assert all(abs(float(field.get_attribute('step')) - 1/12) < 1e-10 and field.get_attribute('max') == '20' for field in inputs.all())
            for value, expected in [('0', '0\u00a0h'), (str(1/3), '20\u00a0min'), ('0.75', '45\u00a0min'), ('1', '1\u00a0h'), ('1.25', '1\u00a0h\u00a015'), ('2.5', '2\u00a0h\u00a030'), ('20', '20\u00a0h')]:
                if value == str(1/3):
                    inputs.first.press('Home')
                    for _ in range(4):
                        inputs.first.press('ArrowRight')
                else:
                    inputs.first.fill(value)
                assert page.locator('.time-task output').first.inner_text() == expected
            inputs.first.fill('1.25')
            inputs.nth(1).fill('8.25')
            assert page.locator('.time-declared').inner_text() == '9\u00a0h\u00a030 par semaine'
            declared = page.locator('.time-declared')
            assert declared.evaluate('e=>getComputedStyle(e).fontWeight') == '400'
            assert declared.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)') < page.locator('.time-result-value').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')
            assert not re.search(r'\d+[,.]\d+\s*h', page.locator('.time-calculated').inner_text())
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            report['minute_layouts'].append({'theme': theme, 'width': width, 'passed': True})

    # Sector banners are removed; floating entry links keep their existing safeguards.
    report['sector_entries'] = []
    for theme in ['light', 'dark']:
        for width in [1440, 1024, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1000})
            for sector in [None, *[item[0] for item in examples]]:
                page.goto(base + '/' + (sector + '/' if sector else '') + '?theme=' + theme)
                page.evaluate('document.fonts.ready')
                if page.get_by_role('button', name='Tout refuser', exact=True).is_visible():
                    page.get_by_role('button', name='Tout refuser', exact=True).click()
                assert page.locator('.time-floating').count() == page.locator('.time-floating-space').count() == 1
                floating = page.locator('.time-floating')
                expected = '/simulateur-gain-de-temps/' + ('?profil=' + sector if sector else '')
                assert floating.get_attribute('href') == expected
                if sector:
                    assert page.locator('.time-banner,#time-banner-title').count() == 0
                    assert not page.locator('a[href*="#time-banner"]').count()
                    join = page.locator('.conversion-band').evaluate("""e=>{
                        const previous=e.previousElementSibling;
                        return {gap:e.getBoundingClientRect().top-previous.getBoundingClientRect().bottom,
                          previousMargin:getComputedStyle(previous).marginBottom,margin:getComputedStyle(e).marginTop};
                    }""")
                    assert abs(join['gap']) < 1 and join['previousMargin'] == join['margin'] == '0px', (sector,theme,width,join)
                else:
                    assert page.locator('.time-banner').count() == 1
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                visible_at = None
                max_scroll = page.evaluate('document.documentElement.scrollHeight-innerHeight')
                # Fine scroll samples find genuine gaps without disabling collision protection.
                for y in range(0, int(max_scroll) + 1, 25):
                    page.evaluate('y=>scrollTo({top:y,behavior:"instant"})', y)
                    page.wait_for_timeout(40)
                    if floating.is_visible():
                        visible_at = y
                        break
                assert visible_at is not None, (sector,theme,width)
                box = floating.bounding_box()
                assert box['x'] >= 0 and box['x'] + box['width'] <= width
                assert floating.evaluate('e=>getComputedStyle(e).borderRadius') == '0px'
                if sector:
                    floating.click()
                    assert page.locator('.time-profiles [aria-pressed=true]').get_attribute('data-profile') == sector
                    assert page.locator('.time-invite').is_visible()
                    assert all(field.input_value() == '0' for field in page.locator('.time-task input').all())
                report['sector_entries'].append({'page':sector or 'home','theme':theme,'width':width,'visible_at':visible_at,'href':expected})

    # The desktop sweep retains its 6 s cycle and 1.44 s forward passage, with no return.
    halo = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='no-preference')
    for theme in ['light', 'dark']:
        halo.goto(base + '/?theme=' + theme)
        sweep = halo.locator('.site-header .header-phone-direct').evaluate("""e=>{
            const a=e.getAnimations().find(a=>a.animationName==='header-phone-night-blue-wave');
            a.pause();
            const positions=[0,1680,2000,2500,3120,4000,5999].map(t=>{a.currentTime=t;return parseFloat(getComputedStyle(e).backgroundPositionX)});
            return {duration:a.effect.getTiming().duration,positions,frames:a.effect.getKeyframes().map(f=>parseFloat(f.backgroundPositionX)),image:getComputedStyle(e).backgroundImage};
        }""")
        assert sweep['duration'] == 6000 and sweep['frames'] == [100, 100, 0, 0], sweep
        if theme == 'dark':
            assert sweep['positions'][0] == 100 and sweep['positions'][-1] == 0, sweep
            assert all(a >= b for a,b in zip(sweep['positions'],sweep['positions'][1:])), sweep
        else:
            # The existing day header rule masks the gradient; preserve that approved surface.
            assert sweep['image'] == 'none', sweep
        halo.emulate_media(reduced_motion='reduce')
        assert halo.locator('.header-phone-direct').evaluate('e=>getComputedStyle(e).animationName') == 'none'
        halo.emulate_media(reduced_motion='no-preference')
    halo.close()

    # Exercise actual animation, including interrupted slider input and reduced motion.
    animated = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='no-preference')
    animated.on('pageerror', lambda error: errors.append(str(error)))
    animated.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    animated.goto(base + '/?theme=light')
    if animated.get_by_role('button', name='Tout refuser', exact=True).is_visible():
        animated.get_by_role('button', name='Tout refuser', exact=True).click()
    animated.evaluate('document.fonts.ready')
    banner = animated.locator('.time-banner')
    texts = banner.locator('[data-time-final]').all_text_contents()
    initial_height = banner.bounding_box()['height']
    animated.evaluate("document.querySelector('.time-banner').scrollIntoView({block:'center',behavior:'instant'})")
    animated.wait_for_function("document.querySelector('.time-banner [data-time-visual]') !== null")
    assert banner.locator('[data-time-final]').all_text_contents() == texts
    assert all(text.replace('\u00a0', ' ') in banner.aria_snapshot().replace('\u00a0', ' ') for text in texts)
    first = banner.locator('[data-time-visual]').all_text_contents()
    assert first != texts, first
    animated.wait_for_timeout(450)
    middle = banner.locator('[data-time-visual]').all_text_contents()
    assert middle != first and middle != texts, middle
    assert abs(banner.bounding_box()['height'] - initial_height) < 1
    animated.wait_for_timeout(1450)
    assert banner.locator('[data-time-visual]').all_text_contents() == texts
    assert banner.locator('[aria-live]').count() == 0
    assert banner.locator('[data-time-visual][aria-hidden=true]').count() == 8
    animated.evaluate('scrollTo({top:0,behavior:"instant"})')
    animated.wait_for_timeout(80)
    animated.evaluate("document.querySelector('.time-banner').scrollIntoView({block:'center',behavior:'instant'})")
    animated.wait_for_timeout(100)
    assert banner.locator('[data-time-visual]').all_text_contents() != texts
    animated.wait_for_timeout(1800)
    assert banner.locator('[data-time-visual]').all_text_contents() == texts
    for profile, values, week, annual in examples:
        animated.goto(base + '/simulateur-gain-de-temps/?profil=' + profile)
        for task, hours in values.items():
            animated.locator(f'[data-task="{task}"]').fill(str(hours))
        assert animated.locator('.time-result-value [data-time-final]').text_content() == week
        assert animated.locator('.time-annual [data-time-final]').text_content() == annual
        animated.wait_for_timeout(450)
        assert animated.locator('.time-result-value [data-time-visual]').text_content() == week
        assert animated.locator('.time-annual [data-time-visual]').text_content() == annual
        slider = animated.locator('.time-task input').first
        slider.fill('20')
        animated.wait_for_timeout(100)
        slider.fill('2')
        animated.wait_for_timeout(100)
        slider.fill('15')
        animated.wait_for_timeout(450)
        for selector in ['.time-result-value', '.time-annual']:
            assert animated.locator(selector + ' [data-time-visual]').text_content() == animated.locator(selector + ' [data-time-final]').text_content()
        slider.fill('8')
        animated.emulate_media(reduced_motion='reduce')
        animated.wait_for_function("[...document.querySelectorAll('.time-result-value, .time-annual')].every(e=>e.querySelector('[data-time-visual]').textContent===e.querySelector('[data-time-final]').textContent)")
        for selector in ['.time-result-value', '.time-annual']:
            assert animated.locator(selector + ' [data-time-visual]').text_content() == animated.locator(selector + ' [data-time-final]').text_content()
        animated.emulate_media(reduced_motion='no-preference')
    for theme in ['light', 'dark']:
        for width in [1440, 1024, 768, 390, 320]:
            animated.set_viewport_size({'width': width, 'height': 1000})
            animated.goto(base + '/?theme=' + theme)
            animated.evaluate('document.fonts.ready')
            banner = animated.locator('.time-banner')
            height = banner.bounding_box()['height']
            animated.evaluate("document.querySelector('.time-banner').scrollIntoView({block:'center',behavior:'instant'})")
            animated.wait_for_function("document.querySelector('.time-banner [data-time-visual]') !== null")
            for delay in [200, 400, 1300]:
                animated.wait_for_timeout(delay)
                assert abs(banner.bounding_box()['height'] - height) < 1
                assert animated.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert banner.locator('[data-time-visual]').all_text_contents() == texts
            animated.goto(base + '/simulateur-gain-de-temps/?theme=' + theme)
            animated.locator('.time-task input').first.fill('10')
            animated.wait_for_timeout(150)
            assert animated.evaluate('document.documentElement.scrollWidth <= innerWidth')
            animated.wait_for_timeout(300)
            for selector in ['.time-result-value', '.time-annual']:
                assert animated.locator(selector + ' [data-time-visual]').text_content() == animated.locator(selector + ' [data-time-final]').text_content()
    # Without JavaScript the HTML still contains every final banner value.
    plain = browser.new_page(java_script_enabled=False)
    plain.goto(base + '/')
    assert plain.locator('.time-banner-weekly, .time-banner-annual').all_text_contents() == texts
    report['animation'] = 'PASS: final values, interruptions, reduced motion, replay on reentry, no layout jump, no JavaScript'
    report['white_button_contrast'] = round(contrast([31, 43, 79], [255, 255, 255]), 2)
    assert not errors, errors
    browser.close()
if args.report:
    Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False))
