/* Bandeau d'accueil : anime le mur d'eau, les ombres et le jardin par-dessus la photo fixe.
   Ordinateur et tablette uniquement. La photo reste en place dessous : si l'animation ne peut pas
   démarrer (WebGL absent, animations réduites, téléphone), le bandeau reste celui d'origine. */
(function () {
  "use strict";
  var hero = document.querySelector(".home-hero-photo");
  var media = hero && hero.querySelector(".home-hero-media");
  var img = media && media.querySelector("img");
  if (!img) return;

  var AMP = 0.65; /* intensité validée : Discret */
  var BASE = "/assets/images/metiers/";
  var wide = window.matchMedia("(min-width: 768px) and (min-height: 500px)");
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  var cv, gl, U, ready = false, failed = false, starting = false, raf = 0, lastDraw = 0, t0 = 0;

  var VS = "attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
  var FS = [
"precision highp float;",
"uniform sampler2D uImg,uMask,uSoft;uniform vec2 uRes,uSize;uniform float uT,uAmp,uPosX;varying vec2 v;",
"float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
"float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
"float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*n(p);p=p*2.03+17.1;a*=.5;}return s/.875;}",
// vent : va-et-vient avec rafales, ph = decalage selon l'endroit
"float wind(float t,float ph){float g=.6+.4*sin(t*.21+ph*.25)*sin(t*.137+1.3);",
" return g*(sin(t*1.05+ph)+.5*sin(t*1.83+ph*1.7+1.)+.28*sin(t*3.1+ph*2.3+2.))/1.5;}",
// nappe d'eau : trois couches qui descendent a des vitesses differentes
"vec3 sb(vec2 p){return (texture2D(uSoft,p+vec2(.003,.004)).rgb+texture2D(uSoft,p+vec2(-.003,.004)).rgb+texture2D(uSoft,p+vec2(.003,-.004)).rgb+texture2D(uSoft,p+vec2(-.003,-.004)).rgb)*.25;}",
"vec3 ratio(vec2 a,vec2 b){return clamp((sb(b)+.03)/(sb(a)+.03),.72,1.4);}",
"void main(){",
" float cr=uRes.x/uRes.y,ir=uSize.x/uSize.y;vec2 uv=v;",
" if(cr>ir){uv.y=(v.y-.5)*(ir/cr)+.5;}else{uv.x=uPosX*(1.-cr/ir)+v.x*(cr/ir);}",
" vec3 m=texture2D(uMask,uv).rgb;float t=uT;vec2 q=uv*vec2(ir,1.);vec2 d=vec2(0.);vec3 lit=vec3(1.),cw=vec3(0.);float k=0.,fl2=0.;",
" if(m.r>.004){",
"  k=m.r*smoothstep(.06,.15,uv.y);",
// ombres sur l'eau : la lumiere de fond va et vient
"  float ph=fbm(q*2.6+7.)*8.+q.y*2.5;",
"  vec2 u2=uv+uAmp*vec2(wind(t,ph)*.0065,wind(t*1.13+4.,ph*1.3+2.)*.0033);u2.x=max(u2.x,.9125);",
"  vec3 base=texture2D(uSoft,u2).rgb;float lb=dot(base,vec3(.333));",
// vaguelettes qui descendent
"  float y1=q.y-t*.19,wx=q.x*24.;",
"  float r1=n(vec2(wx+1.3*n(vec2(q.x*7.,y1*5.)),y1*64.));",
"  float r2=n(vec2(wx+1.3*n(vec2(q.x*7.,(y1+.004)*5.)),(y1+.004)*64.));",
"  float gy=(r2-r1)/.004;",
"  vec2 dw=vec2(0.,gy*.00003*uAmp);",
// la texture de l'eau elle-meme coule vers le bas (deux passes fondues)
"  float p1=fract(t/1.1),p2=fract(t/1.1+.5),w=abs(1.-2.*p1);",
"  vec2 a1=uv+dw-vec2(0.,(p1-.5)*.075),a2=uv+dw-vec2(0.,(p2-.5)*.075);",
"  vec3 s1=texture2D(uSoft,a1).rgb,s2=texture2D(uSoft,a2).rgb;",
"  vec3 d1=(texture2D(uImg,a1).rgb-s1)*texture2D(uMask,a1).r*clamp((lb+.03)/(dot(s1,vec3(.333))+.03),.5,1.6);",
"  vec3 d2=(texture2D(uImg,a2).rgb-s2)*texture2D(uMask,a2).r*clamp((lb+.03)/(dot(s2,vec3(.333))+.03),.5,1.6);",
"  vec3 det=(d1*(1.-w)+d2*w)/sqrt(w*w+(1.-w)*(1.-w));",
"  cw=base+det*1.1;",
// filets brillants qui tombent
"  float f1=n(vec2(q.x*170.,(q.y-t*.33)*12.)+3.7),f2=n(vec2(q.x*110.+40.,(q.y-t*.23)*7.)+1.2);",
"  float lum2=.3+.7*smoothstep(.3,.8,lb);",
"  cw+=vec3(1.,.97,.9)*(pow(f1,5.)*.9+pow(f2,6.)*.6)*uAmp*.13*lum2;",
"  cw+=vec3(1.,.97,.9)*clamp(gy*.012,-.6,1.)*uAmp*.035*(.4+.6*lb);",
"  cw*=1.+uAmp*.06*(n(vec2(q.x*5.,(q.y-t*.14)*4.))-.5);",
" }",
" if(m.g>.004){",
"  float ph=fbm(q*2.2)*9.+q.x*2.;",
"  float fl=sin(t*4.3+n(q*13.)*18.)*(.5+.5*sin(t*.31+ph*.2));",
"  vec2 ds=uAmp*vec2(wind(t,ph)*.011+fl*.0014,wind(t*1.13+4.,ph*1.3+2.)*.0052+fl*.0008);",
"  vec2 u3=uv+ds;if(uv.x<.7){u3=clamp(u3,vec2(.445,.15),vec2(.614,.69));}else{u3=clamp(u3,vec2(.757,.676),vec2(.925,.935));}",
"  lit=mix(lit,ratio(uv,u3),m.g);",
" }",
" if(m.b>.004){",
"  float ph=fbm(q*3.)*4.+q.y*2.5;",
"  float a=wind(t*.55,ph),b=wind(t*.6+2.,ph*1.4+1.);",
"  float fl=sin(t*2.4+n(q*38.)*25.)*(.55+.45*sin(t*.27+ph*.3));",
"  float fade=1.-smoothstep(.648,.676,uv.y);",
"  float bas=1.+.7*smoothstep(.5,.62,uv.y);",
"  d+=m.b*uAmp*fade*vec2((a*.0011+fl*.00015)*bas,b*.0004);",
"  fl2=m.b*fade*(fbm(q*13.+vec2(a*.8,t*.12))-.5);",
" }",
" vec3 c=texture2D(uImg,uv+d).rgb;float l=dot(c,vec3(.299,.587,.114));",
" c*=lit;",
" c=mix(c,cw,k);",
" c*=1.+fl2*uAmp*.12*smoothstep(.3,.85,l);",
" float al=clamp(max(m.r,max(m.g,m.b))*5.,0.,1.);",
" gl_FragColor=vec4(c*al,al);}"].join("\n");

  function allowed() { return wide.matches && !calm.matches && !failed; }

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader");
    return s;
  }

  function texture(unit, source) {
    var max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    var w = source.naturalWidth, h = source.naturalHeight;
    if (w > max || h > max) {
      var k = Math.min(max / w, max / h), c = document.createElement("canvas");
      c.width = Math.floor(w * k); c.height = Math.floor(h * k);
      c.getContext("2d").drawImage(source, 0, 0, c.width, c.height);
      source = c;
    }
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  }

  function load(src) {
    return new Promise(function (ok, ko) {
      var i = new Image();
      i.onload = function () { ok(i); };
      i.onerror = ko;
      i.src = src;
    });
  }

  function decoded() {
    if (img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise(function (ok, ko) {
      img.addEventListener("load", ok, { once: true });
      img.addEventListener("error", ko, { once: true });
    });
  }

  function fail() {
    failed = true; ready = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (cv) cv.classList.remove("is-on");
  }

  function init() {
    if (starting || ready || failed) return;
    starting = true;
    Promise.all([decoded(), load(BASE + "accueil_mur_eau_masque.png"), load(BASE + "accueil_mur_eau_lumiere.webp")]).then(function (r) {
      cv = document.createElement("canvas");
      cv.className = "home-hero-water";
      cv.setAttribute("aria-hidden", "true");
      gl = cv.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" });
      if (!gl) throw new Error("webgl");
      var pr = gl.createProgram();
      gl.attachShader(pr, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(pr, shader(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      U = {};
      ["uImg", "uMask", "uSoft", "uRes", "uSize", "uT", "uAmp", "uPosX"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
      texture(0, img); texture(1, r[1]); texture(2, r[2]);
      gl.uniform1i(U.uImg, 0); gl.uniform1i(U.uMask, 1); gl.uniform1i(U.uSoft, 2);
      gl.uniform2f(U.uSize, img.naturalWidth, img.naturalHeight);
      gl.uniform1f(U.uAmp, AMP);
      gl.clearColor(0, 0, 0, 0);
      cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); fail(); });
      media.insertAdjacentElement("afterend", cv);
      t0 = performance.now();
      ready = true; starting = false;
      kick();
    }).catch(function () { starting = false; fail(); });
  }

  function size() {
    var cw = cv.clientWidth, ch = cv.clientHeight;
    if (!cw || !ch) return false;
    var d = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.min(Math.round(cw * d), 2200), h = Math.round(w * ch / cw);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(U.uRes, w, h);
    var px = parseFloat(getComputedStyle(img).objectPosition);
    gl.uniform1f(U.uPosX, isNaN(px) ? 1 : px / 100);
    return true;
  }

  function loop(now) {
    raf = 0;
    if (!ready || !allowed() || document.hidden) { if (cv && !allowed()) cv.classList.remove("is-on"); return; }
    raf = requestAnimationFrame(loop);
    if (now - lastDraw < 30) return; /* 30 images par seconde suffisent */
    var r = hero.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return; /* bandeau hors écran : on ne dessine pas */
    lastDraw = now;
    try {
      if (!size()) return;
      gl.uniform1f(U.uT, (now - t0) / 1000);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      cv.classList.add("is-on");
    } catch (e) { fail(); }
  }

  function kick() {
    if (!allowed()) { if (cv) cv.classList.remove("is-on"); return; }
    if (!ready) { init(); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function listen(mq) { if (mq.addEventListener) mq.addEventListener("change", kick); else if (mq.addListener) mq.addListener(kick); }
  listen(wide); listen(calm);
  document.addEventListener("visibilitychange", kick);
  window.addEventListener("pageshow", kick);
  if (document.readyState === "complete") kick(); else window.addEventListener("load", kick, { once: true });
})();
