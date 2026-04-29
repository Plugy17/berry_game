let lane = 1;
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -100;
let loopId = null;

let nick = localStorage.getItem("nick");
let coins = 0;
let best = parseInt(localStorage.getItem("best")) || 0;
// Общий баланс игрока
let totalCoins = parseInt(localStorage.getItem("totalCoins")) || 0;

let speed = 6;
let difficulty = 0.002;

const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";

// Инициализация при загрузке
window.onload = () => {
    updateMenuInfo();
};

function updateMenuInfo() {
    if (nick) {
        document.getElementById("welcome").innerHTML = `✨ Герой <b>${nick}</b> готов к забегу! ✨`;
        document.getElementById("nick").style.display = "none";
    }
    document.getElementById("menuLeaderboard").innerText = "🏆 Рекорд: " + best;
    document.getElementById("total-balance").innerText = "У тебя всего: " + totalCoins + " 🍦";
}

function startGame() {
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

    totalCoins += coins;
    localStorage.setItem("totalCoins", totalCoins);

    if (coins > best) {
        best = coins;
        localStorage.setItem("best", best);
    }

    alert(`Берри врезался! 💥\nСобрано сейчас: ${coins} 🍦\nВсего в копилке: ${totalCoins}`);
    backToMenu();
}

function backToMenu() {
    gameRunning = false;
    if (loopId) cancelAnimationFrame(loopId);
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    updateMenuInfo();
}

// Управление свайпами и оживление Берри
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 30) return;

    const playerImg = document.getElementById("player");
    
    if (diff > 0) {
        targetLane = Math.min(2, targetLane + 1);
        playerImg.style.transform = "translateX(-50%) rotate(15deg)"; // Наклон вправо
    } else {
        targetLane = Math.max(0, targetLane - 1);
        playerImg.style.transform = "translateX(-50%) rotate(-15deg)"; // Наклон влево
    }
    
    // Перемещаем игрока на нужную дорожку
    playerImg.style.left = [15, 50, 85][targetLane] + "%";

    // Возвращаем персонажа в ровное положение через 200мс
    setTimeout(() => {
        playerImg.style.transform = "translateX(-50%) rotate(0deg)";
    }, 200);
});

function openShop() {
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("shop").classList.remove("hidden");
}

function closeShop() {
    document.getElementById("shop").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}
