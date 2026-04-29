let lane = 1;
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -100;
let loopId = null;

let nick = localStorage.getItem("nick");
let coins = 0;
let best = parseInt(localStorage.getItem("best")) || 0;
let totalCoins = parseInt(localStorage.getItem("totalCoins")) || 0;

let speed = 6;
let baseSpeed = 6; // Запоминаем стартовую скорость для расчетов
let difficulty = 0.002;

// --- НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ КОМБО И РАДУГИ ---
let comboCount = 0;
let isRainbowMode = false;
let rainbowTimer = null;

const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";

window.onload = () => {
    updateMenuInfo();
};

function updateMenuInfo() {
    if (nick) {
        document.getElementById("welcome").innerHTML = `<span class="flash-effect"></span> Герой <b>${nick}</b> готов к забегу! <span class="flash-effect"></span>`;
        document.getElementById("nick").style.display = "none";
    }
    document.getElementById("menuLeaderboard").innerText = "🏆 " + best;
    document.getElementById("total-balance").innerHTML = `${totalCoins} <img src="assets/icecream.png" style="width:22px; vertical-align:middle;">`;
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
    baseSpeed = mode === "easy" ? 5 : mode === "hard" ? 9 : 7;
    speed = baseSpeed;
    difficulty = mode === "easy" ? 0.001 : mode === "hard" ? 0.003 : 0.002;

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");

    resetGame();
}

function resetGame() {
    coins = 0;
    comboCount = 0;
    isRainbowMode = false;
    speed = baseSpeed;
    updateScore();
    lane = 1;
    targetLane = 1;
    obstacleY = -100;
    gameRunning = true;
    
    // Сброс визуальных эффектов радуги
    const hud = document.getElementById("hud");
    hud.classList.remove("rainbow-active");
    
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
    // Постоянное микро-ускорение от сложности
    speed += difficulty;

    const obs = document.getElementById("obstacle");
    obs.style.top = obstacleY + "px";

    if (obstacleY > window.innerHeight - 180 && obstacleY < window.innerHeight - 80) {
        if (obstacleLane === targetLane) {
            if (obs.dataset.type === "good") {
                handleCollect();
                spawnObstacle();
            } else {
                gameOver();
                return;
            }
        }
    }

    if (obstacleY > window.innerHeight) {
        // Если пропустили мороженку — сбрасываем комбо
        if (obs.dataset.type === "good") {
            comboCount = 0;
        }
        spawnObstacle();
    }
    loopId = requestAnimationFrame(update);
}

// ЛОГИКА СБОРА И БОНУСОВ
function handleCollect() {
    // 1. Начисление очков (в 2 раза больше в режиме радуги)
    let reward = isRainbowMode ? 2 : 1;
    coins += reward;
    
    // 2. Ускорение: каждые 10 очков увеличиваем скорость на 10%
    if (coins % 10 === 0) {
        speed *= 1.1;
    }

    // 3. Работа с комбо
    if (!isRainbowMode) {
        comboCount++;
        if (comboCount >= 5) {
            activateRainbowMode();
        }
    }

    updateScore();

    // Эффект тряски HUD
    const hud = document.getElementById("hud");
    hud.classList.add("score-bump");
    setTimeout(() => hud.classList.remove("score-bump"), 200);
}

function activateRainbowMode() {
    isRainbowMode = true;
    comboCount = 0;
    const hud = document.getElementById("hud");
    
    hud.classList.add("rainbow-active"); // Добавляем CSS анимацию

    if (rainbowTimer) clearTimeout(rainbowTimer);
    rainbowTimer = setTimeout(() => {
        isRainbowMode = false;
        hud.classList.remove("rainbow-active");
    }, 5000); // Режим на 5 секунд
}

function updateScore() {
    const hud = document.getElementById("hud");
    // Если радуга — подсвечиваем текст
    const scoreText = isRainbowMode ? `<span style="color:#fff; text-shadow: 0 0 10px #fff;">x2! ${coins}</span>` : coins;
    
    hud.innerHTML = `
        <div class="score-main">${scoreText} <img src="assets/icecream.png" style="width:35px; vertical-align:middle;"></div>
        <div class="score-record">Best: ${best} ${comboCount > 0 && !isRainbowMode ? ` | Combo: ${comboCount}` : ''}</div>
    `;
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(loopId);
    if (rainbowTimer) clearTimeout(rainbowTimer);

    totalCoins += coins;
    localStorage.setItem("totalCoins", totalCoins);

    if (coins > best) {
        best = coins;
        localStorage.setItem("best", best);
    }

    alert(`Берри врезался! 💥\nСобрано: ${coins} 🍦\nКомбо было: ${comboCount}\nВсего в копилке: ${totalCoins}`);
    backToMenu();
}

function backToMenu() {
    gameRunning = false;
    if (loopId) cancelAnimationFrame(loopId);
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    updateMenuInfo();
}

// Управление
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 30) return;

    const playerImg = document.getElementById("player");
    if (diff > 0) {
        targetLane = Math.min(2, targetLane + 1);
        playerImg.style.transform = "translateX(-50%) rotate(15deg)";
    } else {
        targetLane = Math.max(0, targetLane - 1);
        playerImg.style.transform = "translateX(-50%) rotate(-15deg)";
    }
    playerImg.style.left = [15, 50, 85][targetLane] + "%";
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
