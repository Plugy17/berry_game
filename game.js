let lane = 1;
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -100;
let loopId = null;

let nick = localStorage.getItem("nick");
let coins = 0;
let best = parseInt(localStorage.getItem("best")) || 0;

let speed = 6;
let difficulty = 0.002;

const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";

// Инициализация при загрузке
window.onload = () => {
    if (nick) {
        document.getElementById("welcome").innerText = "👋 Привет, " + nick;
        document.getElementById("nick").style.display = "none";
    }
    document.getElementById("menuLeaderboard").innerText = "🏆 Рекорд: " + best;
};

function startGame() {
    // Если ника нет, сохраняем его
    if (!nick) {
        const input = document.getElementById("nick").value.trim();
        if (input.length < 2) {
            alert("Введи свой ник!");
            return;
        }
        nick = input;
        localStorage.setItem("nick", nick);
    }

    const mode = document.getElementById("difficulty").value;
    speed = mode === "easy" ? 5 : mode === "hard" ? 9 : 7;
    difficulty = mode === "easy" ? 0.001 : mode === "hard" ? 0.003 : 0.002;

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");

    resetGame();
}

function resetGame() {
    coins = 0;
    updateScore();
    lane = 1;
    targetLane = 1;
    obstacleY = -100;
    gameRunning = true;
    spawnObstacle();
    if (loopId) cancelAnimationFrame(loopId);
    update();
}

function spawnObstacle() {
    obstacleLane = Math.floor(Math.random() * 3);
    obstacleY = -100;
    const obs = document.getElementById("obstacle");
    
    const isGood = Math.random() < 0.6;
    obs.dataset.type = isGood ? "good" : "bad";
    obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    obs.style.left = [15, 50, 85][obstacleLane] + "%";
}

function update() {
    if (!gameRunning) return;

    obstacleY += speed;
    speed += difficulty;

    const obs = document.getElementById("obstacle");
    obs.style.top = obstacleY + "px";

    // Проверка столкновения
    if (obstacleY > window.innerHeight - 180 && obstacleY < window.innerHeight - 80) {
        if (obstacleLane === targetLane) {
            if (obs.dataset.type === "good") {
                coins++;
                updateScore();
                spawnObstacle();
            } else {
                gameOver();
                return;
            }
        }
    }

    if (obstacleY > window.innerHeight) spawnObstacle();

    loopId = requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById("score").innerText = coins;
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(loopId);

    if (coins > best) {
        best = coins;
        localStorage.setItem("best", best);
        // Тут можно добавить window.set(...) для Firebase
    }

    alert(`Берри врезался! 💥\nСобрано мороженого: ${coins}\nРекорд: ${best}`);
    backToMenu();
}

function backToMenu() {
    gameRunning = false;
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    location.reload(); // Перезагружаем для обновления рекордов в меню
}

// Управление свайпами
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 30) return;
    if (diff > 0) targetLane = Math.min(2, targetLane + 1);
    else targetLane = Math.max(0, targetLane - 1);
    document.getElementById("player").style.left = [15, 50, 85][targetLane] + "%";
});

function openShop() {
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("shop").classList.remove("hidden");
}

function closeShop() {
    document.getElementById("shop").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}
