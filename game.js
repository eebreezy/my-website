:root{
  --bg1:#0b1020;
  --bg2:#121a35;
  --panel:#121a2aee;
  --text:#eaf2ff;
  --muted:#a9b6d6;
  --accent:#7cf2ff;
  --accent2:#ffd66e;
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family: ui-rounded, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  background: radial-gradient(1200px 600px at 20% 20%, #1b2a66 0%, var(--bg1) 55%),
              radial-gradient(900px 500px at 80% 10%, #3a1e6a 0%, transparent 60%),
              linear-gradient(180deg, var(--bg2), var(--bg1));
  color:var(--text);
  overscroll-behavior:none;
}

#wrap{
  max-width:1100px;
  margin:0 auto;
  padding:10px;
}

/* Keep header compact */
#topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:8px 10px;
  border-radius:16px;
  background:var(--panel);
  border:1px solid #223058;
  box-shadow:0 10px 24px #00000055;
}

.brand{display:flex; align-items:center; gap:10px}
.logo{
  width:40px;height:40px;border-radius:12px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display:grid;place-items:center;
  color:#0b1020;
  font-size:20px;
  font-weight:900;
}
.title{font-weight:900; font-size:16px}
.subtitle{color:var(--muted); font-size:11px; margin-top:1px}

.controls{display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end}
.btn{
  border:1px solid #2a3a66;
  background:#0f1730;
  color:var(--text);
  padding:9px 10px;
  border-radius:12px;
  cursor:pointer;
  font-weight:800;
  user-select:none;
  -webkit-tap-highlight-color: transparent;
}
.btn:active{transform: translateY(1px)}
.btn.primary{
  background: linear-gradient(135deg, #3fe8ff, #ffd66e);
  color:#071023;
  border-color: transparent;
}
.btn.big{padding:12px 16px; font-size:16px}

/* MAIN: make canvas own the space */
#main{
  position:relative;
  margin-top:10px;
  display:block; /* no columns on mobile-first */
}

/* Canvas becomes the main screen area */
canvas{
  width:100%;
  height: calc(100vh - 130px); /* big play area on mobile */
  max-height: 72vh;            /* safe cap on desktop */
  border-radius:18px;
  background: linear-gradient(180deg, #0f1640, #0b1020);
  border:1px solid #223058;
  box-shadow:0 18px 40px #00000066;
  touch-action:none;
}

/* HUD becomes small overlay, not taking layout space */
#hud{
  position:absolute;
  left:12px;
  top:12px;
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  z-index:6;
  pointer-events:none; /* don't block taps */
}

.hudBox{
  pointer-events:none;
  background: #0b132ae6;
  border:1px solid #223058;
  border-radius:14px;
  padding:8px 10px;
  backdrop-filter: blur(6px);
}
.hudLabel{color:var(--muted); font-size:10px; font-weight:900; letter-spacing:.3px}
.hudValue{font-size:16px; font-weight:1000; margin-top:2px}

/* Big jump button */
.jumpBtn{
  position:absolute;
  right:14px;
  bottom:14px;
  z-index:7;
  width:92px;
  height:92px;
  border-radius:999px;
  border:1px solid #2a3a66;
  background: linear-gradient(135deg, #3fe8ff, #ffd66e);
  color:#071023;
  font-weight:1000;
  letter-spacing:.6px;
  cursor:pointer;
  box-shadow:0 16px 35px #00000088;
  -webkit-tap-highlight-color: transparent;
}
.jumpBtn:active{transform: translateY(2px) scale(.98)}

/* Overlay */
.overlay{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  background: radial-gradient(700px 300px at 50% 30%, #00000055, #000000aa);
  border-radius:18px;
  z-index:10;
}
.hidden{display:none}
.panel{
  width:min(420px, 92vw);
  background: linear-gradient(180deg, #121a2aff, #0f1730ff);
  border:1px solid #2a3a66;
  border-radius:18px;
  padding:18px 16px;
  box-shadow:0 20px 60px #00000088;
  text-align:center;
}
.panelTitle{font-size:22px; font-weight:1000}
.panelMsg{margin-top:8px; color:var(--muted); font-weight:750; white-space:pre-line}
.panelSmall{margin-top:10px; font-size:12px; color:#b6c7ff}

#footer{
  margin-top:10px;
  color:var(--muted);
  font-size:12px;
  text-align:center;
}

/* DESKTOP: restore nicer layout + size */
@media (min-width: 900px){
  #main{
    display:grid;
    grid-template-columns: 1fr 310px;
    gap:12px;
  }

  canvas{
    height:auto;
    aspect-ratio: 16 / 9;
    max-height:none;
  }

  #hud{
    position:static;
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap:10px;
    align-content:start;
    pointer-events:auto;
  }

  .hudBox{pointer-events:auto; background:var(--panel)}
  #footer{display:block;}
}

/* Small phones: make header tighter + canvas taller */
@media (max-width: 420px){
  #wrap{padding:8px;}
  .subtitle{display:none;}
  canvas{height: calc(100vh - 110px);}
  .jumpBtn{width:80px;height:80px;}
}

/* Short screens: prioritize canvas */
@media (max-height: 700px){
  canvas{height: calc(100vh - 105px);}
  #footer{display:none;}
}
