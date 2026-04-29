localStorage:
- nick
- coins
let lane = 1;
let score = 0;
let gameRunning = false;

let obstacleLane = 0;
let obstacleY = 0;

function startGame() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  lane = 1;
  score = 0;
  gameRunning = true;

  spawnObstacle();
  update();
}

function moveLeft() {
  if (!gameRunning) return;
  lane = Math.max(0, lane - 1);
  updatePlayer();
}

function moveRight() {
  if (!gameRunning) return;
  lane = Math.min(2, lane + 1);
  updatePlayer();
}

function jump() {
  if (!gameRunning) return;

  if (Math.random() > 0.3) {
    score += 2;
    updateScore();
  }
}

function updatePlayer() {
  const player = document.getElementById("player");
  player.style.left = (lane * 100 + 50) + "px";
}

function spawnObstacle() {
  obstacleLane = Math.floor(Math.random() * 3);
  obstacleY = 0;

  const obs = document.getElementById("obstacle");
  obs.style.left = (obstacleLane * 100 + 50) + "px";
}

function update() {
  if (!gameRunning) return;

  obstacleY += 5;

  const obs = document.getElementById("obstacle");
  obs.style.top = obstacleY + "px";

  // collision
  if (obstacleY > 400 && obstacleLane === lane) {
    gameOver();
    return;
  }

  // score
  if (obstacleY > 500) {
    score++;
    updateScore();
    spawnObstacle();
  }

  requestAnimationFrame(update);
}

function updateScore() {
  document.getElementById("score").innerText = score;
}

function gameOver() {
  gameRunning = false;
  alert("💥 GAME OVER! Score: " + score);
}

function restart() {
  location.reload();
}
