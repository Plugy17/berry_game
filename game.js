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

let inventory = JSON.parse(localStorage.getItem('inventory')) || {
    shield: 0,
    magnet: 0,
    maxShieldSlots: 3,
    maxMagnetSlots: 3
};

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

function saveInitialNick() {
    const nickInput = document.getElementById('usernameInput');
    const val = nickInput ? nickInput.value.trim() : "";
    if (val.length < 2) {
        alert("Ник слишком короткий!");
        return;
    }
    localStorage.setItem('playerNick', val);
    localStorage.setItem('playerID', val);
    nick = val;
    playerID = val; 
    showLoaderAndGoToMenu(val);
}

function showLoaderAndGoToMenu(playerNick) {
    const loader = document.getElementById('loadingOverlay');
    const welcome = document.getElementById('welcomeScreen');
    const menu = document.getElementById('menu');

    if(welcome) welcome.classList.add('hidden');
    if(loader) loader.classList.remove('hidden');

    setTimeout(() => {
        if(loader) loader.classList.add('hidden');
        if(menu) menu.classList.remove('hidden');
        updateMenuInfo(); 
    }, 1500);
}

/* --- МАГАЗИН --- */

function buyItem(item) {
    const price = (item === 'shield') ? 400 : 200;
    if (totalCoins >= price) {
        if (item === 'shield') {
            if (inventory.shield < inventory.maxShieldSlots) {
                inventory.shield++;
                totalCoins -= price;
            } else { alert("Все слоты для щитов заняты!"); return; }
        } else {
            if (inventory.magnet < inventory.maxMagnetSlots) {
                inventory.magnet++;
                totalCoins -= price;
            } else { alert("Все слоты для магнитов заняты!"); return; }
        }
        saveUserData();
        updateMenuInfo();
    } else { alert("Не хватает мороженого!"); }
}

function buySlot(type) {
    if (goldenIce >= 5) {
        if (type === 'shield') inventory.maxShieldSlots++;
        else inventory.maxMagnetSlots++;
        goldenIce -= 5;
        saveUserData();
        updateMenuInfo();
        alert("Слот куплен!");
    } else { alert("Нужно 5 золотых мороженых!"); }
}

function buyVipItem(type) {
    if (type === 'skin') {
        if (diamonds >= VIP_PRICES.skin && !hasVipSkin) {
            diamonds -= VIP_PRICES.skin; 
            hasVipSkin = true;
            saveUserData(); 
            updateMenuInfo();
            alert("БАФФ БЕРРИ АКТИВИРОВАН!");
        } else alert("Не хватает алмазов или уже куплено!");
    } else buySlot('shield');
}

function updateShopUI() {
    const ids = {"coin-count": totalCoins, "gold-count": goldenIce, "diamond-count": diamonds};
    for (let [id, val] of Object.entries(ids)) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }
}

/* --- ИГРОВАЯ ЛОГИКА --- */

function startGame() {
    console.log("Запуск...");
    const menu = document.getElementById('menu');
    const gameScreen = document.getElementById('game');
    
    if (menu) menu.classList.add('hidden');
    if (gameScreen) {
        gameScreen.classList.remove('hidden');
        gameScreen.style.display = 'block';
    }
    resetGame();
}

function resetGame() {
    coins = 0; comboCount = 0; comboMultiplier = 1;
    shieldActive = false; magnetActive = false;
    usedReviveThisRun = false;
    targetLane = 1; speed = baseSpeed; gameRunning = true;
    
    const p = document.getElementById("player");
    if(p) {
        p.className = ""; 
        p.style.filter = "none"; 
        if(hasVipSkin) p.classList.add("skin-ice"); 
        p.style.left = lanes[targetLane] + "%";
    }
    
    document.getElementById("combo-ui")?.classList.add("hidden");
    updateScore(); 
    spawnObstacle();
    updateBonusUI();
    if (loopId) cancelAnimationFrame(loopId);
    update();
}

function spawnObstacle() {
    const obs = document.getElementById("obstacle");
    if(!obs) return;
    obstacleLane = Math.floor(Math.random() * laneCount);
    obstacleY = -150; 
    obs.style.left = lanes[obstacleLane] + "%";
    
    const rand = Math.random();
    if (rand < 0.08) {
        obs.dataset.type = "golden";
        obs.style.backgroundImage = imgGoldenIce;
    } else {
        const isGood = rand < 0.65;
        obs.dataset.type = isGood ? "good" : "bad";
        obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    }
}

function update() {
    if (!gameRunning || isPaused) {
        if(gameRunning) loopId = requestAnimationFrame(update);
        return;
    }
    obstacleY += speed;
    speed += difficulty;
    
    const obs = document.getElementById("obstacle");
    const p = document.getElementById("player");
    if(!obs || !p) return;
    
    let currentX = parseFloat(p.style.left) || lanes[targetLane];
    let newX = currentX + (lanes[targetLane] - currentX) * 0.2;
    p.style.left = newX + "%";
    p.style.transform = `translateX(-50%) rotate(${(lanes[targetLane] - currentX) * 2.5}deg)`;
    
    const isPullable = obs.dataset.type === "good" || obs.dataset.type === "golden";
    if (magnetActive && isPullable) {
        let obsX = parseFloat(obs.style.left);
        obs.style.left = (obsX + (newX - obsX) * (hasVipSkin ? 0.4 : 0.28)) + "%";
    }
    
    obs.style.top = obstacleY + "px";
    
    // Коллизия
    if (Math.abs(newX - parseFloat(obs.style.left)) < 12 && Math.abs(obstacleY - (window.innerHeight * 0.75)) < 60) {
        handleCollision(obs, p);
    }
    
    if (obstacleY > window.innerHeight) {
        if (isPullable) { 
            comboCount = 0; comboMultiplier = 1;
            document.getElementById("combo-ui")?.classList.add("hidden"); 
        }
        spawnObstacle();
    }
    loopId = requestAnimationFrame(update);
}

function handleCollision(obs, p) {
    const rect = obs.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (obs.dataset.type !== "bad") {
        const isGold = obs.dataset.type === "golden";
        createExplosion(cx, cy, isGold);
        comboCount++;
        if (comboCount % 50 === 0 || isGold) goldenIce++;
        
        comboMultiplier = hasVipSkin ? 
            (comboCount >= 25 ? 7 : comboCount >= 18 ? 6 : comboCount >= 12 ? 5 : comboCount >= 8 ? 4 : comboCount >= 5 ? 3 : comboCount >= 2 ? 2 : 1) :
            (comboCount >= 12 ? 5 : comboCount >= 8 ? 4 : comboCount >= 5 ? 3 : comboCount >= 2 ? 2 : 1);

        const ui = document.getElementById("combo-ui");
        if(ui && comboMultiplier > 1) {
            ui.innerText = "x" + comboMultiplier;
            ui.classList.remove("hidden");
        }

        coins += comboMultiplier;
        xp += hasVipSkin ? Math.floor(comboMultiplier * 1.5) : comboMultiplier;
        
        if (xp >= getNextLevelXP(level)) { xp -= getNextLevelXP(level); level++; alert("LEVEL UP!"); }
        updateScore(); spawnObstacle();
    } else {
        if (shieldActive) {
            createCubeBoom(cx, cy);
            shieldActive = false;
            p.classList.remove("shield-aura");
            spawnObstacle();
        } else { gameOver(); }
    }
}

/* --- СИСТЕМА СОХРАНЕНИЙ --- */

function saveUserData() {
    const data = { nick, best, totalCoins, goldenIce, diamonds, inventory, level, xp, hasVipSkin };
    localStorage.setItem('inventory', JSON.stringify(data));
    if (window.db && playerID) {
        window.db.ref('users/' + playerID).set(data);
    }
}

function loadUserData(id) {
    const local = JSON.parse(localStorage.getItem('inventory'));
    if(local) {
        totalCoins = local.totalCoins || 0;
        goldenIce = local.goldenIce || 0;
        diamonds = local.diamonds || 0;
        level = local.level || 1;
        xp = local.xp || 0;
        best = local.best || 0;
    }
    updateMenuInfo();
}

/* --- ВСПОМОГАТЕЛЬНЫЕ --- */

function updateScore() {
    const hud = document.getElementById("hud");
    if(hud) hud.innerHTML = `<div>LVL ${level}</div><div>${coins} ${getIceIcon()}</div><div style="color:cyan">${diamonds} ${getDiamondIcon()}</div>`;
}

function updateMenuInfo() {
    const wel = document.getElementById("welcome");
    if(wel) wel.innerHTML = `ГЕРОЙ: <b>${nick.toUpperCase()}</b> [LVL ${level}]`;
    const lb = document.getElementById("menuLeaderboard");
    if(lb) lb.innerText = "🏆 РЕКОРД: " + best;
    const bal = document.getElementById("total-balance");
    if(bal) bal.innerHTML = `${totalCoins} ${getIceIcon()} | ${goldenIce} ${getGoldIcon()} | ${diamonds} ${getDiamondIcon()}`;
    updateBonusUI();
    updateShopUI();
}

function updateBonusUI() {
    if(document.getElementById("count-shield")) document.getElementById("count-shield").innerText = inventory.shield;
    if(document.getElementById("count-magnet")) document.getElementById("count-magnet").innerText = inventory.magnet;
}

function useShield() {
    if (inventory.shield > 0 && !shieldActive && gameRunning) {
        inventory.shield--; shieldActive = true;
        document.getElementById("player")?.classList.add("shield-aura");
        updateBonusUI(); saveUserData();
    }
}

function useMagnet() {
    if (inventory.magnet > 0 && !magnetActive && gameRunning) {
        inventory.magnet--; magnetActive = true;
        document.getElementById("player")?.classList.add("magnet-aura");
        updateBonusUI(); saveUserData();
        setTimeout(() => {
            magnetActive = false;
            document.getElementById("player")?.classList.remove("magnet-aura");
        }, hasVipSkin ? 15000 : 10000);
    }
}

function gameOver() {
    gameRunning = false;
    totalCoins += coins;
    if (coins > best) best = coins;
    saveUserData();
    document.getElementById("gameOverScreen")?.classList.remove("hidden");
    if(document.getElementById("final-score")) document.getElementById("final-score").innerText = coins;
}

function backToMenu() {
    gameRunning = false;
    document.getElementById("game")?.classList.add("hidden");
    document.getElementById("gameOverScreen")?.classList.add("hidden");
    document.getElementById("menu")?.classList.remove("hidden");
    updateMenuInfo();
    startIceRain("menu");
}

function togglePause() { isPaused = !isPaused; }

/* ЭФФЕКТЫ (заглушки или минимал) */
function startIceRain(id) { 
    if(rainInterval) clearInterval(rainInterval);
    rainInterval = setInterval(() => {
        const cont = document.getElementById(id);
        if(!cont || cont.classList.contains('hidden')) return;
        const drop = document.createElement("div");
        drop.className = "falling-ice-anim";
        drop.style.left = Math.random() * 95 + "vw";
        cont.appendChild(drop);
        setTimeout(() => drop.remove(), 4000);
    }, 300);
}
function createExplosion(x,y,g) {} 
function createCubeBoom(x,y) {}

/* УПРАВЛЕНИЕ */
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, {passive: true});
document.addEventListener("touchend", e => {
    if (!gameRunning || isPaused) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 30) return;
    targetLane = diff > 0 ? Math.min(3, targetLane + 1) : Math.max(0, targetLane - 1);
});
document.addEventListener("keydown", e => {
    if (!gameRunning || isPaused) return;
    if (e.key === "ArrowLeft" || e.key === "a") targetLane = Math.max(0, targetLane - 1);
    if (e.key === "ArrowRight" || e.key === "d") targetLane = Math.min(3, targetLane + 1);
});

// Доп функции из твоего кода
function openBuffs() { document.getElementById("menu").classList.add("hidden"); document.getElementById("shop").classList.remove("hidden"); }
function closeShop() { document.getElementById("shop").classList.add("hidden"); document.getElementById("menu").classList.remove("hidden"); }
