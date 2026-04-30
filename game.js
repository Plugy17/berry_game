/* --- КОНСТАНТЫ И НАСТРОЙКИ --- */
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

let nick = localStorage.getItem("nick");
let coins = 0;
let best = 0;
let totalCoins = 0;

// --- НОВАЯ ВАЛЮТА И VIP ПРОГРЕСС ---
let goldenIce = 0; // Наша новая валюта
let hasVipSkin = false; 
let extraShieldSlots = 0; // Улучшение ячеек щита
let usedReviveThisRun = false; // Ограничение воскрешения (1 раз за игру)

// НОВЫЕ ПЕРЕМЕННЫЕ: УРОВНИ И ОПЫТ
let level = 1;
let xp = 0;
const getNextLevelXP = (lvl) => lvl * 100 + (lvl - 1) * 50; 

let inventory = { magnet: 0, shield: 0 };
const PRICES = { magnet: 500, shield: 300, goldenConvert: 5000 };
const VIP_PRICES = { skin: 10, slot: 5 }; // Цены в Золотых Ягодах

let shieldActive = false;
let magnetActive = false;
let comboCount = 0;
let comboMultiplier = 1;

let rainInterval = null;

const imgIceCream = "url('assets/icecream.png')";
const imgGoldenIce = "url('assets/golden_ice.png')"; // Ресурс для золотого
const imgBad = "url('assets/obstacle.png')";

const getIceIcon = () => `<span class="ice-icon"></span>`;
const getGoldIcon = () => `<span class="golden-ice-icon-small"></span>`;

// --- ЭФФЕКТ ПАДАЮЩЕГО МОРОЖЕНЫХ ---
function createRainDrop(containerId) {
    const container = document.getElementById(containerId);
    if (!container || container.classList.contains('hidden')) return;

    const drop = document.createElement("div");
    // Редкий шанс на золотое мороженое в меню для красоты
    const isGold = Math.random() < 0.1;
    drop.className = isGold ? "golden-drop" : "falling-ice-anim"; 
    drop.style.left = Math.random() * 95 + "vw";
    drop.style.backgroundImage = isGold ? imgGoldenIce : imgIceCream;
    
    const duration = Math.random() * 2 + 3; 
    drop.style.animationDuration = duration + "s";
    
    container.appendChild(drop);
    setTimeout(() => drop.remove(), duration * 1000);
}

function startIceRain(id) {
    stopIceRain();
    rainInterval = setInterval(() => createRainDrop(id), 300);
}

function stopIceRain() {
    if (rainInterval) clearInterval(rainInterval);
}

// --- ЭФФЕКТЫ ВЗРЫВА ---
function createExplosion(x, y, isGold = false) {
    const layer = document.getElementById("effects-layer") || document.getElementById("game");
    if (!layer) return;
    
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.className = "ice-particle";
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 120; 
        const dx = Math.cos(angle) * dist + "px";
        const dy = Math.sin(angle) * dist + "px";
        particle.style.setProperty('--dx', dx);
        particle.style.setProperty('--dy', dy);
        particle.style.left = x + "px";
        particle.style.top = y + "px";
        particle.style.backgroundImage = isGold ? imgGoldenIce : imgIceCream;
        // Если золотое, добавим свечения
        if(isGold) particle.style.filter = "drop-shadow(0 0 10px #ffea00)";
        
        layer.appendChild(particle);
        setTimeout(() => particle.remove(), 600);
    }
}

function createCubeBoom(x, y) {
    const layer = document.getElementById("effects-layer") || document.getElementById("game");
    const boom = document.createElement('div');
    boom.className = 'cube-boom';
    boom.style.left = x + 'px';
    boom.style.top = y + 'px';
    layer.appendChild(boom);
    setTimeout(() => boom.remove(), 500);
}

// --- FIREBASE (ОБНОВЛЕНО СОХРАНЕНИЕ С ЗОЛОТОМ) ---
function loadUserData(playerNick) {
    if (!window.db) return updateMenuInfo();
    db.ref('players/' + playerNick).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            best = data.best || 0;
            totalCoins = data.totalCoins || 0;
            goldenIce = data.goldenIce || 0; // Загрузка золота
            level = data.level || 1;
            xp = data.xp || 0;
            inventory.shield = (data.inventory && data.inventory.shield) || 0;
            inventory.magnet = (data.inventory && data.inventory.magnet) || 0;
            // Загрузка VIP статусов
            hasVipSkin = data.hasVipSkin || false;
            extraShieldSlots = data.extraShieldSlots || 0;
        }
        updateMenuInfo();
    }).catch(() => updateMenuInfo());
}

function saveUserData() {
    if (!nick || !window.db) return;
    db.ref('players/' + nick).set({ 
        nick, 
        best, 
        totalCoins, 
        goldenIce,
        inventory,
        level,
        xp,
        hasVipSkin,
        extraShieldSlots
    });
}

window.onload = () => { 
    if(nick) loadUserData(nick); 
    else updateMenuInfo();
    startIceRain("menu"); 
};

function updateMenuInfo() {
    if (nick) {
        const welcomeElem = document.getElementById("welcome");
        if(welcomeElem) welcomeElem.innerHTML = `Герой <b>${nick}</b> [LVL ${level}]`;
        const nickInput = document.getElementById("nick");
        if(nickInput) nickInput.style.display = "none";
    }
    const menuLb = document.getElementById("menuLeaderboard");
    if(menuLb) menuLb.innerText = "🏆 " + best;

    // Обновление баланса в меню (Мороженое + Золото)
    const totalBal = document.getElementById("total-balance");
    if(totalBal) {
        totalBal.innerHTML = `
            <div class="currency-row">${totalCoins} ${getIceIcon()}</div>
            <div class="currency-row">${goldenIce} ${getGoldIcon()}</div>
        `;
    }
    
    const shopBalValue = document.getElementById("shop-balance");
    if(shopBalValue) {
        shopBalValue.innerHTML = `${totalCoins} ${getIceIcon()} | ${goldenIce} ${getGoldIcon()}`;
    }
    updateBonusUI();
}

function updateBonusUI() {
    const sCount = document.getElementById("count-shield");
    const mCount = document.getElementById("count-magnet");
    if(sCount) sCount.innerText = inventory.shield;
    if(mCount) mCount.innerText = inventory.magnet;
}

function startGame() {
    if (!nick) {
        const val = document.getElementById("nick").value.trim();
        if (val.length < 2) return alert("Введи имя!");
        nick = val; localStorage.setItem("nick", nick);
    }
    stopIceRain(); 
    document.getElementById("gameOverScreen").classList.add("hidden");
    const mode = document.getElementById("difficulty").value;
    baseSpeed = mode === "easy" ? 5 : mode === "hard" ? 9 : 7;
    difficulty = mode === "easy" ? 0.001 : mode === "hard" ? 0.003 : 0.002;
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    resetGame();
}

function resetGame() {
    coins = 0; comboCount = 0; comboMultiplier = 1;
    shieldActive = false; magnetActive = false;
    usedReviveThisRun = false; // Сброс воскрешения
    targetLane = 1; speed = baseSpeed; gameRunning = true;
    
    const p = document.getElementById("player");
    p.className = ""; 
    if(hasVipSkin) p.classList.add("skin-ice"); // Применяем VIP скин
    
    p.style.left = lanes[targetLane] + "%";
    p.style.transform = "translateX(-50%) rotate(0deg)"; 
    document.getElementById("combo-ui").classList.add("hidden");
    updateScore(); 
    spawnObstacle();
    updateBonusUI();
    if (loopId) cancelAnimationFrame(loopId);
    update();
}

function spawnObstacle() {
    const obs = document.getElementById("obstacle");
    obstacleLane = Math.floor(Math.random() * laneCount);
    obstacleY = -150; 
    
    const mode = document.getElementById("difficulty").value;
    const rand = Math.random();
    
    // ЛОГИКА ПОЯВЛЕНИЯ ЗОЛОТЫХ ЯГОД (Только на Hard)
    if (mode === "hard" && rand < 0.05) {
        obs.dataset.type = "golden";
        obs.style.backgroundImage = imgGoldenIce;
        speed += 2; // Золотые движутся быстрее
    } else {
        const isGood = rand < 0.6;
        obs.dataset.type = isGood ? "good" : "bad";
        obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    }

    obs.style.left = lanes[obstacleLane] + "%";
    obs.style.display = "block";
    obs.style.transform = "scale(1)";
}

function update() {
    if (!gameRunning) return;
    obstacleY += speed;
    speed += difficulty;
    const obs = document.getElementById("obstacle");
    const p = document.getElementById("player");
    const playerTop = window.innerHeight * 0.75; 

    // Магнит теперь работает и на золотые ягоды!
    const isPullable = obs.dataset.type === "good" || obs.dataset.type === "golden";
    
    if (magnetActive && isPullable) {
        let currentLeft = parseFloat(obs.style.left);
        let targetX = lanes[targetLane];
        let distY = playerTop - obstacleY;
        
        // ПАССИВКА СКИНА: +10% к силе магнита
        let magnetPower = hasVipSkin ? 0.35 : 0.25;

        if (distY < 500 && distY > -30) {
            let newLeft = currentLeft + (targetX - currentLeft) * magnetPower;
            obs.style.left = newLeft + "%";
            if (distY < 180) {
                obs.style.left = targetX + "%";
                obstacleLane = targetLane;
            }
            obstacleY -= (speed * 0.5); 
        }
    }
    
    obs.style.top = obstacleY + "px";
    const catchRange = (magnetActive && isPullable) ? 120 : 60;
    
    if (obstacleLane === targetLane && obstacleY > playerTop - catchRange && obstacleY < playerTop + catchRange) {
        handleCollision(obs, p);
    }
    
    if (obstacleY > window.innerHeight) {
        if (obs.dataset.type === "good" || obs.dataset.type === "golden") { 
            comboCount = 0; comboMultiplier = 1; 
            document.getElementById("combo-ui").classList.add("hidden"); 
        }
        spawnObstacle();
    }
    if (gameRunning) loopId = requestAnimationFrame(update);
}

function handleCollision(obs, p) {
    const rect = obs.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (obs.dataset.type === "good" || obs.dataset.type === "golden") {
        const isGold = obs.dataset.type === "golden";
        createExplosion(centerX, centerY, isGold); 
        
        comboCount++;
        
        // ВЫДАЧА ЗОЛОТА ЗА КОМБО (каждые 100)
        if (comboCount > 0 && comboCount % 100 === 0) {
            goldenIce++;
            triggerComboFlash(10); // Особая вспышка
        }

        if (isGold) goldenIce++; // Прямое получение золотой ягоды

        let oldMult = comboMultiplier;
        if (comboCount >= 12) comboMultiplier = 5;
        else if (comboCount >= 8) comboMultiplier = 4;
        else if (comboCount >= 5) comboMultiplier = 3;
        else if (comboCount >= 2) comboMultiplier = 2;
        else comboMultiplier = 1;

        const ui = document.getElementById("combo-ui");
        if(comboMultiplier > 1) { 
            ui.innerText = "x" + comboMultiplier; 
            ui.classList.remove("hidden");
            if (comboMultiplier > oldMult) triggerComboFlash(comboMultiplier);
        }

        coins += comboMultiplier;
        xp += comboMultiplier;
        
        let nextXP = getNextLevelXP(level);
        if (xp >= nextXP) {
            xp -= nextXP;
            level++;
        }

        updateScore(); 
        spawnObstacle();
    } else if (obs.dataset.type === "bad") {
        if (shieldActive) {
            createCubeBoom(centerX, centerY); 
            shieldActive = false; 
            p.classList.remove("shield-aura");
            obstacleY = window.innerHeight + 500; 
            spawnObstacle();
            updateBonusUI();
        } else {
            createCubeBoom(centerX, centerY); 
            gameOver();
        }
    }
}

function updateScore() {
    const hud = document.getElementById("hud");
    if(hud) {
        hud.innerHTML = `
            <div class="hud-item">Lvl ${level}</div>
            <div class="hud-item">${getIceIcon()} ${coins}</div>
            <div class="hud-item">${getGoldIcon()} ${goldenIce}</div>
        `;
    }
}

function gameOver() {
    gameRunning = false;
    totalCoins += coins;
    if (coins > best) best = coins;
    saveUserData();
    
    document.getElementById("gameOverScreen").classList.remove("hidden");
    document.getElementById("final-score").innerText = coins; 

    // Показываем кнопку воскрешения, если есть золото и еще не использовали
    const reviveBtn = document.getElementById("revive-btn");
    if (reviveBtn) {
        reviveBtn.style.display = (!usedReviveThisRun && goldenIce > 0) ? "block" : "none";
    }
}

// ФУНКЦИЯ ВТОРОГО ШАНСА
function tryRevive() {
    if (!usedReviveThisRun && goldenIce > 0) {
        goldenIce--;
        usedReviveThisRun = true;
        document.getElementById("gameOverScreen").classList.add("hidden");
        gameRunning = true;
        // Даем 2 секунды неуязвимости
        shieldActive = true;
        document.getElementById("player").classList.add("shield-aura");
        obstacleY = -200; 
        spawnObstacle();
        updateScore();
        update();
    }
}

// КОНВЕРТАЦИЯ ВАЛЮТЫ
function convertIceToGold() {
    if (totalCoins >= PRICES.goldenConvert) {
        totalCoins -= PRICES.goldenConvert;
        goldenIce += 1;
        saveUserData();
        updateMenuInfo();
        alert("Обмен завершен! +1 Золотая ягода.");
    } else {
        alert("Нужно 5000 мороженого!");
    }
}

// ПОКУПКА VIP УЛУЧШЕНИЙ
function buyVipItem(type) {
    if (type === 'skin') {
        if (goldenIce >= VIP_PRICES.skin && !hasVipSkin) {
            goldenIce -= VIP_PRICES.skin;
            hasVipSkin = true;
            alert("Скин куплен! Магнит усилен на 10% навсегда.");
        } else if (hasVipSkin) alert("Уже куплено!");
    } else if (type === 'slot') {
        if (goldenIce >= VIP_PRICES.slot) {
            goldenIce -= VIP_PRICES.slot;
            extraShieldSlots++;
            alert("Теперь вы можете нести больше щитов!");
        }
    }
    saveUserData();
    updateMenuInfo();
}

function buyItem(type) {
    // Проверка на лимит щитов (базово 1 + улучшения)
    if (type === 'shield' && inventory.shield >= (1 + extraShieldSlots)) {
        return alert("Нет места для щита! Улучши ячейки в VIP магазине.");
    }

    if (totalCoins >= PRICES[type]) {
        totalCoins -= PRICES[type]; inventory[type]++;
        saveUserData(); updateMenuInfo();
    } else alert("Недостаточно мороженого!");
}

function useShield() {
    if (inventory.shield > 0 && !shieldActive && gameRunning) {
        inventory.shield--; shieldActive = true;
        document.getElementById("player").classList.add("shield-aura");
        updateBonusUI();
    }
}

function useMagnet() {
    if (inventory.magnet > 0 && !magnetActive && gameRunning) {
        inventory.magnet--; magnetActive = true;
        document.getElementById("player").classList.add("magnet-aura");
        updateBonusUI();
        setTimeout(() => { 
            magnetActive = false; 
            if(gameRunning) {
                document.getElementById("player").classList.remove("magnet-aura"); 
                updateBonusUI();
            }
        }, 10000);
    }
}

// Функции навигации без изменений...
function openBuffs() { 
    document.getElementById("menu").classList.add("hidden"); 
    document.getElementById("shop").classList.remove("hidden"); 
    startIceRain("shop"); 
    updateMenuInfo();
}

function closeShop() { 
    document.getElementById("shop").classList.add("hidden"); 
    document.getElementById("menu").classList.remove("hidden"); 
    startIceRain("menu"); 
}

function openShop() {
    // Здесь теперь можно открывать полноценный VIP магазин
    alert("VIP магазин доступен в разделе БАФФЫ (прокрутите вниз).");
}

function backToMenu() {
    gameRunning = false;
    if (loopId) cancelAnimationFrame(loopId);
    document.getElementById("gameOverScreen").classList.add("hidden");
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    startIceRain("menu"); 
    updateMenuInfo();
}

// Управление тачем...
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, {passive: true});
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 25) return;
    const p = document.getElementById("player");
    if (diff > 0) {
        targetLane = Math.min(3, targetLane + 1);
        p.style.transform = "translateX(-50%) rotate(15deg) scale(1.1)";
    } else {
        targetLane = Math.max(0, targetLane - 1);
        p.style.transform = "translateX(-50%) rotate(-15deg) scale(1.1)";
    }
    p.style.left = lanes[targetLane] + "%";
    setTimeout(() => { if(gameRunning) p.style.transform = "translateX(-50%) rotate(0deg) scale(1)"; }, 150);
});
