let lane = 1;
let score = 0;
let gameRunning = false;

let obstacleLane = 0;
let obstacleY = 0;

// ---------- LOAD ----------
let nick = localStorage.getItem("nick");
let coins = parseInt(localStorage.getItem("coins")) || 0;

// ---------- WELCOME ----------
if (nick) {
  document.getElementById("welcomeText").innerText =
    "👋 С возвращением, " + nick;
}

// ---------- START ----------
function startGame() {
  nick = document.getElementById("nick").value || nick;

  if (!nick) return;

  localStorage.setItem("nick", nick);

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  lane = 1;
  score = 0;
  gameRunning = true;

  spawnObstacle();
  update();
}

// ---------- TOUCH SWIPE ----------
let startX = 0;

document.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {
  let endX = e.changedTouches[0].clientX;

  if (!gameRunning) return;

  if (startX - endX > 50) moveLeft();
  if (endX - startX > 50) moveRight();
});

function moveLeft() {
  lane = Math.max(0, lane - 1);
  updatePlayer();
}

function moveRight() {
  lane = Math.min(2, lane + 1);
  updatePlayer();
}

// ---------- PLAYER ----------
function updatePlayer() {
  document.getElementById("player").style.left =
    (lane * 33 + 33) + "%";
}

// ---------- OBSTACLE ----------
function spawnObstacle() {
  obstacleLane = Math.floor(Math.random() * 3);
  obstacleY = 0;

  document.getElementById("obstacle").style.left =
    (obstacleLane * 33 + 33) + "%";
}

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

    document.getElementById("score").innerText = coins + " 🍦";

    localStorage.setItem("coins", coins);

    spawnObstacle();
  }

  requestAnimationFrame(update);
}

// ---------- GAME OVER ----------
function gameOver() {
  gameRunning = false;

  localStorage.setItem("coins", coins);

  alert("💥 GAME OVER\n🍦: " + coins);

  location.reload();
}
