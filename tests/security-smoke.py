"""Browser checks: python tests/security-smoke.py --base-url https://DEPLOY-PREVIEW

Third-party services are stubbed: these checks never send Analytics events.
They verify the parent site's CSP and consent gating, not Google's service health.
"""
import argparse
import json
import shutil
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', required=True)
args = parser.parse_args()
base = args.base_url.rstrip('/')
origin = urlsplit(base).netloc
root = Path(__file__).resolve().parents[1]
failures = []
external_requests = []

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    context = browser.new_context(reduced_motion='reduce')

    def external_stub(route):
        url = route.request.url
        if urlsplit(url).netloc == origin:
            return route.continue_()
        external_requests.append(url)
        if url.startswith('https://www.googletagmanager.com/gtag/js?'):
            return route.fulfill(content_type='application/javascript', body='window.__gaLoadedForTest = true;')
        if url.startswith('https://maps.google.com/'):
            return route.fulfill(content_type='text/html', body='<p>Map service stub</p>')
        return route.abort()

    context.route('**/*', external_stub)
    context.add_init_script("""window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', e =>
        window.__cspViolations.push({directive:e.effectiveDirective, blocked:e.blockedURI}));""")
    page = context.new_page()
    page.on('pageerror', lambda error: failures.append(str(error)))
    paths = sorted(root.rglob('*.html'))
    for path in paths:
        url = base + '/' + path.relative_to(root).as_posix()
        response = page.goto(url, wait_until='networkidle')
        assert response.status == 200, (url, response.status)
        headers = response.all_headers()
        assert headers.get('x-frame-options') == 'DENY', url
        assert headers.get('x-content-type-options') == 'nosniff', url
        assert headers.get('referrer-policy') == 'strict-origin-when-cross-origin', url
        assert "frame-ancestors 'none'" in headers.get('content-security-policy', ''), url
        assert "script-src-attr 'none'" in headers['content-security-policy'], url
        assert 'camera=()' in headers.get('permissions-policy', ''), url
        assert page.locator('h1').count() == 1, url
        assert page.evaluate('window.__cspViolations') == [], (url, page.evaluate('window.__cspViolations'))
    assert external_requests == [], external_requests

    page.goto(base + '/', wait_until='networkidle')
    assert page.locator('script[data-aestheia-ga]').count() == 0
    assert page.locator('[data-consent-map] iframe').count() == 0
    page.locator('[data-consent-refuse]').click()
    page.reload(wait_until='networkidle')
    assert external_requests == [], external_requests
    assert page.locator('[data-consent-banner]').is_hidden()

    for width in [390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 1000})
        for theme in ['light', 'dark']:
            page.evaluate('sessionStorage.clear()')
            page.goto(base + '/?theme=' + theme, wait_until='networkidle')
            assert page.locator('html').get_attribute('data-theme') == theme
            page.locator('#sim-heures').fill('30')
            assert page.locator('#sim-gain').inner_text() == '12 h à 15 h'
            page.locator('.theme-toggle').click()
            assert page.locator('html').get_attribute('data-theme') != theme
            assert page.locator('#sim-heures').input_value() == '30'
            assert page.evaluate('window.__cspViolations') == []

    page.evaluate('localStorage.clear()')
    page.reload(wait_until='networkidle')
    page.locator('[data-consent-accept]').click()
    page.wait_for_function('window.__gaLoadedForTest === true')
    assert page.locator('[data-consent-map] iframe').count() == 1
    page.locator('[data-consent-map] iframe').scroll_into_view_if_needed()
    page.wait_for_timeout(500)
    assert any(u.startswith('https://maps.google.com/') for u in external_requests)
    assert page.evaluate('window.__cspViolations') == []
    page.evaluate('window.AestheiaConsent.openPreferences()')
    page.locator('[data-consent-analytics]').uncheck()
    page.locator('[data-consent-external]').uncheck()
    page.locator('[data-consent-save]').click()
    assert page.locator('script[data-aestheia-ga]').count() == 0
    assert page.locator('[data-consent-map] iframe').count() == 0
    assert page.evaluate("window['ga-disable-G-66HBEWJ4CB']") is True

    # An injected executable inline script must be refused by the browser.
    page.evaluate("""() => { const s = document.createElement('script');
      s.textContent = 'window.__unexpectedInlineRan = true'; document.body.append(s); }""")
    page.wait_for_function("window.__cspViolations.some(v => v.blocked === 'inline')")
    assert page.evaluate('window.__unexpectedInlineRan === undefined')
    assert not failures, failures
    browser.close()

print(json.dumps({'result': 'PASS', 'pages': len(paths), 'viewports': [390, 768, 1440],
  'themes': ['light', 'dark'], 'checks': ['headers', 'no unintended CSP violations',
  'consent initial/refused/accepted/revoked', 'simulator', 'theme toggle',
  'inline JavaScript blocked'], 'third_party_services': 'stubbed; no Analytics events sent'}))
