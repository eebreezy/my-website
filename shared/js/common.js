
function qs(s, el=document){ return el.querySelector(s); }
function qsa(s, el=document){ return [...el.querySelectorAll(s)]; }
function rand(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function setText(id, value){ const el = document.getElementById(id); if(el) el.textContent = value; }
function beep(freq=440, dur=0.08, type='sine'){
  try{
    const ctx = window.__audioCtx || (window.__audioCtx = new (window.AudioContext || window.webkitAudioContext)());
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.value = 0.03;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur);
  }catch(e){}
}
function confettiBurst(el){
  el.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:300});
}
