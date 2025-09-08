// --- Configurações básicas ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * DPR);
  canvas.height = Math.floor(rect.height * DPR);
}
new ResizeObserver(resizeCanvas).observe(canvas);
resizeCanvas();

// --- Estado do jogo ---
const state = {
  running: false,
  paused: false,
  gameOver: false,
  score: 0,
  best: Number(localStorage.getItem('bestScore') || 0),
  time: 0,
  laneCount: 3,
  lanePadding: 20,
  speed: 220,
  roadScroll: 0,
  sound: true,
};

// Áudio simples via WebAudio
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audio = new AudioCtx();
let audioMuted = false;
function beep(type = 'coin') {
  if (!state.sound || audioMuted) return;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.connect(g).connect(audio.destination);
  o.type = 'square';
  const now = audio.currentTime;
  if (type === 'coin') { o.frequency.setValueAtTime(880, now); }
  else if (type === 'hit') { o.frequency.setValueAtTime(120, now); }
  else { o.frequency.setValueAtTime(440, now); }
  g.gain.setValueAtTime(0.2, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  o.start(now); o.stop(now + 0.12);
}

// --- Entidades ---
const player = { lane: 1, x: 0, y: 0, w: 40, h: 70, color: getComputedStyle(document.documentElement).getPropertyValue('--car').trim() };
const enemies = [];
const coins = [];

function laneX(l) {
  const W = canvas.width, H = canvas.height;
  const roadW = Math.min(W * 0.9, W - state.lanePadding * 2);
  const strip = roadW / state.laneCount;
  const left = (W - roadW) / 2;
  return Math.floor(left + strip * l + strip/2);
}

function resetGame() {
  state.running = true; state.paused = false; state.gameOver = false;
  state.score = 0; state.time = 0; state.speed = 240; state.roadScroll = 0;
  player.lane = 1; enemies.length = 0; coins.length = 0;
}

function spawnEnemy() {
  const l = Math.floor(Math.random() * state.laneCount);
  const x = laneX(l);
  enemies.push({ x, y: -80, w: 40, h: 70, lane: l, vy: state.speed * (0.9 + Math.random() * 0.4) });
}

function spawnCoin() {
  const l = Math.floor(Math.random() * state.laneCount);
  const x = laneX(l);
  coins.push({ x, y: -40, r: 12, lane: l, vy: state.speed });
}

let enemyTimer = 0, coinTimer = 0;

// --- Controles ---
function moveLeft() { player.lane = Math.max(0, player.lane - 1); }
function moveRight() { player.lane = Math.min(state.laneCount - 1, player.lane + 1); }

const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { moveLeft(); }
  if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { moveRight(); }
  if (e.key.toLowerCase() === 'p') togglePause();
  if (e.key.toLowerCase() === 's') toggleSound();
  if (!state.running && (e.key === ' ' || e.key === 'Enter')) startGame();
  keys.add(e.key);
});
window.addEventListener('keyup', (e)=> keys.delete(e.key));

const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
function bindHold(btn, action){
  let t; let hold=false;
  const start = ()=>{ action(); hold=true; t=setInterval(action, 140); };
  const end = ()=>{ hold=false; clearInterval(t); };
  btn.addEventListener('pointerdown', start);
  window.addEventListener('pointerup', end);
  btn.addEventListener('pointerleave', end);
}
bindHold(leftBtn, moveLeft);
bindHold(rightBtn, moveRight);

// --- UI ---
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const howBtn = document.getElementById('howBtn');
const pauseBtn = document.getElementById('pauseBtn');
const soundBtn = document.getElementById('soundBtn');

function showMenu(text) {
  overlay.style.display = 'flex';
  menu.innerHTML = text || menu.innerHTML;
}
function hideMenu() { overlay.style.display = 'none'; }

function togglePause(){ if (!state.running) return; state.paused = !state.paused; pauseBtn.textContent = state.paused ? '▶️' : '⏸️'; }
function toggleSound(){ state.sound = !state.sound; soundBtn.textContent = state.sound ? '🔊' : '🔇'; }

startBtn.addEventListener('click', startGame);
howBtn.addEventListener('click', ()=>{
  showMenu(`
    <div class="card">
      <h1>Como jogar</h1>
      <p>Mova o carro entre as faixas, desvie dos inimigos e colete moedas.</p>
      <p><strong>Controles:</strong> ← → / A D • Toque nos botões</p>
      <p>Pause: P • Som: S</p>
      <div class="actions"><button class="primary" id="backBtn">Voltar</button></div>
    </div>`);
  document.getElementById('backBtn').addEventListener('click', ()=> location.reload());
});

pauseBtn.addEventListener('click', togglePause);
soundBtn.addEventListener('click', toggleSound);

function startGame(){
  resetGame();
  hideMenu();
}

function endGame(){
  state.running = false; state.gameOver = true; state.paused = false;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem('bestScore', String(state.best));
  showMenu(`
    <div class="card">
      <h1>💥 Bateu!</h1>
      <p>Pontuação: <strong>${Math.floor(state.score)}</strong></p>
      <p>Recorde: <strong>${state.best}</strong></p>
      <div class="actions">
        <button class="primary" id="againBtn">Jogar de novo</button>
        <button class="secondary" id="shareBtn">Compartilhar</button>
      </div>
    </div>`);
  document.getElementById('againBtn').addEventListener('click', ()=> location.reload());
  document.getElementById('shareBtn').addEventListener('click', async ()=>{
    const text = `Fiz ${Math.floor(state.score)} pontos no Jogo 2D de Carro! 🚗💨`;
    if (navigator.share) { try { await navigator.share({ text }); } catch(e){} }
    else { navigator.clipboard.writeText(text); alert('Copiado!'); }
  });
}

// --- Funções utilitárias ---
function rect(x,y,w,h, color){ ctx.fillStyle = color; ctx.fillRect(Math.round(x-w/2), Math.round(y-h/2), Math.round(w), Math.round(h)); }
function roundRect(x, y, w, h, r, color){
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x - w/2 + r, y - h/2);
  ctx.arcTo(x + w/2, y - h/2, x + w/2, y + h/2, r);
  ctx.arcTo(x + w/2, y + h/2, x - w/2, y + h/2, r);
  ctx.arcTo(x - w/2, y + h/2, x - w/2, y - h/2, r);
  ctx.arcTo(x - w/2, y - h/2, x + w/2, y - h/2, r);
  ctx.closePath(); ctx.fill();
}
function circle(x,y,r,color){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); }
function aabb(a,b){ return Math.abs(a.x - b.x) * 2 < (a.w + b.w) && Math.abs(a.y - b.y) * 2 < (a.h + b.h); }

// --- Loop principal ---
let last = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min(1/30, (now - last) / 1000);
  last = now;
  if (!state.running || state.paused) { draw(); return; }
  update(dt);
  draw();
}
requestAnimationFrame(loop);

function update(dt){
  const W = canvas.width, H = canvas.height;

  player.w = Math.max(30, Math.min(50, W * 0.11));
  player.h = Math.max(60, Math.min(90, H * 0.14));
  player.x = laneX(player.lane);
  player.y = H - player.h - 30;

  state.time += dt;
  state.speed = 220 + state.time * 8;

  enemyTimer -= dt; coinTimer -= dt;
  if (enemyTimer <= 0){ spawnEnemy(); enemyTimer = Math.max(0.5, 1.2 - state.time * 0.02); }
  if (coinTimer <= 0){ spawnCoin(); coinTimer = 1.5 + Math.random() * 1.0; }

  for (let i=enemies.length-1; i>=0; i--) {
    const e = enemies[i];
    e.vy = Math.max(e.vy, state.speed*0.9);
    e.y += e.vy * dt;
    if (e.y - e.h/2 > H + 10) enemies.splice(i,1);
  }

  for (let i=coins.length-1; i>=0; i--) {
    const c = coins[i];
    c.y += c.vy * dt;
    if (c.y - c.r > H + 10) coins.splice(i,1);
    const pb = { x: player.x, y: player.y, w: player.w, h: player.h };
    const cb = { x: c.x, y: c.y, w: c.r*2, h: c.r*2 };
    if (aabb(pb, cb)) { coins.splice(i,1); state.score += 15; beep('coin'); }
  }

  state.score += dt * 10;

  for (const e of enemies) {
    const pb = { x: player.x, y: player.y, w: player.w, h: player.h };
    const eb = { x: e.x, y: e.y, w: e.w, h: e.h };
    if (aabb(pb, eb)) { beep('hit'); endGame(); break; }
  }

  state.roadScroll = (state.roadScroll + state.speed * dt) % 40;
  scoreEl.textContent = Math.floor(state.score);
}

function draw(){
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const roadW = Math.min(W * 0.9, W - state.lanePadding * 2);
  const left = (W - roadW) / 2;
  ctx.fillStyle = '#151515';
  ctx.fillRect(left, 0, roadW, H);

  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(left-8, 0, 8, H);
  ctx.fillRect(left+roadW, 0, 8, H);

  const stripW = roadW / state.laneCount;
  const dashH = 30, gap = 20;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--lane').trim();
  for (let l=1; l<state.laneCount; l++){
    const x = Math.floor(left + stripW*l);
    for (let y=-dashH; y<H+dashH; y+=dashH+gap){
      ctx.fillRect(x-2, y + (state.roadScroll% (dashH+gap)), 4, dashH);
    }
  }

  for (const c of coins) {
    circle(c.x, c.y, c.r, getComputedStyle(document.documentElement).getPropertyValue('--coin').trim());
    ctx.globalAlpha = 0.2; circle(c.x, c.y, c.r*1.8, '#fff'); ctx.globalAlpha = 1;
  }

  for (const e of enemies) {
    roundRect(e.x, e.y, e.w, e.h, 8, getComputedStyle(document.documentElement).getPropertyValue('--enemy').trim());
    roundRect(e.x, e.y-10, e.w*0.7, e.h*0.25, 6, 'rgba(255,255,255,.15)');
  }

  roundRect(player.x, player.y, player.w, player.h, 10, player.color);
  roundRect(player.x, player.y-12, player.w*0.7, player.h*0.25, 6, 'rgba(255,255,255,.18)');

  if (state.paused) {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff'; ctx.font = `${Math.floor(W*0.08)}px system-ui`;
    ctx.textAlign = 'center'; ctx.fillText('PAUSADO', W/2, H/2);
  }
}

['pointerdown','keydown'].forEach(ev => window.addEventListener(ev, ()=>{
  if (audio.state === 'suspended') audio.resume();
}, { once: true }));
