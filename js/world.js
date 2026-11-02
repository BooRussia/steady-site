// The world behind the page: a spectral light trail that collapses into a horizon,
// hills that double as the app's live graphs, and a tree that grows as you scroll.
// Two fixed canvases, so real DOM type can sit between the hills and the tree.
(function () {
  "use strict";

  var VERT = "attribute vec2 aP;void main(){gl_Position=vec4(aP,0.,1.);}";

  var SKY = [
    "precision highp float;",
    "uniform vec2 uRes,uMouse,uCar,uMarkC;",
    "uniform vec3 uP1,uP2;",
    "uniform float uMarkA,uMarkS,uThick,uSweep,uSweepOn,uAhead,uJag,uExt,uIris,uBloom,uGlint,uGlintA,uSeed,uFlash,uTouch;",
    "uniform float uT,uFlow,uCalm,uHead,uHills,uGlow,uLoad,uLive,uLight,uGx,uCrest,uGrow,uMouseE,uAlert,uTick,uDim;",
    "uniform sampler2D uN;",
    "float vn(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return texture2D(uN,(i+f+.5)/256.).r;}",
    "float fbm(vec2 x){return .55*vn(x)+.3*vn(x*2.03+7.1)+.15*vn(x*4.01+3.7);}",

    // Across the beam, top to bottom: teal, amber, red, violet, blue.
    "vec3 spectrum(float t){",
    "  vec3 a=vec3(.13,.50,.50),b=vec3(.40,.66,.52),c=vec3(.99,.66,.24),d=vec3(.95,.29,.13),e=vec3(.54,.27,.58),f=vec3(.17,.30,.63);",
    "  if(t<.2)return mix(a,b,t/.2);",
    "  if(t<.42)return mix(b,c,(t-.2)/.22);",
    "  if(t<.6)return mix(c,d,(t-.42)/.18);",
    "  if(t<.8)return mix(d,e,(t-.6)/.2);",
    "  return mix(e,f,(t-.8)/.2);",
    "}",

    "vec3 beams(vec2 p,float e){",
    "  vec3 bg=mix(mix(vec3(.098,.165,.255),vec3(.158,.295,.452),smoothstep(-.5,.45,p.y)),vec3(.004,.007,.005),e);",
    "  vec2 m=(uMouse-.5)*vec2(uRes.x/uRes.y,1.);",
    "  vec2 dm=p-m;float md=dot(dm,dm);",
    "  p+=dm*uMouseE*.55*exp(-md*16.)*(1.-e);",
    // E: the beam's shape finishes collapsing to a level line before it hands over to the mark.
    "  float E=min(e/.82,1.);",
    "  float th=mix(-.36,0.,E);",
    "  vec2 C=mix(uCar,vec2(0.),E);",
    "  vec2 d=vec2(cos(th),sin(th)),n=vec2(-d.y,d.x);",
    "  vec2 q=p-C;",
    "  float u=dot(q,d)-uHead*(1.-e);",
    "  float v=dot(q,n);",
    "  float fade=1.-e;",
    "  vec3 col=bg;",
    // Wide blue band low on the left, drifting to violet past the car.
    "  if(fade>.001){",
    "    float v3=(v+.33-u*.02)/(.165+.05*max(-u,0.));",
    "    float a3=smoothstep(1.,.15,abs(v3))*(.6+.5*fbm(vec2(u*1.1-uFlow*.5,v*4.)));",
    "    vec3 c3=mix(vec3(.20,.36,.72),vec3(.42,.30,.66),smoothstep(-.2,.5,u));",
    "    c3=mix(c3,vec3(.13,.17,.34),smoothstep(.2,1.,abs(v3)));",
    "    col=mix(col,c3,clamp(a3,0.,1.)*fade*.92);",
    // The wake: teal over violet, opening out past the car.
    "    float w2=.05+.21*max(u+.12,0.);",
    "    float v2=(v+.028)/w2;",
    "    float a2=smoothstep(1.,.2,abs(v2))*smoothstep(-.52,.02,u)*(.5+.5*fbm(vec2(u*1.6-uFlow*.8,v*7.)));",
    "    vec3 c2=mix(vec3(.15,.55,.62),vec3(.46,.33,.70),smoothstep(.45,-.55,v2));",
    "    col=mix(col,c2,clamp(a2,0.,1.)*fade*.88);",
    "  }",
    // The main trail, narrowing into the car, or into a single line when calm.
    "  float wob=(fbm(vec2(u*1.2-uFlow*.6,3.))-.5)*.05*fade;",
    "  float w=mix(.034+.34*(1.-exp(min(u,0.)*1.75)),.0016,E);",
    "  float vv=(v+wob)/w;",
    "  float t=clamp(.5-vv*.5,0.,1.);",
    "  vec3 mc=spectrum(t);",
    "  float streak=fbm(vec2(u*2.6-uFlow*2.2,v*(13.+30.*e)));",
    "  float core=exp(min(u,0.)*3.1)*exp(-vv*vv*2.4);",
    "  mc=mix(mc,vec3(1.,.86,.46),clamp(core*1.05*fade,0.,1.));",
    "  mc=mix(mc,vec3(1.,.95,.87),smoothstep(.45,1.,e));",
    "  float tail=mix(u<0.?1.:exp(-u*15.),1.,smoothstep(.15,.7,e));",
    "  float edge=smoothstep(1.,.3,abs(vv));",
    "  float a1=edge*tail*mix(.66+.52*streak,1.,e);",
    "  col=mix(col,mc,clamp(a1,0.,1.)*mix(.96,0.,smoothstep(.88,.99,e)));",
    "  col+=mc*core*.14*fade;",
    // The car's shadow, thrown forward along the ground.
    "  float sh=exp(-pow((u-.26)/.36,2.)-pow((v+.075+u*.07)/.052,2.));",
    "  col*=1.-.72*sh*fade*smoothstep(.34,.0,uHead);",
    "  return col;",
    "}",

    "vec3 hills(vec2 p,float rise){",
    "  float x=p.x,y=p.y;",
    "  vec3 col=vec3(.006,.011,.008);",
    "  vec3 m1=vec3(.357,.616,1.),m2=vec3(.694,.549,1.),m3=vec3(.239,.839,.549),m4=vec3(1.,.71,.278);",
    "  for(int i=0;i<5;i++){",
    "    float fi=float(i);",
    "    float seed=fi*17.3+3.1;",
    "    float c=sin(fi*2.4+.6)*.62;",
    "    float base=.40-fi*.125;",
    "    float h=base+(.30+fi*.07)*(abs(x-c)-.45)*.55+(fbm(vec2(x*(1.5+fi*.45)+seed,seed))-.5)*.30;",
    "    h+=(vn(vec2(x*10.+seed,seed*1.7))-.5)*.008;",
    "    h-=rise*(.85+fi*.18);",
    "    vec3 mc=i==1?m1:(i==2?m2:(i==3?m3:m4));",
    "    float gl=i==0?0.:uGlow;",
    "    if(gl>.001){",
    "      h=mix(h,(h-.1)*.52-.05,gl);",
    "      float lv=vn(vec2(x*(5.+fi)-uLive*(.5+fi*.13),seed));",
    "      float lv2=vn(vec2(x*(19.+fi*3.)-uLive*(1.1+fi*.2),seed+5.));",
    "      h+=gl*((lv-.5)*(.06+.14*uLoad)+(lv2-.5)*(.012+.06*uLoad)+uLoad*(.15-.018*fi));",
    "    }",
    "    if(y<h+.004){",
    "      float dp=max(h-y,0.);",
    "      vec3 lay=vec3(.016,.027,.018)*(1.+fi*.34);",
    "      float fold=fbm(vec2(x*4.5+dp*8.+seed,dp*24.+seed));",
    "      lay*=.62+.85*fold;",
    "      lay+=vec3(.05,.075,.04)*exp(-dp*26.)*(.25+uLight*.75);",
    "      lay+=vec3(.20,.27,.05)*exp(-dp*9.)*uLight*uLight*exp(-abs(x-uGx)*1.5)*.22;",
    "      lay=mix(lay,lay+vec3(.30,.05,.04)*exp(-dp*12.),uAlert*.8);",
    "      if(gl>.001){",
    "        lay+=mc*exp(-dp*6.5)*.17*gl;",
    "        float ln=exp(-pow(abs(y-h)/.0026,2.));",
    "        lay+=mc*ln*gl;",
    "      }",
    "      col=y<h?lay:col+mc*gl*exp(-pow(abs(y-h)/.0026,2.));",
    "    }",
    "  }",
    // The lit hill the tree stands on.
    "  float dx=x-uGx;",
    "  float crest=uCrest-.27*dx*dx+(fbm(vec2(x*2.2,9.))-.5)*.022*smoothstep(0.,.25,abs(dx))+(vn(vec2(x*210.,3.))-.5)*.0026;",
    "  crest-=rise*1.05;",
    "  if(y<crest){",
    "    float dp=crest-y;",
    "    vec2 lp=vec2(dx-.085,y-(uCrest-.038));",
    "    float lit=exp(-(lp.x*lp.x*2.4+lp.y*lp.y*90.));",
    "    float side=exp(-abs(dx)*1.05);",
    "    float blades=vn(vec2(x*120.,y*520.))*.6+vn(vec2(x*260.,y*800.))*.4;",
    "    float patc=fbm(vec2(x*4.+uT*.018,y*19.));",
    "    vec3 dk=vec3(.018,.04,.012),md=vec3(.27,.41,.04),ho=vec3(.86,.91,.13);",
    "    vec3 g=mix(dk,md,side*(.26+.62*patc)*uLight);",
    "    g=mix(g,ho,lit*(.46+.54*blades)*uLight*uLight);",
    "    g*=.72+.56*blades;",
    "    float sh=exp(-(pow((dx+.135)/.27,2.)+pow((y-(uCrest-.02))/.032,2.)));",
    "    g*=1.-.82*sh*smoothstep(.3,.85,uGrow);",
    "    g+=ho*exp(-dp*170.)*.34*uLight*side;",
    "    g*=mix(.2,1.,smoothstep(uCrest-.15,uCrest-.012,y));",
    "    col=g;",
    "  }",
    "  return col;",
    "}",

    "float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}",

    // Same colours as img/logo.svg ("Ember pulse"): a navy tile, darker at the bottom, and a pulse that warms from amber to coral.
    "vec3 logoGrad(float t){return mix(vec3(.133,.259,.420),vec3(.078,.153,.259),clamp(t,0.,1.));}",
    "vec3 ember(float t){return mix(vec3(1.,.761,.302),vec3(.933,.306,.137),clamp(t,0.,1.));}",

    // A plucked line: a ripple running out both ways, plus a wobble where it was touched.
    "float pluck(vec3 P,float x){",
    "  if(P.y<.0005)return 0.;",
    "  float dx=abs(x-P.x),env=P.y*exp(-P.z*1.35);",
    "  float run=(dx-.7*P.z)/.11;",
    "  return env*(exp(-run*run)*sin(dx*30.-P.z*20.)*.8+exp(-dx*dx*26.)*cos(P.z*24.)*exp(-P.z*2.6));",
    "}",

    // The beam after it collapses: one white line that breaks into erratic spikes all along its
    // length (the beam's colors come back in the spikes), settles, writes a single heartbeat in the
    // logo's exact shape, and then opens out into the logo itself.
    "float jag(float x){",
    "  if(uJag<.001)return 0.;",
    "  float a=vn(vec2(x*26.+uT*3.,4.)),b=vn(vec2(x*24.-uT*2.4,6.));",
    "  a*=a;b*=b;",
    "  return uJag*((vn(vec2(x*11.+uT*1.8,1.))-.5)*.09+(vn(vec2(x*37.-uT*2.6,2.))-.5)*.025+(a*a-b*b)*.12);",
    "}",
    "float wob(float x,vec2 m){",
    "  float y=jag(x),free=1.-uExt;",
    "  y+=free*(pluck(uP1,x)+pluck(uP2,x));",
    "  float off=m.y-uMarkC.y,ox=(x-m.x)/.15;",
    "  return y+free*uTouch*off*.5*exp(-off*off*90.)*exp(-ox*ox);",
    "}",

    "vec3 mark(vec3 col,vec2 p){",
    "  float px=1./uRes.y,x=p.x;",
    "  vec3 cream=vec3(1.,.953,.894);",
    "  vec2 m=(uMouse-.5)*vec2(uRes.x/uRes.y,1.);",
    "  float free=1.-uExt;",
    "  float yn=wob(x,m),ys=(wob(x+.003,m)-yn)/.003;",
    "  vec2 P=vec2(x,p.y-yn);",
    "  vec2 q=(P-uMarkC)/uMarkS;",
    "  if(uIris>.001){",
    "    vec2 tq=(p-uMarkC)/uMarkS;",
    "    vec2 bx=abs(tq)-5.;",
    "    float dt=length(max(bx,0.))+min(max(bx.x,bx.y),0.)-6.5;",
    "    float u=(tq.x+12.)/24.,v=(12.-tq.y)/24.;",
    "    float gt=clamp(((u-.66)*-.32+v)/1.1024-uTouch*((m.y-uMarkC.y)*.13-(m.x-uMarkC.x)*.05),0.,1.);",
    "    float r=length(tq);",
    "    float iris=smoothstep(uIris,uIris-3.,r);",
    "    float pxu=px/uMarkS;",
    "    float halo=exp(-max(dt,0.)*uMarkS*10.)*smoothstep(uIris*2.6,uIris*1.1,r);",
    "    col+=ember(1.-v)*halo*.3*(1.+.12*sin(uT*1.6));",
    "    col=mix(col,logoGrad(gt),smoothstep(pxu,-pxu,dt)*iris);",
    "  }",
    "  float yL=-uExt,yR=.2*uExt;",
    "  vec2 a0=vec2(-8.,yL),a1=vec2(-4.,yL),a2=vec2(-1.8,4.),a3=vec2(1.4,-5.5),a4=vec2(3.6,yR),a5=vec2(8.,yR);",
    "  float dC=min(min(seg(q,a0,a1),seg(q,a1,a2)),min(seg(q,a2,a3),min(seg(q,a3,a4),seg(q,a4,a5))))*uMarkS;",
    "  float dE=min(seg(q,vec2(-900.,yL),a0),seg(q,a5,vec2(900.,yR)))*uMarkS;",
    // dF approximates the distance across the line, so steep spikes keep their width and don't smear light vertically.
    "  float dV=abs(P.y-uMarkC.y),dF=dV/sqrt(1.+min(ys*ys,60.));",
    "  float behind=smoothstep(uSweep+.002,uSweep-.002,x);",
    "  float w=uThick;",
    "  float aC=smoothstep(w+px,w-px*.5,dC),aE=smoothstep(.0016+px,.0016-px*.5,dE)*free,aF=smoothstep(w+px,w-px*.5,dF);",
    "  float aL=max(max(aC,aE)*behind,aF*(1.-behind)*uAhead);",
    "  float dB=min(dC,mix(dE,1.,uExt));",
    "  float gb=smoothstep(uSweep+.07,uSweep-.07,x);",
    "  float dG=mix(dF,dB,gb);",
    // The spikes take the beam's colors back by height, teal at the top through to blue at the bottom; flat stretches stay white.
    "  float jy=jag(x);",
    "  vec3 warm=ember((q.x+8.)/16.);",
    "  vec3 lc=mix(cream,spectrum(clamp(.5-jy*4.6,0.,1.)),clamp(uJag*1.6,0.,1.)*smoothstep(.004,.04,abs(jy)));",
    "  lc=mix(lc,warm,uExt);",
    // The slope correction only holds near the line; further out the glow falls off with height, so it can't streak up the screen.
    "  float dW=max(dF,dV-.04);",
    "  float gl=(.3*exp(-dB*90.)+.075*exp(-dB*20.))*gb+(.3*exp(-mix(dW,dV,.35)*90.)+.075*exp(-dW*20.))*(1.-gb)*uAhead;",
    "  gl*=1.-.8*uExt;",
    "  col+=lc*gl*uMarkA;",
    "  if(uBloom>.001)col+=spectrum(clamp(.5-q.y/11.,0.,1.))*exp(-dC*13.)*exp(-q.x*q.x/130.)*uBloom*.55*gb*uMarkA;",
    "  if(uSweepOn>.001){",
    "    float tt=uSweep-x,dT=min(dC,dE);",
    "    float tail=exp(-max(tt,0.)*4.2)*smoothstep(-.03,.03,tt);",
    "    col+=spectrum(.42+min(max(tt,0.)*.75,.5))*tail*(exp(-dT*60.)*.85+exp(-dT*16.)*.18)*uSweepOn;",
    "    col+=cream*exp(-tt*tt*5200.)*exp(-dT*150.)*1.6*uSweepOn;",
    "  }",
    "  if(uGlintA>.001){float g=(x-uGlint)/.05;col+=cream*exp(-g*g)*exp(-dG*75.)*uGlintA*.8;}",
    "  col=mix(col,lc,aL*uMarkA);",
    "  if(uSeed>.001){float ds=length(p-uMarkC);col+=vec3(.82,.95,.32)*(exp(-ds*110.)*.9+exp(-ds*24.)*.2)*uSeed;}",
    "  return col;",
    "}",

    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/uRes;",
    "  float asp=uRes.x/uRes.y;",
    "  vec2 p=vec2((uv.x-.5)*asp,uv.y-.5);",
    "  vec3 col=vec3(0.);",
    "  if(uHills<.999)col=beams(p,smoothstep(0.,.92,uCalm));",
    "  if(uHills>.001)col=hills(p,1.-uHills)+col*(1.-smoothstep(0.,.6,uHills));",
    "  if(uFlash>.002)col+=hills(p,0.)*uFlash*1.15;",
    "  if(uMarkA>.001)col=mark(col,p);",
    "  col*=uDim;",
    "  float g1=texture2D(uN,(gl_FragCoord.xy+vec2(uTick*37.,uTick*91.))/256.).g;",
    "  float g2=texture2D(uN,(gl_FragCoord.yx*1.37+vec2(uTick*53.,uTick*17.))/256.).b;",
    "  float gr=fract(g1+g2*1.618)-.5;",
    "  float amt=mix(.17,.07,smoothstep(0.,.9,uCalm));",
    "  col*=1.+gr*amt;",
    "  col+=gr*.012;",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  var WIND = [
    "uniform vec2 uScale,uBase,uPtr;",
    "uniform float uT,uGrow,uWind,uPush,uPx;",
    "vec2 wind(vec2 p){",
    "  float h=max(p.y-.16,0.);",
    "  p.x+=(sin(uT*.62+p.x*1.5)*.012+sin(uT*1.45+p.y*3.1+p.x*2.2)*.006)*h*uWind;",
    "  vec2 d=p-uPtr;float m=dot(d,d);",
    "  p+=d/(sqrt(m)+.03)*uPush*exp(-m*20.)*.05*h;",
    "  return p;",
    "}"
  ].join("\n");

  var BRANCH_V = [
    "attribute vec2 aRoot,aCenter,aNormal;attribute float aBorn;",
    WIND,
    "varying float vS;",
    "void main(){",
    "  float g=smoothstep(aBorn,aBorn+.035,uGrow);",
    "  float thick=.3+.7*smoothstep(aBorn,aBorn+.34,uGrow);",
    "  vec2 c=mix(aRoot,aCenter,g);",
    "  vec2 p=wind(c+aNormal*thick*step(.0001,g));",
    "  vS=clamp(p.y,0.,1.);",
    "  gl_Position=vec4(uBase+p*uScale,0.,1.);",
    "}"
  ].join("\n");
  var BRANCH_F = [
    "precision mediump float;varying float vS;",
    "void main(){vec3 c=mix(vec3(.018,.02,.012),vec3(.05,.058,.022),vS);gl_FragColor=vec4(c,1.);}"
  ].join("\n");

  var LEAF_V = [
    "attribute vec2 aPos;attribute vec3 aCol;attribute float aSize,aBorn,aPhase;",
    WIND,
    "varying vec3 vC;varying float vSeed;",
    "void main(){",
    "  float g=smoothstep(aBorn,aBorn+.055,uGrow);",
    "  vec2 p=wind(aPos);",
    "  p+=vec2(sin(uT*2.1+aPhase*6.28),cos(uT*1.7+aPhase*9.))*.0021*uWind;",
    "  gl_Position=g<=.001?vec4(3.,3.,0.,1.):vec4(uBase+p*uScale,0.,1.);",
    "  gl_PointSize=aSize*uPx*g;",
    "  vC=aCol;vSeed=aPhase;",
    "}"
  ].join("\n");
  var LEAF_F = [
    "precision mediump float;varying vec3 vC;varying float vSeed;",
    "void main(){",
    "  vec2 c=gl_PointCoord-.5;float r=length(c);",
    "  float an=atan(c.y,c.x);",
    "  float e=.47-.08*sin(an*3.+vSeed*40.)-.045*sin(an*5.+vSeed*90.);",
    "  float a=smoothstep(e,e-.13,r);",
    "  if(a<.01)discard;",
    "  gl_FragColor=vec4(vC*a,a);",
    "}"
  ].join("\n");

  function compile(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p: p, u: u };
  }

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var STOPS = [[0, 14, 40, 8], [.3, 34, 84, 13], [.56, 88, 148, 22], [.8, 170, 208, 44], [1, 232, 243, 86]];
  function ramp(l) {
    l = Math.max(0, Math.min(1, l));
    for (var i = 1; i < STOPS.length; i++) {
      if (l <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i], t = (l - a[0]) / (b[0] - a[0]);
        return [(a[1] + (b[1] - a[1]) * t) / 255, (a[2] + (b[2] - a[2]) * t) / 255, (a[3] + (b[3] - a[3]) * t) / 255];
      }
    }
    return [1, 1, 1];
  }

  // Seven limbs off one trunk, one for each tool on the page.
  function buildTree(quality) {
    var r = rng(11);
    var bv = [], puffs = [];
    var ORDER = [3, 2, 4, 1, 5, 0, 6];
    var SPAN = .6;

    function seg(ax, ay, bx, by, wa, wb, born) {
      var dx = bx - ax, dy = by - ay, l = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / l, ny = dx / l;
      function v(cx, cy, s, w) { bv.push(ax, ay, cx, cy, nx * s * w, ny * s * w, born); }
      v(ax, ay, -1, wa); v(ax, ay, 1, wa); v(bx, by, -1, wb);
      v(ax, ay, 1, wa); v(bx, by, 1, wb); v(bx, by, -1, wb);
    }

    function grow(x, y, ang, len, w, depth, start, frac) {
      var steps = depth > 2 ? 4 : 3, a = ang;
      var dfrac = 1 / 6;
      for (var i = 0; i < steps; i++) {
        a += (r() - .5) * .34;
        if (y > .78) a += a > 0 ? .1 : -.1;
        if (y < .4 && Math.abs(a) > 1.05) a += a > 0 ? -.13 : .13;
        var nx = x + Math.sin(a) * len / steps;
        var ny = y + Math.cos(a) * len / steps;
        var w2 = w * (1 - .1 * (i + 1) / steps);
        seg(x, y, nx, ny, w, w2, start + SPAN * (frac + dfrac * i / steps));
        x = nx; y = ny; w = w2;
      }
      var born = start + SPAN * (frac + dfrac);
      if (depth === 0) { puffs.push({ x: x, y: y, born: born }); return; }
      var kids = r() < .42 ? 3 : 2;
      for (var k = 0; k < kids; k++) {
        var spread = kids === 2 ? (k ? 1 : -1) * (.26 + r() * .3) : (k - 1) * (.42 + r() * .22);
        grow(x, y, a + spread, len * (.72 + r() * .13), w * (.6 + r() * .1), depth - 1, start, frac + dfrac);
      }
    }

    // Trunk, flared at the ground.
    var tx = 0, ty = 0, tw = .052;
    for (var i = 0; i < 7; i++) {
      var nx = tx + (r() - .5) * .012, ny = ty + .038;
      var nw = i === 0 ? .034 : tw * .965;
      seg(tx, ty, nx, ny, tw, nw, .002 + i * .012);
      tx = nx; ty = ny; tw = nw;
    }
    var ANG = [-1.3, -.9, -.46, -.02, .44, .88, 1.28];
    for (var k = 0; k < 7; k++) {
      var start = .06 + ORDER.indexOf(k) * .028;
      grow(tx, ty, ANG[k] + (r() - .5) * .1, .2 - Math.abs(ANG[k]) * .01, .021 - Math.abs(ANG[k]) * .003, 4, start, 0);
    }

    // Fill the holes, so the crown reads as one dome and not a spray of twigs.
    function inDome(x, y) {
      var bump = (Math.sin(x * 9.1) + Math.sin(x * 21.3 + 1.2)) * .018;
      var e = (x / .8) * (x / .8) + ((y - .3) / (.66 + bump)) * ((y - .3) / (.66 + bump));
      return e < 1 && y > .385 - .12 * Math.abs(x) / .8;
    }
    puffs = puffs.filter(function (p) { return inDome(p.x, p.y) || r() < .08; });
    var tries = 2200;
    while (tries--) {
      var px = (r() - .5) * 1.6, py = .28 + r() * .72;
      if (!inDome(px, py)) continue;
      var best = 9, nb = 1, count = puffs.length;
      for (var j = 0; j < count; j++) {
        var q = puffs[j], d = (q.x - px) * (q.x - px) + (q.y - py) * (q.y - py);
        if (d < best) { best = d; nb = q.born; }
      }
      if (best > .007) puffs.push({ x: px, y: py, born: nb + r() * .02 });
    }

    // Top of the crown draws first, so each lower clump's lit top sits over the shadowed
    // underside of the clump above it. That is what makes the crown read as volume.
    puffs.sort(function (a, b) { return b.y - a.y; });
    puffs.forEach(function (p) {
      var reach = Math.sqrt(p.x * p.x + (p.y - .3) * (p.y - .3)) / .8;
      p.born = .13 + .8 * Math.pow(Math.min(1, reach), 1.15) + r() * .035;
    });

    var pts = [], leafIndex = [];
    function point(x, y, c, size, born, phase) { pts.push(x, y, c[0], c[1], c[2], size, born, phase); }

    puffs.forEach(function (p) {
      var R = .074 + r() * .05;
      var gy = Math.max(0, Math.min(1, (p.y - .34) / .62));
      var edgeLit = .55 + .45 * gy;
      point(p.x, p.y - R * .08, ramp(.05 + .12 * gy), R * 1.95, p.born, r());
      var n = Math.round((46 + 62 * (R / .1)) * quality);
      var ls = [];
      for (var i = 0; i < n; i++) {
        var ang = r() * Math.PI * 2, rad = Math.sqrt(r());
        ls.push({ lx: Math.cos(ang) * rad, ly: Math.sin(ang) * rad });
      }
      ls.sort(function (a, b) { return a.ly - b.ly; });
      ls.forEach(function (l) {
        var top = l.ly * .5 + .5;
        var v = .07 + .95 * Math.pow(top, 1.75) * edgeLit + (r() - .5) * .09 + (p.x > 0 ? .025 : 0);
        var size = (.0115 + r() * .0095) * (quality < .8 ? 1.3 : 1);
        leafIndex.push(pts.length / 8);
        point(p.x + l.lx * R * 1.26, p.y + l.ly * R * .86, ramp(v), size, p.born + r() * .018, r());
      });
    });

    return { branches: new Float32Array(bv), leaves: new Float32Array(pts), leafIndex: leafIndex };
  }

  function makeNoise(gl) {
    var r = rng(3), data = new Uint8Array(256 * 256 * 4);
    for (var i = 0; i < data.length; i++) data[i] = Math.floor(r() * 256);
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return t;
  }

  function init() {
    var skyEl = document.getElementById("sky");
    var lifeEl = document.getElementById("life");
    var opts = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" };
    var sky = skyEl.getContext("webgl", opts) || skyEl.getContext("experimental-webgl", opts);
    var life = lifeEl.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false });
    if (!sky || !life) return null;

    var narrow = window.innerWidth < 760;
    var quality = narrow ? .6 : 1;

    // ---------- sky ----------
    var skyP = compile(sky, VERT, SKY);
    var quad = sky.createBuffer();
    sky.bindBuffer(sky.ARRAY_BUFFER, quad);
    sky.bufferData(sky.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), sky.STATIC_DRAW);
    var loc = sky.getAttribLocation(skyP.p, "aP");
    sky.enableVertexAttribArray(loc);
    sky.vertexAttribPointer(loc, 2, sky.FLOAT, false, 0, 0);
    makeNoise(sky);
    sky.useProgram(skyP.p);
    sky.uniform1i(skyP.u.uN, 0);

    // ---------- tree ----------
    var tree = buildTree(quality);
    var branchP = compile(life, BRANCH_V, BRANCH_F);
    var leafP = compile(life, LEAF_V, LEAF_F);
    var branchBuf = life.createBuffer();
    life.bindBuffer(life.ARRAY_BUFFER, branchBuf);
    life.bufferData(life.ARRAY_BUFFER, tree.branches, life.STATIC_DRAW);
    var leafBuf = life.createBuffer();
    life.bindBuffer(life.ARRAY_BUFFER, leafBuf);
    life.bufferData(life.ARRAY_BUFFER, tree.leaves, life.STATIC_DRAW);
    var MAX_FALL = 260;
    var fallData = new Float32Array(MAX_FALL * 8);
    var fallBuf = life.createBuffer();
    life.bindBuffer(life.ARRAY_BUFFER, fallBuf);
    life.bufferData(life.ARRAY_BUFFER, fallData, life.DYNAMIC_DRAW);
    life.enable(life.BLEND);
    life.blendFunc(life.ONE, life.ONE_MINUS_SRC_ALPHA);
    life.clearColor(0, 0, 0, 0);

    var bA = { root: life.getAttribLocation(branchP.p, "aRoot"), center: life.getAttribLocation(branchP.p, "aCenter"), normal: life.getAttribLocation(branchP.p, "aNormal"), born: life.getAttribLocation(branchP.p, "aBorn") };
    var lA = { pos: life.getAttribLocation(leafP.p, "aPos"), col: life.getAttribLocation(leafP.p, "aCol"), size: life.getAttribLocation(leafP.p, "aSize"), born: life.getAttribLocation(leafP.p, "aBorn"), phase: life.getAttribLocation(leafP.p, "aPhase") };

    function bindLeaves(buf) {
      life.bindBuffer(life.ARRAY_BUFFER, buf);
      life.vertexAttribPointer(lA.pos, 2, life.FLOAT, false, 32, 0);
      life.vertexAttribPointer(lA.col, 3, life.FLOAT, false, 32, 8);
      life.vertexAttribPointer(lA.size, 1, life.FLOAT, false, 32, 20);
      life.vertexAttribPointer(lA.born, 1, life.FLOAT, false, 32, 24);
      life.vertexAttribPointer(lA.phase, 1, life.FLOAT, false, 32, 28);
    }
    function attribs(a, on) {
      Object.keys(a).forEach(function (k) { if (a[k] >= 0) { if (on) life.enableVertexAttribArray(a[k]); else life.disableVertexAttribArray(a[k]); } });
    }

    // ---------- falling leaves ----------
    var falling = [];
    var r = rng(29);
    var lastGrow = 0;
    function drop(n) {
      var indexes = tree.leafIndex, tries = n * 6;
      while (n > 0 && tries-- > 0 && falling.length < MAX_FALL) {
        var i = indexes[Math.floor(r() * indexes.length)] * 8;
        var L = tree.leaves;
        if (L[i + 6] > lastGrow) continue;
        falling.push({ x: L[i], y: L[i + 1], r: L[i + 2], g: L[i + 3], b: L[i + 4], s: L[i + 5] * 1.15, vx: .012 + r() * .03, vy: -.03 - r() * .035, ph: r() * 6.28, life: 1, rest: 0 });
        n--;
      }
    }

    // ---------- sizing ----------
    var scaleSky = 1, W = 0, H = 0, dprLife = 1;
    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      var dpr = window.devicePixelRatio || 1;
      var s = Math.min(dpr, Math.sqrt(1.9e6 / (W * H))) * scaleSky;
      skyEl.width = Math.round(W * s);
      skyEl.height = Math.round(H * s);
      sky.viewport(0, 0, skyEl.width, skyEl.height);
      dprLife = Math.min(dpr, Math.sqrt(4.2e6 / (W * H)));
      lifeEl.width = Math.round(W * dprLife);
      lifeEl.height = Math.round(H * dprLife);
      life.viewport(0, 0, lifeEl.width, lifeEl.height);
    }
    resize();

    var frames = 0, slow = 0;
    function tune(dt) {
      if (frames++ < 30) return;
      slow = dt > .03 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 26 && scaleSky > .5) {
        scaleSky *= .8;
        slow = 0;
        resize();
      }
    }

    function frame(st, dt) {
      tune(dt);
      var asp = W / H;

      // sky
      sky.useProgram(skyP.p);
      var u = skyP.u;
      sky.uniform2f(u.uRes, skyEl.width, skyEl.height);
      sky.uniform2f(u.uMouse, st.mx, st.my);
      sky.uniform2f(u.uCar, (st.carU - .5) * asp, st.carV - .5);
      sky.uniform1f(u.uT, st.t);
      sky.uniform1f(u.uFlow, st.flow);
      sky.uniform1f(u.uCalm, st.calm);
      sky.uniform1f(u.uHead, st.head);
      sky.uniform1f(u.uHills, st.hills);
      sky.uniform2f(u.uMarkC, st.mCx, st.mCy);
      sky.uniform1f(u.uMarkA, st.mA);
      sky.uniform1f(u.uMarkS, st.mS);
      sky.uniform1f(u.uThick, st.mThick);
      sky.uniform1f(u.uSweep, st.mSweep);
      sky.uniform1f(u.uSweepOn, st.mSweepOn);
      sky.uniform1f(u.uAhead, st.mAhead);
      sky.uniform1f(u.uJag, st.mJag);
      sky.uniform1f(u.uExt, st.mExt);
      sky.uniform1f(u.uIris, st.mIris);
      sky.uniform1f(u.uBloom, st.mBloom);
      sky.uniform1f(u.uGlint, st.mGlint);
      sky.uniform1f(u.uGlintA, st.mGlintA);
      sky.uniform1f(u.uSeed, st.mSeed);
      sky.uniform1f(u.uFlash, st.mFlash);
      sky.uniform1f(u.uTouch, st.mTouch);
      sky.uniform3f(u.uP1, st.p1.x, st.p1.a, st.p1.t);
      sky.uniform3f(u.uP2, st.p2.x, st.p2.a, st.p2.t);
      sky.uniform1f(u.uGlow, st.glow);
      sky.uniform1f(u.uLoad, st.load);
      sky.uniform1f(u.uLive, st.live);
      sky.uniform1f(u.uLight, st.light);
      sky.uniform1f(u.uGx, (st.treeX - .5) * asp);
      sky.uniform1f(u.uCrest, st.crest);
      sky.uniform1f(u.uGrow, st.grow);
      sky.uniform1f(u.uMouseE, st.mE);
      sky.uniform1f(u.uAlert, st.alert);
      sky.uniform1f(u.uTick, st.tick);
      sky.uniform1f(u.uDim, st.dim);
      sky.drawArrays(sky.TRIANGLES, 0, 3);

      // tree
      lastGrow = st.grow;
      life.clear(life.COLOR_BUFFER_BIT);
      if (st.grow <= .001 && !falling.length) return;

      var unitH = st.unit;
      var uPx = unitH * H * dprLife;
      var baseU = st.treeX, baseV = st.crest + .5;
      var sx = 2 * unitH / asp, sy = 2 * unitH;
      var bx = baseU * 2 - 1, by = baseV * 2 - 1;
      var ptrX = ((st.mx - baseU) * asp) / unitH, ptrY = (st.my - baseV) / unitH;

      function common(pr) {
        life.useProgram(pr.p);
        life.uniform2f(pr.u.uScale, sx, sy);
        life.uniform2f(pr.u.uBase, bx, by);
        life.uniform2f(pr.u.uPtr, ptrX, ptrY);
        life.uniform1f(pr.u.uT, st.t);
        life.uniform1f(pr.u.uGrow, st.grow);
        life.uniform1f(pr.u.uWind, st.wind);
        life.uniform1f(pr.u.uPush, st.mE);
        if (pr.u.uPx) life.uniform1f(pr.u.uPx, uPx);
      }

      common(branchP);
      attribs(bA, true);
      life.bindBuffer(life.ARRAY_BUFFER, branchBuf);
      life.vertexAttribPointer(bA.root, 2, life.FLOAT, false, 28, 0);
      life.vertexAttribPointer(bA.center, 2, life.FLOAT, false, 28, 8);
      life.vertexAttribPointer(bA.normal, 2, life.FLOAT, false, 28, 16);
      life.vertexAttribPointer(bA.born, 1, life.FLOAT, false, 28, 24);
      life.drawArrays(life.TRIANGLES, 0, tree.branches.length / 7);
      attribs(bA, false);

      common(leafP);
      attribs(lA, true);
      bindLeaves(leafBuf);
      life.drawArrays(life.POINTS, 0, tree.leaves.length / 8);

      if (falling.length) {
        life.uniform1f(leafP.u.uGrow, 2);
        life.uniform1f(leafP.u.uPush, 0);
        var keep = [], k = 0;
        for (var i = 0; i < falling.length; i++) {
          var f = falling[i];
          f.ph += dt * 2.2;
          f.vy = Math.max(f.vy - dt * .05, -.1);
          f.x += (f.vx + Math.sin(f.ph) * .05) * dt;
          f.y += (f.vy + Math.cos(f.ph * .7) * .018) * dt;
          if (f.y <= .004) { f.y = .004; f.vy = 0; f.vx = 0; f.rest += dt; }
          f.life = f.rest > 1.6 ? 1 - (f.rest - 1.6) / .9 : 1;
          if (f.life <= 0) continue;
          keep.push(f);
          fallData.set([f.x, f.y, f.r, f.g, f.b, f.s * f.life, 0, f.ph], k * 8);
          k++;
        }
        falling = keep;
        if (k) {
          life.bindBuffer(life.ARRAY_BUFFER, fallBuf);
          life.bufferSubData(life.ARRAY_BUFFER, 0, fallData.subarray(0, k * 8));
          bindLeaves(fallBuf);
          life.drawArrays(life.POINTS, 0, k);
        }
      }
      attribs(lA, false);
    }

    return { frame: frame, resize: resize, drop: drop, leaves: tree.leaves.length / 8 };
  }

  window.SteadyWorld = { init: init };
})();
