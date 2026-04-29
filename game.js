let lane = 1;
let targetLane = 1;
let gameRunning = false;

let obstacleLane = 0;
let obstacleY = 0;

let nick = localStorage.getItem("nick");
let coins = parseInt(localStorage.getItem("coins")) || 0;

/* 👋 AUTO LOGIN */
window.onload = () => {
  if (nick) {
    document.getElementById("welcome").innerText =
      "👋 С возвращением, " + nick;
    document.getElementById("nick").style.display = "none";
  }
};

/* 🎮 START */
function startGame() {
  if (!nick) {
    const input = document.getElementById("nick").value;
    if (!input) return;

    nick = input;
    localStorage.setItem("nick", nick);
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

  spawnObstacle();
  update();
}

/* BACK */
function backToMenu() {
  gameRunning = false;
  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

/* 📱 SWIPE */
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

/* 🧠 SMOOTH */
function smoothMove() {
  lane += (targetLane - lane) * 0.15;

  document.getElementById("player").style.left =
    [15,50,85][Math.round(lane)] + "%";

  requestAnimationFrame(smoothMove);
}
smoothMove();

/* 🍦 OBSTACLE */
function spawnObstacle() {
  obstacleLane = Math.floor(Math.random()*3);
  obstacleY = -200;

  let obs = document.getElementById("obstacle");
  obs.style.left = [15,50,85][obstacleLane] + "%";
  obs.style.fontSize = "20px";
}

/* 🏆 SAVE SCORE */
function saveScore() {
  if (!nick || !window.db) return;

  window.set(window.ref(window.db, "scores/" + nick), {
    name: nick,
    score: coins
  });
}

/* 📊 LEADERBOARD */
function loadLeaderboard() {
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

    let html = "🏆 ТОП:<br>";

    arr.forEach(p => {
      html += p.name + ": " + p.score + "<br>";
    });

    document.getElementById("leaderboard").innerHTML = html;
  });
}

loadLeaderboard();

/* 🎮 LOOP */
function update() {
  if (!gameRunning) return;

  obstacleY += 6;

  let obs = document.getElementById("obstacle");

  let progress = obstacleY / window.innerHeight;
  let scale = 0.3 + progress * 1.7;

  obs.style.transform = `scale(${scale})`;
  obs.style.top = obstacleY + "px";

  if (obstacleY > window.innerHeight - 250 &&
      obstacleLane === Math.round(lane)) {
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

  saveScore();

  document.body.classList.add("hit");

  setTimeout(() => {
    alert("💥 GAME OVER\n🍦 " + coins);
    location.reload();
  }, 300);
}
