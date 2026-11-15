/* Run with NODE_PATH pointing to an installation of Playwright.
   CINEMA_URL must serve the prototype. CINEMA_BASELINE_URL serves the base HTML
   with the same CSS/assets. This runner uses a separate, headless Chromium. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const url=process.env.CINEMA_URL||'http://127.0.0.1:4173/';
 const baseline=process.env.CINEMA_BASELINE_URL||new URL('/baseline-local.html',url).href;
 const output=process.env.CINEMA_TEST_OUTPUT||'/tmp/aestheia-cinema-tests';fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const sizes=[[360,800],[390,844],[430,932],[600,900],[768,1024],[900,700],[1024,768],[1120,800],[1366,768],[1536,864],[1920,1080]];
 const rows=[];
 for(const [width,height]of sizes){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});
  const page=await context.newPage(),base=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await base.goto(baseline);
  await Promise.all([page.evaluate(()=>document.fonts.ready),base.evaluate(()=>document.fonts.ready)]);
  for(const p of [page,base]){const reject=p.getByRole('button',{name:'Tout refuser',exact:true});if(await reject.isVisible())await reject.click();}
  const settle=async()=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
  const geometry=()=>[...document.querySelectorAll('.sector-card,.v2-solution,.v2-lever,main>section')].map(e=>({selector:e.className.replace(' cinema-active',''),width:e.offsetWidth,height:e.offsetHeight}));
  const a=await page.evaluate(geometry),b=await base.evaluate(geometry);
  const diffs=a.flatMap((v,i)=>Math.abs(v.width-b[i].width)>1||Math.abs(v.height-b[i].height)>1?[{actual:v,baseline:b[i]}]:[]);
  const semantics=()=>({headings:[...document.querySelectorAll('h1,h2')].map(e=>e.textContent),links:[...document.querySelectorAll('a')].map(e=>[e.textContent,e.getAttribute('href')]),images:[...document.images].map(e=>[e.getAttribute('src'),e.alt]),schema:document.querySelector('script[type="application/ld+json"]').textContent});
  const sameSemantics=JSON.stringify(await page.evaluate(semantics))===JSON.stringify(await base.evaluate(semantics));
  let overflow=0;const scenes=await page.locator('main>section,footer').count();
  for(let i=0;i<scenes;i++){
   await page.locator('main>section,footer').nth(i).evaluate(e=>window.scrollTo({top:e.offsetTop-100,behavior:'instant'}));await settle();
   overflow=Math.max(overflow,await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
  }
  const photos=[];const images=page.locator('.v2-hero-media,.cinema-frame,.cinema-portrait');
  for(let i=0;i<await images.count();i++){
   const image=images.nth(i);const y=await image.evaluate(e=>Math.max(0,e.getBoundingClientRect().top+scrollY-innerHeight*.7));
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await settle();
   const first=await image.evaluate(e=>getComputedStyle(e.querySelector('img')).transform);
   await page.evaluate(y=>scrollTo({top:y+230,behavior:'instant'}),y);await settle();
   const next=await image.evaluate(e=>getComputedStyle(e.querySelector('img')).transform);
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await settle();
   const back=await image.evaluate(e=>getComputedStyle(e.querySelector('img')).transform);
   photos.push({scene:await image.getAttribute('data-camera')||i,moves:first!==next,reversible:first===back});
  }
  const faq=page.locator('.v2-faq details').first();await faq.locator('summary').click();const faqOpen=await faq.evaluate(e=>e.open);await faq.locator('summary').click();
  const slider=page.locator('#sim-heures');await slider.focus();await slider.press('End');const simulator=await page.locator('#sim-gain').innerText();await slider.press('Home');
  let menu='desktop';const burger=page.locator('.v2-burger');if(await burger.isVisible()){await burger.click();menu=(await burger.getAttribute('aria-expanded'))==='true'&&await page.locator('#navigation').isVisible();await burger.click();}
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await settle();
  const footerReached=await page.evaluate(()=>scrollY+innerHeight>=document.documentElement.scrollHeight-2);
  const toggle=page.locator('.cinema-motion-control');await toggle.click();
  const pause=await page.evaluate(()=>document.body.dataset.cinema==='off'&&[...document.querySelectorAll('.cinema-frame img')].every(e=>getComputedStyle(e).transform==='none'));await toggle.click();
  await page.emulateMedia({reducedMotion:'reduce'});await settle();const reduced=await page.evaluate(()=>document.body.dataset.cinema==='off'&&[...document.querySelectorAll('.cinema-frame img')].every(e=>getComputedStyle(e).transform==='none'));
  await page.emulateMedia({reducedMotion:'no-preference'});await settle();
  const broken=await page.evaluate(()=>[...document.images].filter(e=>e.complete&&!e.naturalWidth).map(e=>e.src));
  if([390,768,1366,1920].includes(width)){
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await settle();await page.screenshot({path:path.join(output,`header-${width}.png`)});
   await page.locator('#secteurs').evaluate(e=>scrollTo({top:e.offsetTop-75,behavior:'instant'}));await settle();await page.screenshot({path:path.join(output,`sectors-${width}.png`)});
  }
  const row={width,height,scenes,sameSemantics,geometryDifferences:diffs,overflow,photos,faqOpen,simulator,menu,footerReached,pause,reduced,broken,errors};rows.push(row);console.log(JSON.stringify(row));
  await context.close();
 }
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();await page.goto(url);
 const noJS={h1:await page.locator('h1').isVisible(),sectors:await page.locator('.sector-card').count(),text:await page.locator('main').innerText(),wrappers:await page.locator('.cinema-frame').count()};delete noJS.text;await context.close();
 const success=rows.every(r=>r.sameSemantics&&!r.geometryDifferences.length&&!r.overflow&&r.photos.every(p=>p.moves&&p.reversible)&&r.faqOpen&&r.simulator==='12 h à 15 h'&&r.menu!==false&&r.footerReached&&r.pause&&r.reduced&&!r.broken.length&&!r.errors.length);
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({rows,noJS,success},null,2));await browser.close();console.log(JSON.stringify({success,noJS,output}));process.exitCode=success?0:1;
})().catch(e=>{console.error(e);process.exit(1)});
