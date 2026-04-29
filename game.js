let lane = 1;
let score = 0;
let gameRunning = false;

let obstacleLane = 0;
let obstacleY = 0;

// 💾 LOAD DATA
let nick = localStorage.getItem("nick") || "";
let coins = parseInt(localStorage.getItem("coins")) || 0;

// 👋 WELCOME TEXT
if (nick) {
  document.getElementById("welcome").innerText =
    "👋 С возвращением, " + nick;
}

// 🎮 START GAME
function startGame() {
  const input = document.getElementById("nick").value;

  if (input) {
    nick = input;
    localStorage.setItem("nick", nick);
  }

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  lane = 1;
  score = 0;
  gameRunning = true;

  spawnObstacle();
  update();
}

// 🏠 BACK MENU
function backToMenu() {
  gameRunning = false;

  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

// 🎮 SWIPE CONTROL (УЛУЧШЕННЫЙ)
let startX = 0;

document.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {
  if (!gameRunning) return;

  let endX = e.changedTouches[0].clientX;
  let diff = endX - startX;

  if (Math.abs(diff) < 40) return;

  if (diff > 0) moveRight();
  else moveLeft();
});

function moveLeft() {
  lane = Math.max(0, lane - 1);
  updatePlayer();
}

function moveRight() {
  lane = Math.min(2, lane + 1);
  updatePlayer();
}

// 🧍 PLAYER POSITION
function updatePlayer() {
  document.getElementById("player").style.left =
    (lane * 33 + 33) + "%";
}

// 🍦 OBSTACLE
function spawnObstacle() {
  obstacleLane = Math.floor(Math.random() * 3);
  obstacleY = 0;

  document.getElementById("obstacle").style.left =
    (obstacleLane * 33 + 33) + "%";
}

// 🔄 GAME LOOP
function update() {
  if (!gameRunning) return;

  obstacleY += 6;

  const obs = document.getElementById("obstacle");
  obs.style.top = obstacleY + "px";

  // collision
  if (obstacleY > window.innerHeight - 150 && obstacleLane === lane) {
    gameOver();
    return;
  }

  // score
  if (obstacleY > window.innerHeight) {
    score++;
    coins++;

    localStorage.setItem("coins", coins);

    document.getElementById("score").innerText = coins + " 🍦";

    spawnObstacle();
  }

  requestAnimationFrame(update);
}

// 💥 GAME OVER
function gameOver() {
  gameRunning = false;

  localStorage.setItem("coins", coins);

  alert("💥 GAME OVER\n🍦 " + coins);

  location.reload();
}
