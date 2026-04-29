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

/* CONTROL FLAG (ФИКС ЦИКЛА) */
let loopId = null;

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

/* RESET (ФИКС СТАРТА) */
function resetGame() {
  lane = 1;
  targetLane = 1;
  obstacleY = -120; // ближе к игроку (визуально лучше)
  gameRunning = true;

  spawnObstacle();

  cancelAnimationFrame(loopId);
  loopId = requestAnimationFrame(update);
}

/* MENU FIX (СТОП ЦИКЛА) */
function backToMenu() {
  gameRunning = false;

  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");

  cancelAnimationFrame(loopId);
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

/* SPAWN (ФИКС БАГА С ЗАСТРЕВАНИЕМ) */
function spawnObstacle() {
  obstacleLane = Math.floor(Math.random() * 3);

  obstacleY = -100; // БЛИЖЕ К ИГРОКУ (ВАЖНО)

  const obs = document.getElementById("obstacle");

  currentType = Math.random() < 0.6
    ? bad[Math.floor(Math.random() * bad.length)]
    : good;

  obs.innerText = currentType;
  obs.style.left = [15,50,85][obstacleLane] + "%";
  obs.style.opacity = "1";
}

/* LOOP (СТАБИЛЬНЫЙ) */
function update() {
  if (!gameRunning) return;

  speed += difficulty;
  obstacleY += speed;

  const obs = document.getElementById("obstacle");

  let playerLane = Math.round(lane);
  let hitZone = obstacleY > window.innerHeight - 280;

  obs.style.top = obstacleY + "px";

  /* COLLISION FIX */
  if (hitZone && obstacleLane === playerLane) {

    if (currentType === good) {
      coins++;
      localStorage.setItem("coins", coins);
      document.getElementById("score").innerText = coins + " 🍦";

      spawnObstacle(); // 🔥 НЕ ЛОМАЕТ ПОТОК
    } else {
      gameOver();
      return;
    }
  }

  /* RESPAWN */
  if (obstacleY > window.innerHeight) {
    spawnObstacle();
  }

  loopId = requestAnimationFrame(update);
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
