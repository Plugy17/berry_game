let lane = 1;
let gameRunning = false;

let obstacleLane = 0;
let obstacleY = 0;

let nick = localStorage.getItem("nick") || "";
let coins = parseInt(localStorage.getItem("coins")) || 0;

/* 👋 WELCOME */
if (nick) {
  document.getElementById("welcome").innerText =
    "👋 С возвращением, " + nick;
}

/* 🎮 START GAME */
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
  gameRunning = true;
  obstacleY = 0;

  spawnObstacle();
  update();
}

/* 🏠 BACK MENU */
function backToMenu() {
  gameRunning = false;

  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

/* 📱 SWIPE FIX */
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

/* MOVE */
function moveLeft() {
  lane = Math.max(0, lane - 1);
  updatePlayer();
}

function moveRight() {
  lane = Math.min(2, lane + 1);
  updatePlayer();
}

/* 🧍 PLAYER */
function updatePlayer() {
  const x = [15, 50, 85][lane];
  document.getElementById("player").style.left = x + "%";
}

/* 🍦 OBSTACLE */
function spawnObstacle() {
  obstacleLane = Math.floor(Math.random() * 3);
  obstacleY = 0;

  const x = [15, 50, 85][obstacleLane];
  document.getElementById("obstacle").style.left = x + "%";
}

/* 🎮 GAME LOOP */
function update() {
  if (!gameRunning) return;

  obstacleY += 6;

  const obs = document.getElementById("obstacle");
  obs.style.top = obstacleY + "px";

  if (obstacleY > window.innerHeight - 200 && obstacleLane === lane) {
    gameOver();
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

/* 💥 GAME OVER */
function gameOver() {
  gameRunning = false;

  localStorage.setItem("coins", coins);

  alert("💥 GAME OVER\n🍦 " + coins);

  location.reload();
}
