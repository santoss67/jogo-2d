const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

let gameInterval;
let paused = false;
let score = 0;

// Pista
const road = {
  x: 50,
  y: 0,
  width: 260,
  height: canvas.height,
  lanes: 3,
  scroll: 0,
  speed: 5
};
const lanePositions = [];
for (let i = 0; i < road.lanes; i++) {
  lanePositions.push(road.x + road.width/road.lanes/2 + (road.width/road.lanes)*i);
}

// Player
const player = { x: lanePositions[1], y: canvas.height - 100, w: 50, h: 80, lane: 1 };

// Inimigos e moedas
let enemies = [];
let coins = [];

// Sons
const coinSound = new Audio('coin.mp3');      // som de moedas
const crashSound = new Audio('crash.mp3');    // som de colisão
const bgMusic = new Audio('ambient.mp3');     // som de fundo ambiente
bgMusic.loop = true;                          // tocar continuamente

// --- Funções do jogo ---
function resetGame() {
  player.lane = 1;
  player.x = lanePositions[player.lane];
  score = 0;
  enemies = [];
  coins = [];
  road.scroll = 0;
  scoreEl.textContent = score;
}

// Spawn de inimigos e moedas
function spawnEnemy() {
  const lane = Math.floor(Math.random() * lanePositions.length);
  enemies.push({ x: lanePositions[lane], y: -100, w: 50, h: 80 });
}

function spawnCoin() {
  const lane = Math.floor(Math.random() * lanePositions.length);
  coins.push({ x: lanePositions[lane], y: -50, r: 15 });
}

// Movimentos do jogador
function moveLeft() { player.lane = Math.max(0, player.lane-1); player.x = lanePositions[player.lane]; }
function moveRight() { player.lane = Math.min(lanePositions.length-1, player.lane+1); player.x = lanePositions[player.lane]; }

// Controles
window.addEventListener('keydown', e => {
  if(e.key === 'ArrowLeft') moveLeft();
  if(e.key === 'ArrowRight') moveRight();
});
leftBtn.addEventListener('click', moveLeft);
rightBtn.addEventListener('click', moveRight);

function update() {
  if(paused) return;

  // Rolagem da estrada
  road.scroll += road.speed;
  if (road.scroll > 40) road.scroll = 0;

  // Movimentar inimigos e moedas
  enemies.forEach(e => e.y += road.speed);
  coins.forEach(c => c.y += road.speed);

  // Remover objetos fora da tela
  enemies = enemies.filter(e => e.y < canvas.height + 50);
  coins = coins.filter(c => c.y < canvas.height + 50);

  // Colisões com inimigos
  enemies.forEach(e => {
    if(e.y + e.h > player.y && e.y < player.y + player.h && e.x === player.x) {
      crashSound.currentTime = 0;
      crashSound.play();
      clearInterval(gameInterval);
      alert('Game Over! Pontos: ' + score);
      bgMusic.pause();   // parar música ambiente ao perder
    }
  });

  // Colisões com moedas
  coins.forEach((c, i) => {
    if(c.y + c.r > player.y && c.y - c.r < player.y + player.h && c.x === player.x) {
      coinSound.currentTime = 0;
      coinSound.play();
      score += 10;
      scoreEl.textContent = score;
      coins.splice(i,1);
    }
  });
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Estrada
  ctx.fillStyle = '#333';
  ctx.fillRect(road.x, road.y, road.width, road.height);

  // Faixas
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([20,20]);
  ctx.lineWidth = 4;
  for(let i=1;i<road.lanes;i++){
    ctx.beginPath();
    ctx.moveTo(road.x + (road.width/road.lanes)*i, -road.scroll);
    ctx.lineTo(road.x + (road.width/road.lanes)*i, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Player
  ctx.fillStyle = 'green';
  ctx.fillRect(player.x - player.w/2, player.y - player.h/2, player.w, player.h);

  // Inimigos
  ctx.fillStyle = 'red';
  enemies.forEach(e => ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h));

  // Moedas
  ctx.fillStyle = 'gold';
  coins.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
    ctx.fill();
  });
}

function gameLoop() {
  update();
  draw();
}

// Spawn intervals
setInterval(spawnEnemy, 1500);
setInterval(spawnCoin, 2000);

// Botão Começar
startBtn.addEventListener('click', ()=>{
  // desbloquear áudio e iniciar música de fundo
  bgMusic.play();
  resetGame();
  clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, 30);
});

// Pausar
pauseBtn.addEventListener('click', ()=>{
  paused = !paused;
});
