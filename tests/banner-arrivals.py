"""Arrivées sur le bandeau et relevés des animations dans Chromium."""
import argparse
import json
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:8001')
parser.add_argument('--report')
args = parser.parse_args()
base = args.base_url.rstrip('/')
report = {'arrivals': {}, 'simulator': {}, 'resources': [], 'errors': []}
visuals = '.time-banner-weekly, .time-banner-annual'
probe = '''window.countWriters=[];
const content=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
Object.defineProperty(Node.prototype,'textContent',{...content,set(value){
  if(this.nodeType===1 && this.closest('.time-banner-weekly,.time-banner-annual'))countWriters.push(new Error().stack);
  return content.set.call(this,value);
}});
document.addEventListener('DOMContentLoaded',()=>{
  const banner=document.querySelector('.time-banner');
  if(!banner)return;
  window.arrival={samples:[],entries:[]};let began=false;
  new IntersectionObserver(entries=>{
    for(const entry of entries){
      arrival.entries.push({at:Math.round(entry.time),ratio:entry.intersectionRatio});
      if(began || !entry.isIntersecting || entry.intersectionRatio<.2)continue;
      began=true;const start=entry.time;
      for(const ms of [200,600,1200,2000])setTimeout(()=>arrival.samples.push({ms,actual:Math.round(performance.now()-start),values:[...banner.querySelectorAll('.time-banner-weekly,.time-banner-annual')].map(e=>(e.querySelector('[data-time-visual]')||e).textContent)}),Math.max(0,ms-(performance.now()-start)));
    }
  },{threshold:[0,.2]}).observe(banner);
})'''

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='no-preference')
    page.add_init_script(probe)
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
    page.on('response', lambda r: report['resources'].append({'url': r.url, 'status': r.status}) if '/js/time-count.js' in r.url else None)
    for mode in ['scroll20', 'anchor', 'initial']:
        page.goto('about:blank')
        page.goto(base + '/?theme=light' + ('#time-banner-title' if mode == 'initial' else ''))
        page.evaluate('document.fonts.ready')
        if page.get_by_role('button', name='Tout refuser', exact=True).is_visible():
            page.get_by_role('button', name='Tout refuser', exact=True).click()
        if mode == 'anchor':
            page.evaluate("location.hash='time-banner-title'")
        elif mode == 'scroll20':
            # Below the trigger no timer runs; all visible numbers stay at zero.
            page.evaluate("const e=document.querySelector('.time-banner'),r=e.getBoundingClientRect();scrollTo({top:scrollY+r.top-innerHeight+r.height*.1,behavior:'instant'})")
            page.wait_for_timeout(250)
            assert page.locator('.time-banner-weekly [data-time-visual]').all_text_contents() == ['0 à 0 h'] * 4
            page.evaluate("const e=document.querySelector('.time-banner'),r=e.getBoundingClientRect();scrollTo({top:scrollY+r.top-innerHeight+r.height*.22,behavior:'instant'})")
        page.wait_for_function('window.arrival?.samples.length===4')
        data = page.evaluate('arrival')
        final = page.locator('.time-banner [data-time-final]').all_text_contents()
        assert data['samples'][0]['values'] != final, data
        assert data['samples'][1]['values'] != data['samples'][0]['values'], data
        assert data['samples'][-1]['values'] == final, data
        assert page.locator('.time-banner [data-time-visual]').all_text_contents() == final
        report['arrivals'][mode] = data
        writers = page.evaluate('countWriters')
        assert writers and all('/js/time-count.js' in stack for stack in writers), writers
        report['writers'] = 'time-count.js uniquement'
        sources = page.evaluate('[...document.scripts].map(s=>s.src).filter(Boolean)')
        assert next(i for i,s in enumerate(sources) if '/js/main.js' in s) < next(i for i,s in enumerate(sources) if '/js/time-count.js' in s) < next(i for i,s in enumerate(sources) if '/js/time-entry.js' in s)
    # Fully leaving the viewport permits a replay, dipping below 20 % alone does not.
    page.evaluate("document.querySelector('.time-banner').scrollIntoView({block:'center',behavior:'instant'})")
    page.wait_for_timeout(1900)
    page.evaluate("const e=document.querySelector('.time-banner'),r=e.getBoundingClientRect();scrollTo({top:scrollY+r.top-innerHeight+r.height*.1,behavior:'instant'})")
    page.wait_for_timeout(100)
    assert page.locator('.time-banner [data-time-visual]').all_text_contents() == final
    page.evaluate("document.querySelector('.time-banner').scrollIntoView({block:'center',behavior:'instant'})")
    page.wait_for_timeout(100)
    assert page.locator('.time-banner [data-time-visual]').all_text_contents() == final
    page.evaluate('scrollTo({top:0,behavior:"instant"})')
    page.wait_for_timeout(100)
    assert page.locator('.time-banner-weekly [data-time-visual]').all_text_contents() == ['0 à 0 h'] * 4
    page.evaluate("document.querySelector('.time-banner').scrollIntoView({block:'center',behavior:'instant'})")
    page.wait_for_timeout(200)
    assert page.locator('.time-banner [data-time-visual]').all_text_contents() != final
    page.wait_for_timeout(1700)
    assert page.locator('.time-banner [data-time-visual]').all_text_contents() == final
    report['reentry'] = 'PASS'
    page.goto(base + '/simulateur-gain-de-temps/?profil=medecine-esthetique&theme=light')
    slider = page.locator('[data-task=rappels]')
    slider.fill('10')
    page.wait_for_timeout(450)
    report['simulator']['from'] = page.locator('.time-result-value [data-time-visual]').text_content()
    page.evaluate('''()=>{
      window.simSamples=[];const input=document.querySelector('[data-task=rappels]');input.value='20';input.dispatchEvent(new Event('input',{bubbles:true}));
      for(const ms of [100,200,450])setTimeout(()=>simSamples.push({ms,weekly:document.querySelector('.time-result-value [data-time-visual]').textContent,annual:document.querySelector('.time-annual [data-time-visual]').textContent}),ms)
    }''')
    page.wait_for_function('simSamples.length===3')
    report['simulator']['samples'] = page.evaluate('simSamples')
    assert report['simulator']['samples'][0]['weekly'] != report['simulator']['from']
    assert report['simulator']['samples'][0]['weekly'] != report['simulator']['samples'][1]['weekly']
    assert report['simulator']['samples'][-1]['weekly'] == '8 à 10 h'
    assert report['simulator']['samples'][-1]['annual'] == 'soit 370 à 460 h par an'
    page.emulate_media(reduced_motion='reduce')
    page.goto(base + '/?theme=light#time-banner-title')
    assert page.locator('.time-banner [data-time-visual]').all_text_contents() == final
    page.wait_for_timeout(650)
    assert page.locator('.time-banner [data-time-visual]').all_text_contents() == final
    page.goto(base + '/simulateur-gain-de-temps/?profil=medecine-esthetique')
    page.locator('[data-task=rappels]').fill('20')
    assert page.locator('.time-result-value [data-time-visual]').text_content() == '8 à 10 h'
    report['reduced_motion'] = 'PASS: valeurs finales directes sur les deux pages'
    assert not report['errors'], report['errors']
    assert any(r['status'] == 200 for r in report['resources'])
    browser.close()
if args.report:
    Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False))
