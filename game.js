/* --- КОНСТАНТЫ И НАСТРОЙКИ --- */
let isPaused = false;
let laneCount = 4;
let lanes = [12.5, 37.5, 62.5, 87.5]; 
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -150; 
let loopId = null;
let speed = 7;
let baseSpeed = 7;
let difficulty = 0.002;

// Переменные профиля
let nick = "Игрок";
let playerID = "Guest"; 
let coins = 0;
let best = 0;
let totalCoins = 0;
let goldenIce = 0; 
let diamonds = 0; 
let hasVipSkin = false; 
let extraShieldSlots = 0; 
let usedReviveThisRun = false;

/* 🔥 FIX: защита от сломанного localStorage */
let inventory = JSON.parse(localStorage.getItem('inventory')) || {
    shield: 0,
    magnet: 0,
    maxShieldSlots: 3,
    maxMagnetSlots: 3
};

if (!inventory) inventory = {shield:0, magnet:0, maxShieldSlots:3, maxMagnetSlots:3};

if (inventory.shield == null) inventory.shield = 0;
if (inventory.magnet == null) inventory.magnet = 0;

let level = 1;
let xp = 0;
const getNextLevelXP = (lvl) => lvl * 100 + (lvl - 1) * 50; 

const PRICES = { magnet: 200, shield: 400, goldenConvert: 1500 };
const VIP_PRICES = { skin: 3, slot: 3, diamond: 10000 };

let shieldActive = false;
let magnetActive = false;
let comboCount = 0;
let comboMultiplier = 1;
let rainInterval = null;

const imgIceCream = "url('assets/icecream.png')";
const imgGoldenIce = "url('assets/golden_ice.png')"; 
const imgBad = "url('assets/obstacle.png')";

const getIceIcon = () => `<span class="ice-icon"></span>`;
const getGoldIcon = () => `<span class="golden-ice-icon-small"></span>`;
const getDiamondIcon = () => `<span class="diamond-icon-small"></span>`;

/* --- ИНТЕГРАЦИЯ TELEGRAM И ВХОД --- */

document.addEventListener("DOMContentLoaded", function() {
    startIceRain("menu");

    /* 🔥 FIX: кнопки назад ВСЕГДА работают */
    document.addEventListener("click", (e) => {
        if (e.target.closest(".sub-btn")) {
            document.getElementById('shop')?.classList.add('hidden');
            document.getElementById('realShop')?.classList.add('hidden');
            document.getElementById('leaderboardScreen')?.classList.add('hidden');
            document.getElementById('menu')?.classList.remove('hidden');
        }
    });

    const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
    
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        playerID = tg.initDataUnsafe.user.id.toString();
        nick = tg.initDataUnsafe.user.first_name || "Игрок";
        loadUserData(playerID);
        showLoaderAndGoToMenu(nick);
    } else {
        const savedNick = localStorage.getItem('playerNick');
        if (!savedNick) {
            document.getElementById('auth-screen')?.classList.remove('hidden'); 
        } else {
            nick = savedNick;
            playerID = localStorage.getItem('playerID') || savedNick;
            loadUserData(playerID);
            showLoaderAndGoToMenu(savedNick);
        }
    }
});

/* --- ИГРА --- */

function startGame() {
    document.getElementById('menu')?.classList.add('hidden');
    document.getElementById('game')?.classList.remove('hidden');

    resetGame();
}

/* 🔥 FIX: полный ресет */
function resetGame() {
    coins = 0;
    comboCount = 0;
    comboMultiplier = 1;

    shieldActive = false;
    magnetActive = false;

    targetLane = 1;
    speed = baseSpeed;
    obstacleY = -150;

    gameRunning = true;

    const p = document.getElementById("player");
    if (p) {
        p.style.left = lanes[targetLane] + "%";
        p.classList.remove("shield-aura");
    }

    updateScore();
    updateBonusUI();

    spawnObstacle();

    if (loopId) cancelAnimationFrame(loopId);
    loopId = requestAnimationFrame(update);
}

/* 🔥 FIX: всегда спавнит новый объект */
function spawnObstacle() {
    const obs = document.getElementById("obstacle");
    if (!obs) return;

    obstacleLane = Math.floor(Math.random() * laneCount);
    obstacleY = -120;

    obs.style.left = lanes[obstacleLane] + "%";
    obs.style.top = obstacleY + "px";

    const rand = Math.random();

    if (rand < 0.1) {
        obs.dataset.type = "golden";
        obs.style.backgroundImage = imgGoldenIce;
    } else if (rand < 0.7) {
        obs.dataset.type = "good";
        obs.style.backgroundImage = imgIceCream;
    } else {
        obs.dataset.type = "bad";
        obs.style.backgroundImage = imgBad;
    }
}

/* 🔥 FIX: главный баг — цикл НЕ обрывается */
function update() {
    if (!gameRunning || isPaused) {
        loopId = requestAnimationFrame(update);
        return;
    }

    obstacleY += speed;
    speed += difficulty;

    const obs = document.getElementById("obstacle");
    const p = document.getElementById("player");
    if (!obs || !p) {
        loopId = requestAnimationFrame(update);
        return;
    }

    let currentX = parseFloat(p.style.left) || lanes[targetLane];
    let newX = currentX + (lanes[targetLane] - currentX) * 0.2;
    p.style.left = newX + "%";

    obs.style.top = obstacleY + "px";

    /* 🔥 FIX: точное столкновение */
    if (
        Math.abs(newX - parseFloat(obs.style.left)) < 10 &&
        obstacleY > window.innerHeight * 0.7
    ) {
        handleCollision(obs, p);

        /* 🔥 ВАЖНО: не выходим из цикла */
    }

    /* 🔥 FIX: если ушел вниз — новый объект */
    if (obstacleY > window.innerHeight + 50) {
        spawnObstacle();
    }

    loopId = requestAnimationFrame(update);
}

/* 🔥 FIX: обработка без убийства цикла */
function handleCollision(obs, p) {
    const type = obs.dataset.type;

    if (type === "good" || type === "golden") {
        createExplosion(window.innerWidth / 2, window.innerHeight * 0.7, type === "golden");

        coins += type === "golden" ? 5 : 1;
        updateScore();

        spawnObstacle(); // 🔥 ключевой фикс
        return;
    }

    if (type === "bad") {
        if (shieldActive) {
            shieldActive = false;
            p.classList.remove("shield-aura");
            spawnObstacle();
        } else {
            gameOver();
        }
    }
}

/* --- ЭФФЕКТЫ --- */

function createExplosion(x, y, isGold) {
    const game = document.getElementById("game");
    if (!game) return;

    const el = document.createElement("div");
    el.className = "ice-pop";
    el.style.left = x + "px";
    el.style.top = y + "px";
    if (isGold) el.style.background = "yellow";

    game.appendChild(el);
    setTimeout(() => el.remove(), 400);
}

/* --- UI --- */

function updateScore() {
    const hud = document.getElementById("hud");
    if (hud) {
        hud.innerHTML = `🍦 ${coins}`;
    }
}

/* 🔥 FIX: undefined больше не будет */
function updateBonusUI() {
    const s = document.getElementById("count-shield");
    const m = document.getElementById("count-magnet");

    if (s) s.innerText = inventory.shield || 0;
    if (m) m.innerText = inventory.magnet || 0;
}

/* --- GAME OVER --- */

function gameOver() {
    gameRunning = false;

    totalCoins += coins;

    if (coins > best) {
        best = coins;
    }

    saveUserData();

    alert("💀 GAME OVER\n🍦 " + coins);
}

/* --- МЕНЮ --- */

function backToMenu() {
    gameRunning = false;

    document.getElementById("game")?.classList.add("hidden");
    document.getElementById("menu")?.classList.remove("hidden");

    startIceRain("menu");
}

/* --- ДОЖДЬ --- */

function startIceRain(screenId) {
    const container = document.getElementById(screenId);
    if (!container) return;

    if (rainInterval) clearInterval(rainInterval);

    rainInterval = setInterval(() => {
        if (container.classList.contains('hidden')) return;

        const drop = document.createElement("div");
        drop.className = "falling-ice-anim";
        drop.style.left = Math.random() * 100 + "vw";

        container.appendChild(drop);

        setTimeout(() => drop.remove(), 4000);
    }, 400);
}

/* --- УПРАВЛЕНИЕ --- */

let startX = 0;

document.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener("touchend", e => {
    if (!gameRunning || isPaused) return;

    let diff = e.changedTouches[0].clientX - startX;

    if (Math.abs(diff) < 30) return;

    targetLane = diff > 0
        ? Math.min(3, targetLane + 1)
        : Math.max(0, targetLane - 1);
});
