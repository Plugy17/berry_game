let lane = 1;
let targetLane = 1;
let gameRunning = false;

let obstacleLane = 0;
let obstacleY = 0;

let nick = localStorage.getItem("nick");
let coins = parseInt(localStorage.getItem("coins")) || 0;
let best = parseInt(localStorage.getItem("best")) || 0;

let speed = 6;
let difficulty = 0.002;

const good = "🍦";
const bad = ["🍩","🍫","🧱"];
let currentType = good;

/* START SCREEN */
window.onload = () => {
  if (nick) {
    document.getElementById("welcome").innerText =
      "👋 С возвращением, " + nick;
    document.getElementById("nick").style.display = "none";
  }

  document.getElementById("score").innerText = coins + " 🍦";
};

/* START */
function startGame() {
  if (!nick) {
    const input = document.getElementById("nick").value;
    if (!input) return;

    nick = input;
    localStorage.setItem("nick", nick);
  }

  let mode = document.getElementById("difficulty").value;

  speed = mode === "easy" ? 4 : mode === "hard" ? 8 : 6;
  difficulty = mode === "easy" ? 0.001 : mode === "hard" ? 0.003 : 0.002;

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  resetGame();
}

/* RESET */
function resetGame() {
  lane = 1;
  targetLane = 1;
  obstacleY = -200;
  gameRunning = true;

  spawnObstacle();
  requestAnimationFrame(update);
}

/* MENU */
function backToMenu() {
  gameRunning = false;

  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

/* SHOP */
function openShop() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("shop").classList.remove("hidden");
}

function closeShop() {
  document.getElementById("shop").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

/* SWIPE */
let startX = 0;

document.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {
  if (!gameRunning) return;

  let diff = e.changedTouches[0].clientX - startX;

  if (Math.abs(diff) < 40) return;

  if (diff > 0) targetLane = Math.min(2, targetLane + 1);
  else targetLane = Math.max(0, targetLane - 1);
});

/* SMOOTH MOVE */
function smoothMove() {
  lane += (targetLane - lane) * 0.15;

  document.getElementById("player").style.left =
    [15,50,85][Math.round(lane)] + "%";

  requestAnimationFrame(smoothMove);
}
smoothMove();

/* SPAWN */
function spawnObstacle() {
  obstacleLane = Math.floor(Math.random()*3);
  obstacleY = -200;

  const obs = document.getElementById("obstacle");

  currentType = Math.random() < 0.6
    ? bad[Math.floor(Math.random()*bad.length)]
    : good;

  obs.innerText = currentType;
  obs.style.left = [15,50,85][obstacleLane] + "%";
}

/* LOOP */
function update() {
  if (!gameRunning) return;

  speed += difficulty;
  obstacleY += speed;

  const obs = document.getElementById("obstacle");

  let hitZone = obstacleY > window.innerHeight - 300;
  let playerLane = Math.round(lane);

  obs.style.top = obstacleY + "px";

  if (hitZone && obstacleLane === playerLane) {
    if (currentType === good) {
      coins++;
      localStorage.setItem("coins", coins);
      document.getElementById("score").innerText = coins + " 🍦";
      spawnObstacle();
    } else {
      gameOver();
    }
    return;
  }

  if (obstacleY > window.innerHeight) {
    spawnObstacle();
  }

  requestAnimationFrame(update);
}

/* GAME OVER */
function gameOver() {
  gameRunning = false;

  if (coins > best) {
    best = coins;
    localStorage.setItem("best", best);
  }

  alert("💥 GAME OVER\n🍦 " + coins + "\n🏆 " + best);

  location.reload();
}
