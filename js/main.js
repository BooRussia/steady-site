(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.max(a, Math.min(b, v)); }
  function sm(a, b, v) { var t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function bell(a, b, c, d, v) { return sm(a, b, v) * (1 - sm(c, d, v)); }

  // ---------- world ----------
  var world = null;
  try { world = window.SteadyWorld && window.SteadyWorld.init(); } catch (e) { if (window.console) console.warn(e); }
  if (!world) root.classList.add("no-gl");

  // ---------- measuring ----------
  var S = { race: $("#race"), still: $("#still"), quiet: $("#quiet"), tools: $("#tools"), perf: $("#t-performance"), alerts: $("#t-alerts"), tiny: $("#tiny"), home: $("#home"), roots: $("#roots") };
  var M = {}, vw = 0, vh = 0, wide = true, y = 0;
  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    wide = vw >= 1080;
    Object.keys(S).forEach(function (k) {
      var r = S[k].getBoundingClientRect();
      M[k] = { top: r.top + window.scrollY, h: r.height };
    });
    var size = Math.min(vw * (wide ? .205 : .27), vh * .44);
    root.style.setProperty("--word-size", size + "px");
    root.style.setProperty("--word-top", Math.max(vh * .425 - size * .82, 56) + "px");
    var carW = Math.min(vw * (wide ? .42 : .8), vh * .78);
    carEl.style.width = carW + "px";
    if (world) world.resize();
    y = window.scrollY;
    layoutRows();
  }
  function span(k) { return clamp((y - M[k].top) / Math.max(1, M[k].h - vh)); }

  // ---------- scroll + pointer state ----------
  var cur = { a: 0, b: 0, h: 0, g: 0, f: 0, glow: 0, alert: 0, load: 0 };
  var flow = 0, live = 0, rush = 0, lastY = window.scrollY, velocity = 0, wheelA = 0;
  var loadTarget = 0, alertsDone = false;
  var ptr = { x: .5, y: .5, tx: .5, ty: .5, e: 0, lastX: 0, lastY: 0, side: 1 };
  var plucks = [{ x: 0, a: 0, t: 9 }, { x: 0, a: 0, t: 9 }], plIndex = 0, lineY = 0, lineFree = false;

  window.addEventListener("pointermove", function (e) {
    var dx = e.clientX - ptr.lastX, dy = e.clientY - ptr.lastY;
    ptr.lastX = e.clientX;
    ptr.lastY = e.clientY;
    ptr.tx = e.clientX / vw;
    ptr.ty = 1 - e.clientY / vh;
    if (!reduce) ptr.e = Math.min(1, ptr.e + Math.sqrt(dx * dx + dy * dy) / 260);
    // crossing the quiet line plucks it, harder the faster you cross
    var side = e.clientY < lineY ? 1 : -1;
    if (lineFree && side !== ptr.side && !reduce) {
      plucks[plIndex] = { x: (e.clientX / vw - .5) * (vw / vh), a: Math.min(.05, .01 + Math.abs(dy) / vh * 1.1), t: 0 };
      plIndex = 1 - plIndex;
    }
    ptr.side = side;
  }, { passive: true });

  // ---------- elements driven by scroll ----------
  var worldEl = $("#world"), lifeEl = $("#life"), carEl = $("#car"), wordEl = $("#word"), racePin = $("#racePin"), hint = $("#hint");
  var quietSettle = $("#quietSettle"), quietBrand = $("#quietBrand"), quietLine = $("#quietLine"), quietSub = $("#quietSub"), homeCta = $("#homeCta");
  var wheels = $$(".wheel", carEl);
  var nav = $("#nav"), scrollOrbEl = $("#scrollOrb");
  var shots = $$(".shot");
  var toolSections = $$(".tool:not(.tool-pin), .tiny");
  var toolIn = $(".tool-in");
  var rootPaths = [];
  var CAR_ANGLE = .36, CAR_TILT = .2;

  var navAway = false, lastNavY = window.scrollY;
  function updateNav() {
    var dy = y - lastNavY;
    if (Math.abs(dy) > 6) {
      navAway = dy > 0 && y > vh * .4;
      lastNavY = y;
    }
    nav.classList.toggle("away", navAway);
    nav.classList.toggle("solid", y > vh * .4);
  }

  var startT = performance.now(), lastT = startT, t = 0, tick = 0, wasStage = -1;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(.05, (now - lastT) / 1000);
    lastT = now;
    if (!reduce) { t += dt; tick = Math.floor(t * 18) % 256; }

    y = window.scrollY;
    velocity = (y - lastY) / Math.max(dt, .001) / Math.max(vh, 1);
    lastY = y;
    rush += (clamp(Math.abs(velocity) / 2.4) - rush) * (1 - Math.exp(-dt * 5));

    var k = 1 - Math.exp(-dt * (reduce ? 60 : 7));
    cur.a += (span("race") - cur.a) * k;
    cur.b += (span("still") - cur.b) * k;
    cur.h += (span("quiet") - cur.h) * k;
    cur.g += (clamp((y + vh * .35 - M.tools.top) / M.tools.h) - cur.g) * k;
    cur.f += (span("home") - cur.f) * k;

    var perfIn = clamp((y + vh * .55 - M.perf.top) / (vh * .55));
    var perfOut = clamp((y + vh - (M.perf.top + M.perf.h)) / (vh * .55));
    cur.glow += (perfIn * (1 - perfOut) - cur.glow) * k;
    var alertIn = clamp((y + vh * .5 - M.alerts.top) / (vh * .5)) * (1 - clamp((y + vh * .4 - (M.alerts.top + M.alerts.h)) / (vh * .4)));
    cur.alert += ((alertsDone ? 0 : alertIn * .6) - cur.alert) * k;
    cur.load += (loadTarget - cur.load) * (1 - Math.exp(-dt * (loadTarget ? 2.6 : 1.5)));

    var a = cur.a, b = cur.b, h = cur.h, g = cur.g, f = cur.f;
    var calm = clamp(.1 * sm(0, 1, a) + .42 * sm(.08, 1, b) + .48 * sm(0, .07, h));

    ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt * 6));
    ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt * 6));
    ptr.e *= Math.exp(-dt * 1.1);

    // the trail slows as the page calms, and runs a touch faster while you scroll fast
    if (!reduce) flow += dt * (mix(1.5, .015, Math.pow(calm, .7)) + rush * 1.1 * (1 - calm));
    live += dt * (.7 + cur.load * 3.2);

    var homeLift = sm(0, .55, f);
    var crest = wide ? -.215 : -.205;
    var maxUnit = (vw * .96) / (1.6 * vh);
    var unit = Math.min(wide ? mix(.32, .36, homeLift) : mix(.3, .35, homeLift), maxUnit);
    var carU = wide ? .47 : .24, carV = wide ? .395 : .47;
    var head = a * a * 1.5 + a * .14;

    var treeX = wide ? mix(.75, .5, homeLift) : .5;
    var asp = vw / vh;

    // the quiet: the beam thins to one white line, the whole line breaks into colored spikes,
    // they settle, one beat is written across the dark, the line opens out into the logo,
    // and the logo drops to the hill as a seed
    var edge = sm(0, .92, calm);
    var chaos = sm(.05, .1, h) * (1 - sm(.17, .27, h));
    var open = sm(.54, .62, h), pull = sm(.52, .66, h), fall = sm(.72, .88, h);
    var sPulse = Math.min(.034, .8 * vw / (16 * vh)), sLogo = Math.min(.0195, .62 * vw / (23 * vh));
    var mS = mix(mix(sPulse, sLogo, pull), .0007, Math.pow(fall, .6));
    var mCx = mix(0, (treeX - .5) * asp, fall * fall);
    var mCy = mix(mix(0, wide ? .055 : .07, pull), crest + .006, sm(.1, 1, fall));
    var sweepT = clamp((h - .28) / .16);
    var sweepE = mix(sweepT, .5 + 4 * Math.pow(sweepT - .5, 3), .6);
    var sweepX = sweepT <= 0 ? -9 : (sweepT >= 1 ? 9 : mix(-asp * .5 - .1, asp * .5 + .55, sweepE));
    var sweepOn = bell(0, .02, .97, 1, sweepT);
    var mA = sm(.82, .93, edge) * (1 - sm(.9, .95, h));
    lineFree = mA > .5 && open < .5 && h < .6 && y >= M.quiet.top - vh;
    lineY = (.5 - mCy) * vh;
    plucks.forEach(function (pl) { pl.t = Math.min(pl.t + dt, 9); });

    var grow = Math.max(.05 * sm(.88, 1, h), h > .88 ? mix(.05, .9, g) : 0);
    grow = mix(grow, 1, sm(.02, .46, f));
    var light = mix(mix(.06, .46, sm(0, 1, g)), 1, sm(.02, .48, f));

    if (world) {
      world.frame({
        t: t, tick: tick, flow: flow, live: live,
        mx: ptr.x, my: ptr.y, mE: ptr.e,
        calm: calm, head: head, carU: carU, carV: carV,
        dim: 1 - .5 * bell(.0, .07, .62, .92, b),
        hills: sm(.66, .88, h),
        mA: mA, mS: mS, mCx: mCx, mCy: mCy,
        mThick: mix(.0016, 1.2 * mS, open),
        mSweep: sweepX, mSweepOn: sweepOn, mAhead: mix(1, .42, sm(.25, .29, h)),
        mJag: reduce ? chaos * .4 : Math.max(chaos, rush * .2) * (1 - open),
        mExt: open, mIris: 22 * sm(.54, .66, h),
        mBloom: bell(.36, .42, .5, .58, h),
        mGlint: -(asp * .5 + .15) + (t * .62) % (asp + .3), mGlintA: reduce ? 0 : bell(.44, .46, .52, .54, h),
        mSeed: bell(.8, .86, .9, .96, h),
        mFlash: sweepOn * Math.exp(-(sweepX / .3) * (sweepX / .3)),
        mTouch: reduce ? 0 : 1,
        p1: plucks[0], p2: plucks[1],
        glow: cur.glow, load: cur.load, alert: cur.alert,
        light: light, treeX: treeX, crest: crest,
        grow: grow, unit: unit,
        wind: reduce ? 0 : .9 + ptr.e * 1.8 + rush * 2
      }, dt);
    }

    // on narrow screens the tree stands behind the words, so it stays faint until the end
    if (lifeEl) lifeEl.style.opacity = wide ? 1 : mix(.3, 1, sm(.02, .34, f)).toFixed(3);

    // the car, leaving
    if (a < .995) {
      var cx = carU * vw + head * Math.cos(CAR_ANGLE) * vh;
      var cy = (1 - carV) * vh + head * Math.sin(CAR_ANGLE) * vh;
      var w = carEl.offsetWidth, ch = carEl.offsetHeight;
      carEl.style.transform = "translate(" + (cx - w * .14).toFixed(1) + "px," + (cy - ch * .7).toFixed(1) + "px) rotate(" + CAR_TILT + "rad)";
      carEl.style.opacity = 1 - sm(.65, .98, a);
      if (!reduce) {
        wheelA += dt * mix(1500, 240, a) * (1 + rush);
        wheels.forEach(function (wh) { wh.setAttribute("transform", "rotate(" + (wheelA % 360).toFixed(1) + " " + wh.getAttribute("data-c") + ")"); });
      }
      carEl.style.visibility = "visible";
    } else {
      carEl.style.visibility = "hidden";
    }

    racePin.style.opacity = 1 - sm(.2, .62, a);
    racePin.style.visibility = a > .7 ? "hidden" : "visible";
    if (hint) hint.style.setProperty("--hint", reduce ? 1 : (.5 + .5 * Math.sin(t * 2)).toFixed(3));

    quietSettle.style.opacity = bell(.16, .195, .245, .275, h);
    var brandOn = bell(.61, .66, .72, .76, h);
    quietBrand.style.opacity = brandOn;
    quietBrand.style.transform = "translateY(" + ((1 - sm(.61, .67, h)) * 16).toFixed(1) + "px)";
    var lineOn = bell(.84, .88, .97, 1, h);
    quietLine.style.opacity = lineOn;
    quietLine.style.transform = "translateY(" + ((1 - sm(.84, .9, h)) * 14).toFixed(1) + "px)";
    quietSub.style.opacity = lineOn * .9;

    // one chapter at a time: each one comes into focus as it reaches the middle
    toolSections.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) return;
      var into = clamp((vh * .92 - r.top) / (vh * .32));
      var out = clamp((vh * .18 - r.bottom) / (vh * .3) + 1);
      el.style.opacity = (into * (1 - clamp(out * 1.2))).toFixed(3);
    });
    if (toolIn) toolIn.style.opacity = (cur.glow).toFixed(3);
    shots.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      el.style.setProperty("--flat", clamp((vh - r.top) / (vh * .7)).toFixed(3));
    });

    // home
    var wordIn = sm(.14, .42, f);
    wordEl.style.opacity = wordIn.toFixed(3);
    wordEl.style.transform = "translateY(" + ((1 - wordIn) * vh * .09).toFixed(1) + "px) scale(" + (1.03 - .03 * wordIn).toFixed(4) + ")";
    var ctaIn = sm(.34, .5, f);
    homeCta.style.opacity = ctaIn.toFixed(3);
    homeCta.style.visibility = ctaIn > .02 ? "visible" : "hidden";

    // past the hill, the world scrolls up and away with the page
    var down = Math.max(0, y - (M.home.top + M.home.h - vh));
    worldEl.style.transform = down ? "translate3d(0," + (-down).toFixed(1) + "px,0)" : "";
    worldEl.style.visibility = down > vh ? "hidden" : "visible";
    var rootsP = clamp((y + vh - M.roots.top) / (vh * 1.15));
    rootPaths.forEach(function (p, i) { p.style.setProperty("--dash", (1 - clamp(rootsP * (1.12 - i * .03))).toFixed(3)); });

    scrollOrbEl.classList.toggle("on", y > vh * .9 && f < .3 && down < 1);
    updateNav();
    stepList(b, now);
    stepStress(dt);
    stepOrbs(dt);
    stepScrollOrb(dt);
    ambientLeaves(f, dt);
  }

  var ambient = 0;
  function ambientLeaves(f, dt) {
    if (!world || reduce || f < .4) return;
    ambient += dt;
    if (ambient > 1.3) { ambient = 0; world.drop(1); }
  }

  // ---------- the list: chaos settling into calm ----------
  var APPS = [
    ["Google Chrome", 9, 2100, "#4a8af4"], ["Antimalware Service Executable", 7, 310, null], ["Discord", 4, 640, "#5865f2"],
    ["Desktop Window Manager", 5, 180, null], ["Service Host: Local System", 3, 96, null], ["Steam", 2, 520, "#6c8fb0"],
    ["Spotify", 3, 410, "#1db954"], ["Runtime Broker", 1, 34, null], ["WMI Provider Host", 3, 18, null],
    ["Microsoft Edge WebView2", 2, 280, "#0c8ad8"], ["COM Surrogate", 1, 12, null], ["System", 2, 8, null]
  ];
  var listEl = $("#list"), feedback = $("#feedback");
  var rows = [], stage = -1, hovering = false, hoverTrail = [], misses = 0, lastShuffle = 0, lastCalmSort = 0, hideCount = -1, lastSmooth = 0;
  var listTitle = null, listNote = null;
  var beats = $$(".beat");

  function buildList() {
    listEl.innerHTML =
      "<div class='list-title'><img src='img/logo.svg' alt=''><span id='listTitle'>Task Manager</span></div>" +
      "<div class='mrow head'><span>Name</span><span class='impact'>Impact</span><span class='v'>CPU</span><span class='v'>Memory</span><span class='end-head'></span></div>";
    listTitle = $("#listTitle");
    rows = APPS.map(function (a) {
      var el = document.createElement("div");
      el.className = "mrow";
      var dot = a[3] || "#555";
      el.innerHTML = "<span class='name'><span class='ic' style='background:" + dot + "'></span><span class='nm'>" + a[0] + "</span></span>" +
        "<span class='impact'>Low</span><span class='v cpu'></span><span class='v mem'></span><button type='button' class='end'>End task</button>";
      listEl.appendChild(el);
      var row = { el: el, name: a[0], base: a[1], mem: a[2], sys: !a[3], cpu: a[1], smooth: a[1], rank: a[1], ended: false, sure: 0 };
      var end = $(".end", el);
      end.addEventListener("click", function (e) { e.stopPropagation(); endTask(row, end); });
      row.cpuEl = $(".cpu", el);
      row.memEl = $(".mem", el);
      row.impactEl = $(".impact", el);
      return row;
    });
    listNote = document.createElement("div");
    listNote.className = "list-note";
    listNote.innerHTML = "<b>7 system processes hidden.</b> You can't close them anyway.";
    listEl.appendChild(listNote);

    listEl.addEventListener("mouseenter", function () { hovering = true; });
    listEl.addEventListener("mouseleave", function () { hovering = false; });
    listEl.addEventListener("mousemove", function (e) {
      var row = e.target.closest(".mrow");
      hoverTrail.push({ t: performance.now(), name: row ? $(".nm", row) && $(".nm", row).textContent : null });
      if (hoverTrail.length > 40) hoverTrail.shift();
    });
    listEl.addEventListener("click", function (e) {
      if (stage !== 0) return;
      var row = e.target.closest(".mrow");
      if (!row || row.classList.contains("head")) return;
      var got = $(".nm", row).textContent, now = performance.now(), aimed = null;
      for (var i = hoverTrail.length - 1; i >= 0; i--) {
        if (now - hoverTrail[i].t > 220) { aimed = hoverTrail[i].name; break; }
      }
      misses++;
      if (aimed && aimed !== got) feedback.textContent = "You aimed at " + aimed + ". You clicked " + got + ".";
      else if (got === "Google Chrome") feedback.textContent = "Got Chrome… this time.";
      else feedback.textContent = "That's " + got + ". Chrome moved.";
    });
  }

  function endTask(row, btn) {
    if (!row.sure) {
      row.sure = 1;
      btn.textContent = "Confirm";
      btn.classList.add("sure");
      setTimeout(function () {
        if (row.ended) return;
        row.sure = 0;
        btn.textContent = "End task";
        btn.classList.remove("sure");
      }, 3000);
      return;
    }
    row.ended = true;
    row.el.classList.add("gone");
    feedback.textContent = "Ended " + row.name + ". Nothing else moved.";
    layoutRows();
  }

  function rowH() { return parseFloat(getComputedStyle(listEl).getPropertyValue("--row")) || 36; }
  var ROW = 36;
  function visible() { return rows.filter(function (r) { return !r.hidden && !r.ended; }); }
  function layoutRows() {
    if (!rows.length) return;
    ROW = rowH();
    var i = 0;
    rows.forEach(function (r) {
      r.el.style.height = ROW + "px";
      if (r.hidden || r.ended) return;
      r.el.style.top = (76 + i * ROW) + "px";
      i++;
    });
    listEl.style.height = (76 + Math.max(i, 3) * ROW + (stage > 0 ? 56 : 0)) + "px";
    if (listNote) listNote.innerHTML = "<b>" + Math.max(hideCount, 0) + " system process" + (hideCount === 1 ? "" : "es") + " hidden.</b> You can't close them anyway.";
  }

  function heatOld(v, hi) {
    var f = clamp(v / hi);
    if (f < .05) return "transparent";
    return "rgb(255," + Math.round(248 - 48 * f) + "," + Math.round(210 - 90 * f) + ")";
  }
  function heatNew(v, hi) {
    var f = clamp(v / hi);
    if (f < .06) return "transparent";
    return "rgba(255," + Math.round(196 - 120 * f) + "," + Math.round(64 - 20 * f) + "," + (.12 + .5 * f).toFixed(2) + ")";
  }
  function fmtMem(m) { return m >= 1000 ? (m / 1024).toFixed(2) + " GB" : Math.round(m) + " MB"; }
  function impactOf(r) {
    var s = r.smooth / 20 + r.mem / 2600;
    if (s > .95) return ["Very high", "#f25c5c"];
    if (s > .55) return ["High", "#ffb547"];
    if (s > .28) return ["Moderate", "#f7d774"];
    return ["Low", "#7b8275"];
  }

  function paintRows() {
    rows.forEach(function (r) {
      var old = stage === 0;
      var c = old ? r.cpu : r.smooth;
      r.cpuEl.textContent = c.toFixed(1) + "%";
      r.cpuEl.style.background = old ? heatOld(c, 20) : heatNew(c, 20);
      var m = old ? r.mem * (.96 + Math.random() * .09) : r.mem;
      r.memEl.textContent = old ? m.toFixed(m >= 1000 ? 0 : 1) + " MB" : fmtMem(m);
      r.memEl.style.background = old ? heatOld(m, 2200) : heatNew(m, 2200);
      if (stage === 2) {
        var im = impactOf(r);
        r.impactEl.textContent = im[0];
        r.impactEl.style.setProperty("--dotc", im[1]);
      }
    });
  }

  function reshuffle() {
    rows.forEach(function (r) { r.cpu = Math.max(0, r.base * (.15 + Math.random() * 2.2) + (Math.random() < .15 ? Math.random() * 6 : 0)); });
    rows.sort(function (x, y2) { return y2.cpu - x.cpu; });
    layoutRows();
    paintRows();
  }

  function stepList(b, now) {
    if (!rows.length) return;
    var st = b < .3 ? 0 : (b < .62 ? 1 : 2);
    if (st !== stage) {
      stage = st;
      listEl.setAttribute("data-stage", st);
      listTitle.textContent = st === 0 ? "Task Manager" : "Steady";
      beats.forEach(function (be, i) { be.classList.toggle("on", i === st); });
      if (st === 0) {
        rows.forEach(function (r) { r.ended = false; r.sure = 0; r.el.classList.remove("gone"); var e = $(".end", r.el); e.textContent = "End task"; e.classList.remove("sure"); });
        feedback.textContent = "Go on. Aim for it.";
      } else if (st === 1) feedback.textContent = "";
      else feedback.textContent = hovering ? "Holding still while your mouse is here." : "Hover the list. Then try End task.";
      layoutRows();
      paintRows();
    }

    // system processes leave one at a time, tied to scroll
    var hide = st === 0 ? 0 : Math.round(7 * sm(.3, .56, b));
    if (hide !== hideCount) {
      hideCount = hide;
      var n = 0;
      APPS.forEach(function (a) {
        if (a[3]) return;
        var row = rows.filter(function (r) { return r.name === a[0]; })[0];
        row.hidden = n < hide;
        row.el.classList.toggle("gone", row.hidden || row.ended);
        n++;
      });
      layoutRows();
    }

    if (reduce) return;
    if (st === 0) {
      var gap = mix(420, 900, clamp(b / .3));
      if (now - lastShuffle > gap) { lastShuffle = now; reshuffle(); }
    } else if (now - lastSmooth > 1000) {
      lastSmooth = now;
      rows.forEach(function (r) {
        var target = Math.max(0, r.base * (.15 + Math.random() * 2.2));
        r.smooth += (target - r.smooth) * .25;
        r.rank += (r.smooth - r.rank) * .08;
      });
      paintRows();
      // only swap when one is clearly ahead, and never under the mouse (same rule as the app)
      if (!hovering && now - lastCalmSort > 5000) {
        lastCalmSort = now;
        for (var i = 1; i < rows.length; i++) {
          var j = i;
          while (j > 0 && rows[j].rank > rows[j - 1].rank * 1.12 + .5) {
            var tmp = rows[j]; rows[j] = rows[j - 1]; rows[j - 1] = tmp; j--;
          }
        }
        layoutRows();
      }
      if (st === 2 && hovering && feedback.textContent.indexOf("Ended") !== 0) feedback.textContent = "Holding still while your mouse is here.";
    }
  }

  // ---------- performance: press to add load ----------
  var stress = $("#stress");
  var metrics = { cpu: [12, 100], mem: [41, 88], gpu: [8, 98], disk: [1, 64] };
  var metricEls = {};
  $$("#readout dd").forEach(function (d) { metricEls[d.getAttribute("data-m")] = d; });
  function press(on) { loadTarget = on ? 1 : 0; stress.classList.toggle("on", on); }
  stress.addEventListener("pointerdown", function (e) { stress.setPointerCapture(e.pointerId); press(true); });
  stress.addEventListener("pointerup", function () { press(false); });
  stress.addEventListener("pointercancel", function () { press(false); });
  stress.addEventListener("lostpointercapture", function () { press(false); });
  stress.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); press(true); } });
  stress.addEventListener("keyup", function (e) { if (e.key === " " || e.key === "Enter") press(false); });
  stress.addEventListener("blur", function () { press(false); });
  var readoutT = 0;
  function stepStress(dt) {
    readoutT += dt;
    if (readoutT < .12 || cur.glow < .02) return;
    readoutT = 0;
    Object.keys(metrics).forEach(function (m, i) {
      var r = metrics[m];
      var v = mix(r[0], r[1], cur.load) + (reduce ? 0 : Math.sin(t * (1.1 + i * .37) + i) * (1.6 + cur.load));
      metricEls[m].textContent = Math.round(clamp(v, 0, 100)) + "%";
    });
  }

  // ---------- storage ----------
  var TOTAL = 1820;
  var drive = [
    { n: "Steam games", gb: 612, kids: [
      { n: "The space sim you meant to get back to", gb: 141, kind: "steam" },
      { n: "A shooter, last played in March", gb: 96, kind: "steam" },
      { n: "A parkour game", gb: 28, kind: "steam" },
      { n: "Everything else in your library", gb: 347, kind: "steam" }
    ] },
    { n: "Videos", gb: 388, kids: [
      { n: "Clips you recorded and never watched", gb: 214, kind: "file" },
      { n: "Holiday.mp4", gb: 38, kind: "file", why: "Two copies of this file. Keep one." },
      { n: "Holiday (1).mp4", gb: 38, kind: "file", why: "Two copies of this file. Keep one." },
      { n: "Everything else", gb: 98, kind: "file" }
    ] },
    { n: "Downloads", gb: 184, kids: [
      { n: "Old installers", gb: 61, kind: "file" },
      { n: "Zips you already unzipped", gb: 74, kind: "file" },
      { n: "Everything else", gb: 49, kind: "file" }
    ] },
    { n: "Windows", gb: 48, kind: "lock", why: "Windows needs this to start, so it's locked. Use Windows' own cleanup instead." },
    { n: "pagefile.sys", gb: 31.1, kind: "lock", why: "Windows' virtual memory file. You can resize it in Settings › System › About." },
    { n: "Temporary files", gb: 2.6, kind: "clean" }
  ];
  var usedBase = 1660, freed = 0, openDir = null;
  var filesEl = $("#files"), crumb = $("#crumb"), driveFree = $("#driveFree"), driveBar = $("#driveBar span"), storageNote = $("#storageNote");
  function fmtGb(g) { return g >= 1000 ? (g / 1000).toFixed(2) + " TB" : (g >= 10 ? Math.round(g) : g.toFixed(1)) + " GB"; }
  function renderDrive() {
    var used = usedBase - freed;
    driveFree.textContent = fmtGb(TOTAL - used) + " free";
    driveBar.style.setProperty("--w", (used / TOTAL * 100).toFixed(1) + "%");
    driveBar.style.setProperty("--c", used / TOTAL > .85 ? "var(--danger)" : "var(--cpu)");
  }
  function renderFiles() {
    var list = openDir ? openDir.kids : drive;
    var max = Math.max.apply(null, list.map(function (i) { return i.gb; }).concat([1]));
    filesEl.innerHTML = "";
    crumb.hidden = !openDir;
    if (openDir) crumb.textContent = "Back to C:";
    if (!list.length) {
      var e = document.createElement("li");
      e.textContent = "All clear in here.";
      filesEl.appendChild(e);
    }
    list.forEach(function (item) {
      var li = document.createElement("li");
      if (item.kids) li.className = "is-dir";
      var name = document.createElement(item.kids ? "button" : "span");
      name.className = "f-name";
      name.textContent = item.n;
      if (item.kids) {
        name.type = "button";
        name.addEventListener("click", function () { openDir = item; renderFiles(); });
      }
      li.appendChild(name);
      var size = document.createElement("span");
      size.className = "f-size";
      size.textContent = fmtGb(item.gb);
      li.appendChild(size);
      if (item.kind === "lock") {
        var lock = document.createElement("span");
        lock.className = "lock";
        lock.textContent = "Locked";
        li.appendChild(lock);
      } else if (!item.kids) {
        var act = document.createElement("button");
        act.type = "button";
        act.className = "act";
        var label = item.kind === "steam" ? "Uninstall in Steam" : (item.kind === "clean" ? "Clean up" : "Delete");
        act.textContent = label;
        act.addEventListener("click", function () { removeFile(item, act, label); });
        li.appendChild(act);
      } else {
        var open = document.createElement("span");
        open.className = "lock";
        open.textContent = "Open";
        li.appendChild(open);
      }
      var bar = document.createElement("span");
      bar.className = "f-bar";
      bar.innerHTML = "<span style='width:" + (item.gb / max * 100).toFixed(1) + "%'></span>";
      li.appendChild(bar);
      if (item.why) {
        var why = document.createElement("span");
        why.className = "f-why";
        why.textContent = item.why;
        li.appendChild(why);
      }
      filesEl.appendChild(li);
    });
  }
  function removeFile(item, btn, label) {
    if (!item.sure) {
      item.sure = true;
      btn.textContent = "Confirm";
      btn.classList.add("sure");
      setTimeout(function () { item.sure = false; if (btn.isConnected) { btn.textContent = label; btn.classList.remove("sure"); } }, 3000);
      return;
    }
    freed += item.gb;
    var list = openDir ? openDir.kids : drive;
    list.splice(list.indexOf(item), 1);
    if (openDir) openDir.gb = Math.max(0, openDir.gb - item.gb);
    storageNote.textContent = fmtGb(item.gb) + " back. " + (item.kind === "steam" ? "In the real app, Steam takes it from here." : (item.kind === "clean" ? "In the real app, only files over a day old go." : "In the real app, that goes to the Recycle Bin.")) + " Here, only the leaves fell.";
    if (world) world.drop(Math.min(130, 14 + item.gb * .7));
    renderDrive();
    renderFiles();
  }
  crumb.addEventListener("click", function () {
    if (openDir && !openDir.kids.length) drive.splice(drive.indexOf(openDir), 1);
    openDir = null;
    renderFiles();
  });

  // ---------- drivers ----------
  var drvBtn = $("#drvUpdate"), drvNote = $("#driverNote");
  if (drvBtn) drvBtn.addEventListener("click", function () {
    drvBtn.disabled = true;
    drvBtn.textContent = "Downloading…";
    setTimeout(function () {
      drvBtn.textContent = "Checking signature…";
      setTimeout(function () {
        $("#drvHave").textContent = "617.42";
        var ok = document.createElement("span");
        ok.className = "pill-ok";
        ok.textContent = "Up to date";
        drvBtn.replaceWith(ok);
        drvNote.textContent = "A demo. The real thing downloads NVIDIA's own installer, verifies its signature, then opens it for you.";
      }, 1000);
    }, 900);
  });

  // ---------- alerts: spot the fakes ----------
  var ENCODED = "UwB0AGEAcgB0AC0AUwBsAGUAZQBwACAALQBTAGUAYwBvAG4AZABzACAAMQAyADAA";
  var decoded = "";
  try { decoded = atob(ENCODED).replace(/\0/g, ""); } catch (e) { decoded = "Start-Sleep -Seconds 120"; }
  var PROCS = [
    { n: "chrome.exe", w: "C:\\Program Files\\Google\\Chrome\\Application", ok: "Signed by Google, in the right folder. Nothing to see." },
    { n: "svch0st.exe", w: "C:\\Users\\you\\AppData\\Roaming", bad: "A look-alike name: that's a zero, not an o. The real one is svchost.exe, and it never lives in AppData." },
    { n: "svchost.exe", w: "C:\\Windows\\System32", ok: "The real one. Signed by Microsoft, in System32. It's meant to look boring." },
    { n: "invoice.pdf.exe", w: "C:\\Users\\you\\Downloads", bad: "Disguised. It's named like a PDF, but it's a program, and it isn't digitally signed." },
    { n: "Discord.exe", w: "C:\\Users\\you\\AppData\\Local\\Discord", ok: "Signed by Discord. Plenty of normal apps install to AppData." },
    { n: "powershell.exe -EncodedCommand", w: ENCODED.slice(0, 34) + "…", bad: "PowerShell running a scrambled command, one of the most common ways malware runs code in secret. Steady decodes it, so you can read it:", code: decoded }
  ];
  var procEl = $("#procs"), alertNote = $("#alertNote"), foundBad = 0, totalBad = PROCS.filter(function (p) { return p.bad; }).length;
  if (procEl) {
    var ul = document.createElement("ul");
    ul.className = "procs-list";
    PROCS.forEach(function (p) {
      var li = document.createElement("li");
      li.className = "proc";
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-expanded", "false");
      b.innerHTML = "<span class='p-name'></span><span class='p-tag'></span><span class='p-where'></span>";
      $(".p-name", b).textContent = p.n;
      $(".p-where", b).textContent = p.w;
      li.appendChild(b);
      b.addEventListener("click", function () {
        var why = $(".p-why", li);
        if (why) { var hid = !why.hidden; why.hidden = hid; b.setAttribute("aria-expanded", String(!hid)); return; }
        li.classList.add(p.bad ? "bad" : "fine");
        $(".p-tag", b).textContent = p.bad ? "High risk" : "Looks fine";
        b.setAttribute("aria-expanded", "true");
        why = document.createElement("p");
        why.className = "p-why";
        why.textContent = p.bad || p.ok;
        if (p.code) { var c = document.createElement("code"); c.textContent = p.code; why.appendChild(c); }
        if (p.bad) {
          var offer = document.createElement("span");
          offer.className = "p-offer";
          offer.textContent = "Steady offers: End process · Scan with Microsoft Defender · Open location · I trust this";
          why.appendChild(offer);
          foundBad++;
          if (foundBad === totalBad) {
            alertsDone = true;
            alertNote.textContent = "All three. In the real app you wouldn't have to look. It's not antivirus: it points out unusual behavior so you can decide.";
          } else {
            alertNote.textContent = foundBad + " of " + totalBad + " found.";
          }
        }
        li.appendChild(why);
      });
      ul.appendChild(li);
    });
    procEl.appendChild(ul);
  }

  // ---------- orbs: a port of OrbMeter in src/Widget.cs ----------
  var TINT = { cpu: [91, 157, 255], mem: [177, 140, 255], gpu: [61, 214, 140], lime: [201, 232, 74] };
  var WARM = [255, 107, 91];
  function mixC(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function css(c, al) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (al === undefined ? 1 : al) + ")"; }
  function Orb(canvas, tint, size) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.tint = tint;
    this.size = size;
    this.level = -1;
    this.target = 0;
    this.p1 = Math.random() * 6;
    this.p2 = Math.random() * 6;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.height = Math.round(size * dpr);
  }
  Orb.prototype.wave = function (x0, x1, yy, amp, freq, phase, bottom, fill) {
    var g = this.ctx, steps = this.size > 60 ? 36 : 14, w = x1 - x0;
    g.beginPath();
    g.moveTo(x0, bottom);
    for (var i = 0; i <= steps; i++) {
      g.lineTo(x0 + w * i / steps, yy + amp * Math.sin(i / steps * Math.PI * 2 * freq + phase));
    }
    g.lineTo(x1, bottom);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  Orb.prototype.step = function (dt, energy, heat) {
    if (this.level < 0) this.level = this.target;
    this.level += (this.target - this.level) * (1 - Math.exp(-dt / .45));
    var e = energy === undefined ? this.target : energy;
    var speed = 1.3 + 5.2 * e;
    if (!reduce) { this.p1 += dt * speed; this.p2 += dt * speed * .71; }
    var d = this.c.width, g = this.ctx, r = d / 2, cx = r, cy = r;
    var level = Math.max(.04, this.level);
    var warm = heat === undefined ? clamp((level - .78) / .17) : heat;
    var c = mixC(this.tint, WARM, warm);
    g.clearRect(0, 0, d, d);
    g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fillStyle = css(c, .17); g.fill();
    g.save();
    g.beginPath(); g.arc(cx, cy, r - d / 56, 0, 6.2832); g.clip();
    var top = cy - r, surface = top + d * (1 - level), amp = d / 24 * (.7 + 2 * e);
    this.wave(cx - r, cx + r, surface - amp * .4, amp * .85, 1.35, this.p2 + 1.7, cy + r, css(c, .44));
    var gr = g.createLinearGradient(0, surface, 0, cy + r);
    gr.addColorStop(0, css(mixC(c, [255, 255, 255], .35)));
    gr.addColorStop(1, css(c));
    this.wave(cx - r, cx + r, surface, amp, 1, this.p1, cy + r, gr);
    g.restore();
    g.lineWidth = Math.max(1, d / 22);
    g.strokeStyle = css(c, .63);
    g.beginPath(); g.arc(cx, cy, r - g.lineWidth / 2, 0, 6.2832); g.stroke();
    g.fillStyle = "rgba(255,255,255,.33)";
    g.beginPath(); g.ellipse(cx - r * .38, cy - r * .45, r * .2, r * .12, 0, 0, 6.2832); g.fill();
  };

  var orbSet = {}, miniSet = {}, orbVal = {};
  var orbT = { cpu: { base: .22, touched: 0 }, mem: { base: .56, touched: 0 }, gpu: { base: .34, touched: 0 } };
  var orbsEl = $("#orbs");
  function buildOrbs() {
    $$("canvas[data-orb]").forEach(function (cv) {
      var key = cv.getAttribute("data-orb");
      var o = new Orb(cv, TINT[key], cv.getBoundingClientRect().width || 120);
      o.target = orbT[key].base;
      orbSet[key] = o;
      orbVal[key] = $("[data-orb-v='" + key + "']");
      function setFrom(ev) {
        var r = cv.getBoundingClientRect();
        var v = clamp(1 - (ev.clientY - r.top) / r.height);
        orbT[key].base = v;
        orbT[key].touched = 1;
      }
      cv.addEventListener("pointerdown", function (ev) { cv.setPointerCapture(ev.pointerId); cv._drag = true; setFrom(ev); });
      cv.addEventListener("pointermove", function (ev) { if (cv._drag) setFrom(ev); });
      cv.addEventListener("pointerup", function () { cv._drag = false; });
      cv.addEventListener("pointercancel", function () { cv._drag = false; });
      cv.addEventListener("keydown", function (ev) {
        var s = { ArrowUp: .05, ArrowRight: .05, ArrowDown: -.05, ArrowLeft: -.05 }[ev.key];
        if (!s) return;
        ev.preventDefault();
        orbT[key].base = clamp(orbT[key].base + s);
        orbT[key].touched = 1;
      });
    });
    $$("canvas[data-mini]").forEach(function (cv) {
      var key = cv.getAttribute("data-mini");
      miniSet[key] = new Orb(cv, TINT[key], 22);
    });
  }
  var orbClock = 0, orbsVisible = false;
  if (orbsEl) new IntersectionObserver(function (es) { orbsVisible = es[0].isIntersecting; }).observe(orbsEl.parentNode);
  function stepOrbs(dt) {
    if (!orbsVisible) return;
    orbClock += dt;
    Object.keys(orbSet).forEach(function (k, i) {
      var o = orbSet[k], m = orbT[k];
      // until you touch one, it wanders the way a real PC does
      var wander = m.touched || reduce ? 0 : Math.sin(orbClock * (.5 + i * .17) + i * 2) * .05;
      o.target = clamp(m.base + wander);
      o.step(dt);
      miniSet[k].target = o.target;
      miniSet[k].step(dt);
      var pct = Math.round(o.level * 100);
      if (orbVal[k]._v !== pct) {
        orbVal[k]._v = pct;
        orbVal[k].textContent = pct + "%";
        o.c.setAttribute("aria-valuenow", pct);
      }
    });
  }
  var clock = $("#tbClock");
  function tickClock() {
    var d = new Date();
    if (clock) clock.textContent = d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  tickClock();
  setInterval(tickClock, 15000);

  // The page's own orb: full at the bottom, choppy when you scroll fast.
  var scrollOrb = null;
  function stepScrollOrb(dt) {
    if (!scrollOrb) return;
    if (!scrollOrbEl.classList.contains("on")) return;
    var max = M.home.top + M.home.h - vh;
    scrollOrb.target = clamp(y / Math.max(1, max));
    scrollOrb.step(dt, clamp(.08 + rush * 1.1), clamp((rush - .45) * 2));
  }

  // ---------- my PC: what a browser can guess ----------
  function browserGuess() {
    var threads = navigator.hardwareConcurrency;
    var mem = navigator.deviceMemory;
    var gpu = "";
    try {
      var c = document.createElement("canvas"), gl = c.getContext("webgl");
      var ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "";
      var lose = gl && gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    } catch (e) { gpu = ""; }
    gpu = gpu.replace(/^ANGLE \((.*)\)$/, "$1").split(",").map(function (s) { return s.trim(); });
    gpu = (gpu[1] || gpu[0] || "").replace(/\s*\(0x[0-9a-f]+\)/i, "").replace(/\s*Direct3D.*$/i, "").trim();
    return [
      ["Processor", threads ? threads + " threads, model unknown" : "No idea", "Exact model, speed, cores and threads"],
      ["Memory", mem ? "At least " + mem + " GB" : "No idea", "Each stick of RAM and its speed"],
      ["Graphics", gpu || "A rough guess at best", "Every card, its video memory and driver"],
      ["Motherboard", "No idea", "Board and BIOS version"],
      ["Drives", "No idea", "Every drive and its free space"]
    ];
  }
  function buildSpecs() {
    var body = $("#specs tbody"), g = browserGuess();
    g.forEach(function (r) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = r[0];
      tr.appendChild(th);
      [r[1], r[2]].forEach(function (s) { var td = document.createElement("td"); td.textContent = s; tr.appendChild(td); });
      body.appendChild(tr);
    });
    var btn = $("#copySpecs");
    btn.addEventListener("click", function () {
      var text = g.map(function (r) { return r[0] + ": " + r[1]; }).join("\n");
      copy(text, btn, "Copy all specs");
    });
  }
  function copy(text, btn, label) {
    function done(ok) {
      btn.textContent = ok ? "Copied" : "Couldn't copy";
      setTimeout(function () { btn.textContent = label; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }

  // ---------- roots ----------
  function buildRoots() {
    var svg = $("#rootlines"), ns = "http://www.w3.org/2000/svg", seed = 5;
    function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 13; i++) {
      var x = 500 + (r() - .5) * 26, py = -4, dir = (i - 6) * .19 + (r() - .5) * .14;
      var d = "M" + x.toFixed(1) + " " + py;
      var steps = 8 + Math.floor(r() * 5);
      for (var s = 0; s < steps; s++) {
        dir += (r() - .5) * .42;
        var nx = x + Math.sin(dir) * (30 + r() * 34), ny = py + (Math.cos(dir) * .62 + .34) * (30 + r() * 26);
        d += "Q" + ((x + nx) / 2 + (r() - .5) * 20).toFixed(1) + " " + ((py + ny) / 2).toFixed(1) + " " + nx.toFixed(1) + " " + ny.toFixed(1);
        x = nx; py = ny;
      }
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      p.setAttribute("pathLength", "1");
      p.setAttribute("stroke-width", (2.6 - Math.abs(i - 6) * .24).toFixed(2));
      svg.appendChild(p);
      rootPaths.push(p);
    }
  }

  // ---------- screenshots open full size ----------
  var viewer = $("#viewer"), viewerImg = $("#viewerImg");
  $$("a.zoom").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!viewer.showModal) return; // no <dialog>: the link just opens the image
      e.preventDefault();
      var img = a.querySelector("img");
      viewerImg.src = a.href;
      viewerImg.alt = img ? img.alt : "";
      viewer.showModal();
    });
  });
  $("#viewerClose").addEventListener("click", function () { viewer.close(); });
  viewer.addEventListener("click", function (e) { if (e.target === viewer) viewer.close(); });

  // ---------- download ----------
  $$(".download-link").forEach(function (a) {
    a.addEventListener("click", function () {
      var note = a.parentNode.parentNode.querySelector(".after") || a.parentNode.querySelector(".after");
      if (note) note.hidden = false;
    });
  });
  var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var copyLink = $("#copyLink");
  if (mobile && copyLink) {
    copyLink.hidden = false;
    copyLink.addEventListener("click", function () { copy("https://boorussia.github.io/steady-site/", copyLink, copyLink.textContent); });
  }

  // ---------- live release info ----------
  fetch("https://api.github.com/repos/BooRussia/steady-releases/releases/latest")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rel) {
      if (!rel || !rel.tag_name) return;
      var exe = (rel.assets || []).filter(function (a) { return a.name === "Steady.exe"; })[0];
      $$(".release-version").forEach(function (el) { el.textContent = rel.tag_name; });
      if (exe) $$(".release-size").forEach(function (el) { el.textContent = Math.round(exe.size / 1024) + " KB"; });
    })
    .catch(function () { /* the static text is a fine fallback */ });

  // ---------- go ----------
  buildList();
  renderDrive();
  renderFiles();
  buildSpecs();
  buildRoots();
  buildOrbs();
  scrollOrb = new Orb($("canvas", scrollOrbEl), TINT.lime, 44);
  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe($("main"));
  requestAnimationFrame(loop);
})();
