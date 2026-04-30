/* --- КОНСТАНТЫ И НАСTРОЙКИ --- */
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

// --- ВАЛЮТА И ПРОГРЕСС ---
let goldenIce = 0; 
let diamonds = 0; 
let hasVipSkin = false; 
let extraShieldSlots = 0; 
let usedReviveThisRun = false; 

// УРОВНИ И ОПЫТ
let level = 1;
let xp = 0;
const getNextLevelXP = (lvl) => lvl * 100 + (lvl - 1) * 50; 

let inventory = { magnet: 0, shield: 0 };
const PRICES = { magnet: 500, shield: 300, goldenConvert: 5000 };
const VIP_PRICES = { skin: 10, slot: 5, diamond: 50000 };

let shieldActive = false;
let magnetActive = false;
let comboCount = 0;
let comboMultiplier = 1;

let rainInterval = null;

const imgIceCream = "url('assets/icecream.png')";
const imgGoldenIce = "url('assets/golden_ice.png')"; 
const imgBad = "url('assets/obstacle.png')";

// ПРАВКА: Иконки теперь возвращают пустые span (без текстовых эмодзи внутри), 
// чтобы CSS подставлял только картинки из assets.
const getIceIcon = () => `<span class="ice-icon"></span>`;
const getGoldIcon = () => `<span class="golden-ice-icon-small"></span>`;
const getDiamondIcon = () => `<span class="diamond-icon-small"></span>`;

// --- ЭФФЕКТ ПАДАЮЩИХ МОРОЖЕНЫХ ---
function createRainDrop(containerId) {
    const container = document.getElementById(containerId);
    if (!container || container.classList.contains('hidden')) return;

    const drop = document.createElement("div");
    const isGold = Math.random() < 0.1;
    drop.className = isGold ? "golden-drop" : "falling-ice-anim"; 
    drop.style.left = Math.random() * 95 + "vw";
    
    // ПРАВКА: Анимация теперь визуально начинается выше за счет настроек в CSS
    drop.style.backgroundImage = isGold ? imgGoldenIce : imgIceCream;
    
    const duration = Math.random() * 2 + 3; 
    drop.style.animationDuration = duration + "s";
    
    container.appendChild(drop);
    setTimeout(() => { if(drop.parentNode) drop.remove(); }, duration * 1000);
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
        if(isGold) particle.style.filter = "drop-shadow(0 0 10px #ffea00)";
        
        layer.appendChild(particle);
        setTimeout(() => { if(particle.parentNode) particle.remove(); }, 600);
    }
}

function createCubeBoom(x, y) {
    const layer = document.getElementById("effects-layer") || document.getElementById("game");
    if(!layer) return;
    
    const gameContainer = document.getElementById("game");
    if(gameContainer) {
        gameContainer.classList.add("shake-anim");
        setTimeout(() => gameContainer.classList.remove("shake-anim"), 300);
    }

    const boom = document.createElement('div');
    boom.className = 'cube-boom';
    boom.style.left = x + 'px';
    boom.style.top = y + 'px';
    layer.appendChild(boom);
    setTimeout(() => { if(boom.parentNode) boom.remove(); }, 500);
}

// --- FIREBASE ---
function loadUserData(playerNick) {
    if (!window.db) return updateMenuInfo();
    db.ref('players/' + playerNick).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            best = data.best || 0;
            totalCoins = data.totalCoins || 0;
            goldenIce = data.goldenIce || 0;
            diamonds = data.diamonds || 0; 
            level = data.level || 1;
            xp = data.xp || 0;
            inventory.shield = (data.inventory && data.inventory.shield) || 0;
            inventory.magnet = (data.inventory && data.inventory.magnet) || 0;
            hasVipSkin = data.hasVipSkin || false;
            extraShieldSlots = data.extraShieldSlots || 0;
        }
        updateMenuInfo();
    }).catch(() => updateMenuInfo());
}

function saveUserData() {
    if (!nick || !window.db) return;
    db.ref('players/' + nick).set({ 
        nick, best, totalCoins, goldenIce, diamonds, inventory, level, xp, hasVipSkin, extraShieldSlots
    });
}

window.onload = () => { 
    if(nick) loadUserData(nick); 
    else updateMenuInfo();
    startIceRain("menu"); 
};

// --- ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ---
function updateMenuInfo() {
    const shopBtn = document.getElementById("shop-btn-main");
    // ПРАВКА: Убран текстовый эмодзи алмаза, оставляем только текст.
    if(shopBtn) shopBtn.innerHTML = `МАГАЗИН`;

    if (nick) {
        const welcomeElem = document.getElementById("welcome");
        if(welcomeElem) welcomeElem.innerHTML = `ГЕРОЙ: <b>${nick.toUpperCase()}</b> [LVL ${level}]`;
        const nickInput = document.getElementById("nick");
        if(nickInput) nickInput.style.display = "none";
    }
    
    const menuLb = document.getElementById("menuLeaderboard");
    if(menuLb) menuLb.innerText = "🏆 РЕКОРД: " + best;

    const totalBal = document.getElementById("total-balance");
    if(totalBal) {
        // ПРАВКА: Используем функции get...Icon(), которые теперь возвращают пустые спаны.
        totalBal.innerHTML = `
            <div class="currency-row"><span>${totalCoins}</span> ${getIceIcon()}</div>
            <div class="currency-row gold-highlight" style="margin-top:5px"><span>${goldenIce}</span> ${getGoldIcon()}</div>
            <div class="currency-row" style="margin-top:5px; color:#00eaff"><span>${diamonds}</span> ${getDiamondIcon()}</div>
        `;
    }
    
    const shopBalValue = document.getElementById("shop-balance");
    if(shopBalValue) {
        shopBalValue.innerHTML = `<span>${totalCoins}</span> ${getIceIcon()} | <span>${goldenIce}</span> ${getGoldIcon()} | <span>${diamonds}</span> ${getDiamondIcon()}`;
    }

    const vipBalInfo = document.getElementById("vip-balance-info");
    if(vipBalInfo) {
        vipBalInfo.innerHTML = `Баланс: <span>${goldenIce}</span> ${getGoldIcon()} | <span>${diamonds}</span> ${getDiamondIcon()}`;
    }

    updateBonusUI();
}

function updateBonusUI() {
    const sCount = document.getElementById("count-shield");
    const mCount = document.getElementById("count-magnet");
    if(sCount) sCount.innerText = inventory.shield;
    if(mCount) mCount.innerText = inventory.magnet;
}

// --- ИГРОВОЙ ПРОЦЕСС ---
function startGame() {
    if (!nick) {
        const nickInput = document.getElementById("nick");
        const val = nickInput ? nickInput.value.trim() : "";
        if (val.length < 2) return alert("Введи имя!");
        nick = val; localStorage.setItem("nick", nick);
    }
    stopIceRain(); 
    document.getElementById("gameOverScreen").classList.add("hidden");
    const modeSelect = document.getElementById("difficulty");
    const mode = modeSelect ? modeSelect.value : "normal";
    baseSpeed = mode === "easy" ? 5 : mode === "hard" ? 9 : 7;
    difficulty = mode === "easy" ? 0.001 : mode === "hard" ? 0.003 : 0.002;
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    resetGame();
}

function resetGame() {
    coins = 0; comboCount = 0; comboMultiplier = 1;
    shieldActive = false; magnetActive = false;
    usedReviveThisRun = false;
    targetLane = 1; speed = baseSpeed; gameRunning = true;
    
    const p = document.getElementById("player");
    p.className = ""; 
    p.style.filter = "none"; 
    if(hasVipSkin) p.classList.add("skin-ice"); 
    
    p.style.left = lanes[targetLane] + "%";
    p.style.transform = "translateX(-50%) rotate(0deg)"; 
    const comboUi = document.getElementById("combo-ui");
    if(comboUi) comboUi.classList.add("hidden");
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

    const modeSelect = document.getElementById("difficulty");
    const mode = modeSelect ? modeSelect.value : "normal";
    const rand = Math.random();
    
    if (mode === "hard" && rand < 0.05) {
        obs.dataset.type = "golden";
        obs.style.backgroundImage = imgGoldenIce;
    } else {
        const isGood = rand < 0.6;
        obs.dataset.type = isGood ? "good" : "bad";
        obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    }

    obs.style.display = "block";
}

function update() {
    if (!gameRunning) return;
    obstacleY += speed;
    speed += difficulty;
    
    const obs = document.getElementById("obstacle");
    const p = document.getElementById("player");
    if(!obs || !p) return;

    const playerTop = window.innerHeight * 0.75; 

    let currentX = parseFloat(p.style.left) || lanes[targetLane];
    let targetX = lanes[targetLane];
    
    let newX = currentX + (targetX - currentX) * 0.15;
    p.style.left = newX + "%";
    
    let tilt = (targetX - currentX) * 2.5; 
    p.style.transform = `translateX(-50%) rotate(${tilt}deg)`;

    const isPullable = obs.dataset.type === "good" || obs.dataset.type === "golden";
    
    if (magnetActive && isPullable) {
        let currentLeft = parseFloat(obs.style.left);
        let magnetPower = hasVipSkin ? 0.35 : 0.25;
        let newLeft = currentLeft + (newX - currentLeft) * magnetPower;
        obs.style.left = newLeft + "%";
    }
    
    obs.style.top = obstacleY + "px";
    
    let obsX = parseFloat(obs.style.left);
    if (Math.abs(newX - obsX) < 10 && obstacleY > playerTop - 60 && obstacleY < playerTop + 60) {
        handleCollision(obs, p);
    }
    
    if (obstacleY > window.innerHeight) {
        if (isPullable) { 
            comboCount = 0; comboMultiplier = 1; 
            const cui = document.getElementById("combo-ui");
            if(cui) cui.classList.add("hidden"); 
            if(!magnetActive) p.style.filter = hasVipSkin ? "hue-rotate(180deg) brightness(1.2)" : "none";
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
        
        p.style.transition = "none";
        p.style.transform = "translateX(-50%) scale(1.3)";
        setTimeout(() => { 
            if(gameRunning) p.style.transform = "translateX(-50%) scale(1)"; 
        }, 100);

        comboCount++;
        if (comboCount % 100 === 0) goldenIce++;
        if (isGold) goldenIce++;

        comboMultiplier = comboCount >= 12 ? 5 : comboCount >= 8 ? 4 : comboCount >= 5 ? 3 : comboCount >= 2 ? 2 : 1;

        const ui = document.getElementById("combo-ui");
        if(ui && comboMultiplier > 1) { 
            ui.innerText = "x" + comboMultiplier; 
            ui.classList.remove("hidden");
            ui.style.animation = 'none';
            ui.offsetHeight; 
            ui.style.animation = 'comboPop 0.3s ease-out';
            
            if(comboMultiplier >= 5) p.style.filter = "brightness(1.5) drop-shadow(0 0 10px #fff)";
        }

        coins += comboMultiplier;
        xp += comboMultiplier;
        
        let nextXP = getNextLevelXP(level);
        if (xp >= nextXP) { xp -= nextXP; level++; }

        updateScore(); 
        spawnObstacle();
    } else {
        if (shieldActive) {
            createCubeBoom(centerX, centerY); 
            shieldActive = false; 
            p.classList.remove("shield-aura");
            if(!magnetActive) p.style.filter = hasVipSkin ? "hue-rotate(180deg) brightness(1.2)" : "none";
            spawnObstacle();
        } else {
            createCubeBoom(centerX, centerY); 
            gameOver();
        }
    }
}

function updateScore() {
    const hud = document.getElementById("hud");
    if(hud) {
        // ПРАВКА: Убраны текстовые эмодзи, используем графические функции.
        hud.innerHTML = `
            <div class="currency-row">LVL ${level}</div>
            <div class="currency-row"><span>${coins}</span> ${getIceIcon()}</div>
            <div class="currency-row" style="color:#00eaff"><span>${diamonds}</span> ${getDiamondIcon()}</div>
        `;
    }
}

function gameOver() {
    gameRunning = false;
    if (loopId) cancelAnimationFrame(loopId); 
    
    totalCoins += coins;
    if (coins > best) best = coins;
    saveUserData();

    const p = document.getElementById("player");
    if(p) {
        p.classList.remove("shield-aura", "magnet-aura");
        p.style.filter = "none";
    }
    
    const goScreen = document.getElementById("gameOverScreen");
    if(goScreen) {
        goScreen.classList.remove("hidden");
        const finalScoreElem = document.getElementById("final-score");
        if(finalScoreElem) finalScoreElem.innerText = coins; 
    }
    
    const revBtn = document.getElementById("revive-btn");
    if(revBtn) revBtn.style.display = (!usedReviveThisRun && diamonds > 0) ? "block" : "none";
}

function revivePlayer() {
    if (diamonds > 0 && !usedReviveThisRun) {
        diamonds--;
        usedReviveThisRun = true;
        document.getElementById("gameOverScreen").classList.add("hidden");
        
        shieldActive = true;
        const p = document.getElementById("player");
        if(p) {
            p.classList.add("shield-aura");
            p.style.filter = "drop-shadow(0 0 15px #00eaff)";
        }
        
        gameRunning = true;
        spawnObstacle();
        update();
        updateScore();
        saveUserData();
    }
}

// --- МАГАЗИН И ДИЛЕРЫ ---
function convertIceToGold() {
    if (totalCoins >= 5000) {
        totalCoins -= 5000; goldenIce++;
        saveUserData(); updateMenuInfo();
        alert("Золотой дилер: Обмен успешен! +1 Золотое мороженое");
    } else alert("Нужно 5000 мороженого для обмена!");
}

function buyDiamond() {
    if (totalCoins >= VIP_PRICES.diamond) {
        totalCoins -= VIP_PRICES.diamond;
        diamonds++;
        saveUserData(); updateMenuInfo();
        alert("Алмазный дилер: Алмаз приобретен!");
    } else alert("Нужно 50,000 мороженого для покупки алмаза!");
}

function buyVipItem(type) {
    if (type === 'skin') {
        if (goldenIce >= 10 && !hasVipSkin) {
            goldenIce -= 10; hasVipSkin = true;
            saveUserData(); updateMenuInfo();
            alert("VIP Магазин: Скин разблокирован!");
        } else if(hasVipSkin) {
            alert("Скин уже куплен!");
        } else alert("Недостаточно Золотого мороженого!");
    } 
    
    if (type === 'slot') {
        if (goldenIce >= 5) {
            goldenIce -= 5; 
            extraShieldSlots++;
            saveUserData(); updateMenuInfo();
            alert("VIP Магазин: Слот добавлен! Текущий лимит: " + (1 + extraShieldSlots));
        } else alert("Недостаточно Золотого мороженого!");
    }
}

function buyItem(type) {
    let limit = 1 + extraShieldSlots;
    if (inventory[type] >= limit) return alert("Слоты переполнены! Купите '+1 СЛОТ' в Магазине.");
    
    if (totalCoins >= PRICES[type]) {
        totalCoins -= PRICES[type]; inventory[type]++;
        saveUserData(); updateMenuInfo();
    } else alert("Недостаточно обычного мороженого!"); 
}

function useShield() {
    if (inventory.shield > 0 && !shieldActive && gameRunning) {
        inventory.shield--; shieldActive = true;
        const p = document.getElementById("player");
        if(p) {
            p.classList.add("shield-aura");
            p.style.filter = "drop-shadow(0 0 15px #00eaff)";
        }
        updateBonusUI();
    }
}

function useMagnet() {
    if (inventory.magnet > 0 && !magnetActive && gameRunning) {
        inventory.magnet--; magnetActive = true;
        const p = document.getElementById("player");
        if(p) {
            p.classList.add("magnet-aura");
            p.style.filter = "drop-shadow(0 0 15px cyan)";
        }
        updateBonusUI();
        setTimeout(() => {
            magnetActive = false;
            const pNow = document.getElementById("player");
            if(pNow) {
                pNow.classList.remove("magnet-aura");
                if(!shieldActive) pNow.style.filter = hasVipSkin ? "hue-rotate(180deg) brightness(1.2)" : "none";
                else pNow.style.filter = "drop-shadow(0 0 15px #00eaff)";
            }
        }, 10000);
    }
}

function openLeaderboard() {
    const lbScreen = document.getElementById("leaderboardScreen");
    const list = document.getElementById("leaderboard-list");
    if(!lbScreen || !list) return;
    lbScreen.classList.remove("hidden");
    document.getElementById("menu").classList.add("hidden");
    list.innerHTML = "<div class='loading'>Загрузка...</div>";

    if(window.db) {
        db.ref('players').orderByChild('level').limitToLast(10).once('value', (snap) => {
            list.innerHTML = "";
            let players = [];
            snap.forEach(child => { players.push(child.val()); });
            players.reverse().forEach((p, index) => {
                list.innerHTML += `
                <div class="leaderboard-item">
                    <span>${index+1}. ${p.nick}</span>
                    <span style="color: #ffeb3b; font-weight: bold;">LVL ${p.level || 1}</span>
                </div>`;
            });
        });
    }
}

function closeLeaderboard() {
    document.getElementById("leaderboardScreen").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}

function openBuffs() { 
    document.getElementById("menu").classList.add("hidden"); 
    document.getElementById("shop").classList.remove("hidden"); 
    updateMenuInfo();
}

function closeShop() { 
    document.getElementById("shop").classList.add("hidden"); 
    document.getElementById("menu").classList.remove("hidden"); 
}

function backToMenu() {
    gameRunning = false;
    if (loopId) cancelAnimationFrame(loopId); 
    
    const layer = document.getElementById("effects-layer") || document.getElementById("game");
    if(layer) {
        const particles = layer.querySelectorAll('.ice-particle, .cube-boom');
        particles.forEach(p => p.remove());
    }

    document.getElementById("gameOverScreen").classList.add("hidden");
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    updateMenuInfo();
    startIceRain("menu");
}

/* УПРАВЛЕНИЕ */
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, {passive: true});
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 25) return;
    if (diff > 0) targetLane = Math.min(3, targetLane + 1);
    else targetLane = Math.max(0, targetLane - 1);
});

document.addEventListener("keydown", e => {
    if (!gameRunning) return;
    if (e.key === "ArrowLeft" || e.key === "a") targetLane = Math.max(0, targetLane - 1);
    if (e.key === "ArrowRight" || e.key === "d") targetLane = Math.min(3, targetLane + 1);
    if (e.key === "1") useShield();
    if (e.key === "2") useMagnet();
});
