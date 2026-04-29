let difficultyMode = "medium";
let lane = 1;
let targetLane = 1;
let gameRunning = false;

let obstacleLane = 0;
let obstacleY = 0;

let nick = localStorage.getItem("nick");
let coins = parseInt(localStorage.getItem("coins")) || 0;
let best = parseInt(localStorage.getItem("best")) || 0;

/* 🎮 СЛОЖНОСТЬ */
let speed = 6;
let difficulty = 0.002;

/* 🍬 ТИПЫ */
const good = "🍦";
const bad = ["🍩","🍫","🧱"];

let currentType = good;

/* 👋 LOGIN */
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

  difficultyMode = document.getElementById("difficulty").value;

  if (difficultyMode === "easy") {
    speed = 4;
    difficulty = 0.001;
  } else if (difficultyMode === "medium") {
    speed = 6;
    difficulty = 0.002;
  } else {
    speed = 8;
    difficulty = 0.003;
  }

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
  speed = 6;

  spawnObstacle();
  update();
}

/* BACK */
function backToMenu() {
  gameRunning = false;

  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

function openShop() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("shop").classList.remove("hidden");
}

function closeShop() {
  document.getElementById("shop").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

function loadMenuLeaderboard() {
  if (!window.db) return;

  const q = window.query(
    window.ref(window.db, "scores"),
    window.orderByChild("score"),
    window.limitToLast(5)
  );

  window.onValue(q, (snapshot) => {
    let data = snapshot.val();
    if (!data) return;

    let arr = Object.values(data);
    arr.sort((a, b) => b.score - a.score);

    let html = "🏆 ТОП ИГРОКОВ:<br>";

    arr.forEach(p => {
      html += p.name + ": " + p.score + "<br>";
    });

    document.getElementById("menuLeaderboard").innerHTML = html;
  });
}

loadMenuLeaderboard();

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

/* SMOOTH */
function smoothMove() {
  lane += (targetLane - lane) * 0.15;

  document.getElementById("player").style.left =
    [15,50,85][Math.round(lane)] + "%";

  requestAnimationFrame(smoothMove);
}
smoothMove();

/* 🍦 SPAWN */
function spawnObstacle() {
  obstacleLane = Math.floor(Math.random()*3);
  obstacleY = -200;

  const obs = document.getElementById("obstacle");

  // шанс 60% плохих
  if (Math.random() < 0.6) {
    currentType = bad[Math.floor(Math.random()*bad.length)];
  } else {
    currentType = good;
  }

  obs.innerText = currentType;
  obs.style.left = [15,50,85][obstacleLane] + "%";
}

/* 🏆 SAVE */
function saveScore() {
  if (!nick || !window.db) return;

  window.set(window.ref(window.db, "scores/" + nick), {
    name: nick,
    score: coins
  });
}

/* LOOP */
function update() {
  if (!gameRunning) return;

  speed += difficulty;
  obstacleY += speed;

  const obs = document.getElementById("obstacle");

  let progress = obstacleY / window.innerHeight;
  let scale = 0.3 + progress * 1.7;

  obs.style.transform = `scale(${scale})`;
  obs.style.top = obstacleY + "px";

  /* 💥 СТОЛКНОВЕНИЕ */
  if (obstacleY > window.innerHeight - 250 &&
      obstacleLane === Math.round(lane)) {

    if (currentType === good) {
      // 🍦 СОБРАЛ
      coins++;
      localStorage.setItem("coins", coins);
      document.getElementById("score").innerText = coins + " 🍦";
      spawnObstacle();
      return;
    } else {
      // 💀 УМЕР
      gameOver();
      return;
    }
  }

  if (obstacleY > window.innerHeight) {
    spawnObstacle();
  }

  requestAnimationFrame(update);
}

/* 💥 GAME OVER */
function gameOver() {
  gameRunning = false;

  saveScore();

  if (coins > best) {
    best = coins;
    localStorage.setItem("best", best);
  }

  document.body.classList.add("hit");
  document.body.classList.add("flash");

  setTimeout(() => {
    alert(
      "💥 GAME OVER\n" +
      "🍦 " + coins +
      "\n🏆 Рекорд: " + best
    );
    location.reload();
  }, 300);
}
