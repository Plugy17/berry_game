let lane = 1;
let targetLane = 1;
let gameRunning = false;

let obstacleLane = 0;
let obstacleY = 0;

let nick = localStorage.getItem("nick") || "";
let coins = parseInt(localStorage.getItem("coins")) || 0;

/* 🦄 PLAYER */
const PLAYER = "🦄";
document.getElementById("player").innerText = PLAYER;

/* 👋 WELCOME */
if (nick) {
  document.getElementById("welcome").innerText =
    "👋 С возвращением, " + nick;
}

/* 🎮 START */
function startGame() {
  const input = document.getElementById("nick").value;

  if (input) {
    nick = input;
    localStorage.setItem("nick", nick);
  }

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  resetGame();
}

/* 🔁 RESET */
function resetGame() {
  lane = 1;
  targetLane = 1;
  gameRunning = true;
  obstacleY = -200;

  spawnObstacle();
  update();
}

/* 🏠 BACK */
function backToMenu() {
  gameRunning = false;

  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

/* 📱 SWIPE (ПЛАВНЫЙ) */
let startX = 0;

document.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener("touchend", (e) => {
  if (!gameRunning) return;

  let diff = e.changedTouches[0].clientX - startX;

  if (Math.abs(diff) < 40) return;

  if (diff > 0) targetLane = Math.min(2, targetLane + 1);
  else targetLane = Math.max(0, targetLane - 1);
});

/* 🧠 SMOOTH MOVE */
function smoothMove() {
  lane += (targetLane - lane) * 0.15;

  const x = [15, 50, 85][Math.round(lane)];
  document.getElementById("player").style.left = x + "%";

  requestAnimationFrame(smoothMove);
}
smoothMove();

/* 🍦 OBSTACLE */
function spawnObstacle() {
  obstacleLane = Math.floor(Math.random() * 3);
  obstacleY = -200;

  const obs = document.getElementById("obstacle");
  obs.style.fontSize = "20px";
  obs.style.opacity = "0.4";

  obs.style.left = [15, 50, 85][obstacleLane] + "%";
}

/* 🎮 LOOP + 3D EFFECT */
function update() {
  if (!gameRunning) return;

  obstacleY += 6;

  const obs = document.getElementById("obstacle");

  let progress = obstacleY / window.innerHeight;

  let scale = 0.3 + progress * 1.7;
  let opacity = Math.min(1, progress);

  obs.style.transform = `scale(${scale})`;
  obs.style.opacity = opacity;
  obs.style.top = obstacleY + "px";

  // collision
  if (obstacleY > window.innerHeight - 250 && obstacleLane === Math.round(lane)) {
    gameOver();
    return;
  }

  // score
  if (obstacleY > window.innerHeight) {
    coins++;
    localStorage.setItem("coins", coins);

    document.getElementById("score").innerText = coins + " 🍦";

    spawnObstacle();
  }

  requestAnimationFrame(update);
}

/* 💥 GAME OVER */
function gameOver() {
  gameRunning = false;

  localStorage.setItem("coins", coins);

  alert("💥 GAME OVER\n🍦 " + coins);

  location.reload();
}
