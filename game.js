let lane = 1;
let gameRunning = false;

let obstacleLane = 0;
let obstacleY = 0;

let nick = localStorage.getItem("nick") || "";
let coins = parseInt(localStorage.getItem("coins")) || 0;

/* ================= WELCOME ================= */
if (nick) {
  document.getElementById("welcome").innerText =
    "👋 С возвращением, " + nick;
}

/* ================= START ================= */
function startGame() {
  const input = document.getElementById("nick").value;

  if (input) {
    nick = input;
    localStorage.setItem("nick", nick);
  }

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  lane = 1;
  gameRunning = true;

  spawnObstacle();
  update();
}

/* ================= BACK ================= */
function backToMenu() {
  gameRunning = false;

  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

/* ================= TOUCH FIX (ВАЖНО) ================= */
let startX = 0;

document.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener("touchend", (e) => {
  if (!gameRunning) return;

  let endX = e.changedTouches[0].clientX;
  let diff = endX - startX;

  if (Math.abs(diff) < 40) return;

  if (diff > 0) moveRight();
  else moveLeft();
});

/* ================= MOVE ================= */
function moveLeft() {
  lane = Math.max(0, lane - 1);
  updatePlayer();
}

function moveRight() {
  lane = Math.min(2, lane + 1);
  updatePlayer();
}

/* ================= PLAYER POSITION FIX ================= */
function updatePlayer() {
  const player = document.getElementById("player");

  let x = 33;

  if (lane === 0) x = 15;
  if (lane === 1) x = 50;
  if (lane === 2) x = 85;

  player.style.left = x + "%";
}

/* ================= OBSTACLE ================= */
function spawnObstacle() {
  obstacleLane = Math.floor(Math.random() * 3);
  obstacleY = 0;

  const obs = document.getElementById("obstacle");

  let x = 50;
  if (obstacleLane === 0) x = 15;
  if (obstacleLane === 1) x = 50;
  if (obstacleLane === 2) x = 85;

  obs.style.left = x + "%";
}

/* ================= GAME LOOP ================= */
function update() {
  if (!gameRunning) return;

  obstacleY += 6;

  const obs = document.getElementById("obstacle");
  obs.style.top = obstacleY + "px";

  if (obstacleY > window.innerHeight - 200 && obstacleLane === lane) {
    alert("💥 GAME OVER");
    location.reload();
    return;
  }

  if (obstacleY > window.innerHeight) {
    coins++;
    localStorage.setItem("coins", coins);

    document.getElementById("score").innerText = coins + " 🍦";

    spawnObstacle();
  }

  requestAnimationFrame(update);
}
