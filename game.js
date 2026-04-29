// --- КОНФИГУРАЦИЯ ПОЛОС (4 полосы) ---
let laneCount = 4;
let lanes = [12.5, 37.5, 62.5, 87.5]; 
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -150; // Начинаем чуть выше
let loopId = null;

let nick = localStorage.getItem("nick");
let coins = 0;
let best = parseInt(localStorage.getItem("best")) || 0;
let totalCoins = parseInt(localStorage.getItem("totalCoins")) || 0;

let speed = 6;
let baseSpeed = 6;
let difficulty = 0.002;

// --- ИНВЕНТАРЬ И БОНУСЫ ---
let inventory = {
    magnet: parseInt(localStorage.getItem("inv_magnet")) || 0,
    shield: parseInt(localStorage.getItem("inv_shield")) || 0
};
const PRICES = { magnet: 500, shield: 300 };

let shieldActive = false;
let magnetActive = false;
let magnetTimer = null;

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
        document.getElementById("welcome").innerHTML = `Герой <b>${nick}</b> готов!`;
        document.getElementById("nick").style.display = "none";
    }
    document.getElementById("menuLeaderboard").innerText = "🏆 " + best;
    const balanceHTML = `${totalCoins} <img src="assets/icecream.png" style="width:22px; vertical-align:middle;">`;
    document.getElementById("total-balance").innerHTML = balanceHTML;
    
    let shopBal = document.getElementById("shop-balance");
    if(shopBal) shopBal.innerHTML = balanceHTML;
    
    updateBonusUI();
}

function updateBonusUI() {
    document.getElementById("count-shield").innerText = inventory.shield;
    document.getElementById("count-magnet").innerText = inventory.magnet;
}

function buyItem(type) {
    if (totalCoins >= PRICES[type]) {
        totalCoins -= PRICES[type];
        inventory[type]++;
        localStorage.setItem("totalCoins", totalCoins);
        localStorage.setItem("inv_" + type, inventory[type]);
        updateMenuInfo();
        alert("Успешно куплено!");
    } else {
        alert("Недостаточно BERRY!");
    }
}

function useShield() {
    if (inventory.shield > 0 && !shieldActive && gameRunning) {
        inventory.shield--;
        localStorage.setItem("inv_shield", inventory.shield);
        shieldActive = true;
        document.getElementById("player").style.boxShadow = "0 0 25px #00ffff";
        updateBonusUI();
    }
}

function useMagnet() {
    if (inventory.magnet > 0 && !magnetActive && gameRunning) {
        inventory.magnet--;
        localStorage.setItem("inv_magnet", inventory.magnet);
        magnetActive = true;
        updateBonusUI();
        if (magnetTimer) clearTimeout(magnetTimer);
        magnetTimer = setTimeout(() => { magnetActive = false; }, 10000);
    }
}

function startGame() {
    if (!nick) {
        const input = document.getElementById("nick").value.trim();
        if (input.length < 2) return alert("Введи ник!");
        nick = input;
        localStorage.setItem("nick", nick);
    }
    const mode = document.getElementById("difficulty").value;
    baseSpeed = mode === "easy" ? 5 : mode === "hard" ? 9 : 7;
    difficulty = mode === "easy" ? 0.001 : mode === "hard" ? 0.003 : 0.002;
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    resetGame();
}

function resetGame() {
    coins = 0; comboCount = 0; isRainbowMode = false;
    shieldActive = false; magnetActive = false;
    document.getElementById("player").style.boxShadow = "none";
    speed = baseSpeed;
    targetLane = 1;
    gameRunning = true;
    updateScore();
    spawnObstacle();
    if (loopId) cancelAnimationFrame(loopId);
    update();
}

function spawnObstacle() {
    obstacleLane = Math.floor(Math.random() * laneCount);
    obstacleY = -150;
    const obs = document.getElementById("obstacle");
    const isGood = Math.random() < 0.6;
    obs.dataset.type = isGood ? "good" : "bad";
    obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    obs.style.left = lanes[obstacleLane] + "%";
}

function update() {
    if (!gameRunning) return;
    
    obstacleY += speed;
    speed += difficulty;
    
    const obs = document.getElementById("obstacle");
    const player = document.getElementById("player");
    
    // Магнит
    if (magnetActive && obs.dataset.type === "good" && obstacleY > 0) {
        obstacleLane = targetLane;
        obs.style.left = lanes[obstacleLane] + "%";
    }
    
    obs.style.top = obstacleY + "px";

    // ПРОВЕРКА СТОЛКНОВЕНИЙ ПО ГЕОМЕТРИИ
    let pRect = player.getBoundingClientRect();
    let oRect = obs.getBoundingClientRect();

    if (
        oRect.bottom > pRect.top + 15 && 
        oRect.top < pRect.bottom - 15 && 
        obstacleLane === targetLane
    ) {
        if (obs.dataset.type === "good") {
            handleCollect();
            spawnObstacle();
        } else {
            gameOver();
            return;
        }
    }

    if (obstacleY > window.innerHeight) {
        if (obs.dataset.type === "good") { comboCount = 0; updateScore(); }
        spawnObstacle();
    }
    
    loopId = requestAnimationFrame(update);
}

function handleCollect() {
    coins += isRainbowMode ? 2 : 1;
    if (coins % 10 === 0) speed *= 1.05;
    if (!isRainbowMode) {
        comboCount++;
        if (comboCount >= 5) activateRainbowMode();
    }
    updateScore();
    const hud = document.getElementById("hud");
    hud.classList.add("score-bump");
    setTimeout(() => hud.classList.remove("score-bump"), 200);
}

function activateRainbowMode() {
    isRainbowMode = true; comboCount = 0;
    const hud = document.getElementById("hud");
    hud.classList.add("rainbow-active");
    if (rainbowTimer) clearTimeout(rainbowTimer);
    rainbowTimer = setTimeout(() => {
        isRainbowMode = false;
        hud.classList.remove("rainbow-active");
        updateScore();
    }, 5000);
}

function updateScore() {
    const hud = document.getElementById("hud");
    const scoreDisplay = isRainbowMode ? `<span class="rainbow-text">X2</span> ${coins}` : coins;
    hud.innerHTML = `
        <div class="score-main">${scoreDisplay} <img src="assets/icecream.png" class="hud-icon" style="width:20px;"></div>
        <div class="score-record">Best: ${best}</div>
        ${comboCount > 0 && !isRainbowMode ? `<div class="combo-badge">Combo: ${comboCount}</div>` : ''}
    `;
}

function gameOver() {
    if (shieldActive) {
        shieldActive = false;
        document.getElementById("player").style.boxShadow = "none";
        spawnObstacle();
        return;
    }
    gameRunning = false;
    totalCoins += coins;
    localStorage.setItem("totalCoins", totalCoins);
    if (coins > best) { best = coins; localStorage.setItem("best", best); }
    alert(`Берри врезался! Собрано: ${coins}`);
    backToMenu();
}

function backToMenu() {
    gameRunning = false;
    if (loopId) cancelAnimationFrame(loopId);
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    updateMenuInfo();
}

let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });

document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 30) return;

    const playerImg = document.getElementById("player");
    if (diff > 0) {
        targetLane = Math.min(3, targetLane + 1);
        playerImg.style.transform = "translateX(-50%) rotate(15deg)";
    } else {
        targetLane = Math.max(0, targetLane - 1);
        playerImg.style.transform = "translateX(-50%) rotate(-15deg)";
    }
    
    playerImg.style.left = lanes[targetLane] + "%";
    
    setTimeout(() => {
        playerImg.style.transform = "translateX(-50%) rotate(0deg)";
    }, 200);
});

function openShop() {
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("shop").classList.remove("hidden");
    updateMenuInfo();
}
function closeShop() {
    document.getElementById("shop").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}
