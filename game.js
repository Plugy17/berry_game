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

// --- 1. ПЕРЕМЕННЫЕ ИГРОКА (ОБЪЯВЛЯЕМ ТОЛЬКО ОДИН РАЗ) ---
let nick = localStorage.getItem("nick");
let userId = nick; // По умолчанию ID равен нику
let coins = 0;
let best = 0;
let totalCoins = 0;
let inventory = { magnet: 0, shield: 0 };
const PRICES = { magnet: 500, shield: 300 };

let shieldActive = false;
let magnetActive = false;
let comboCount = 0;
let comboMultiplier = 1;

// --- 2. ИНИЦИАЛИЗАЦИЯ TELEGRAM ---
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

// Получаем данные пользователя Telegram
const tgUser = tg?.initDataUnsafe?.user;
if (tgUser) {
    // Присваиваем значения БЕЗ слова let, так как они уже созданы выше
    nick = tgUser.username || tgUser.first_name; 
    userId = tgUser.id;
}

// --- 3. ОСТАЛЬНОЙ ФУНКЦИОНАЛ (БЕЗ ИЗМЕНЕНИЙ) ---
let rainInterval = null;
const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";
const getIceIcon = () => `<span class="ice-icon"></span>`;

function createRainDrop(containerId) {
    const container = document.getElementById(containerId);
    if (!container || container.classList.contains('hidden')) return;
    const drop = document.createElement("div");
    drop.className = "falling-ice-anim"; 
    drop.style.left = Math.random() * 95 + "vw";
    drop.style.backgroundImage = imgIceCream;
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

function createExplosion(x, y) {
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
        particle.style.backgroundImage = imgIceCream;
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

// --- FIREBASE ЛОГИКА ---
function loadUserData(id) {
    if (!window.db || !id) return updateMenuInfo();
    db.ref('players/' + id).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            best = data.best || 0;
            totalCoins = data.totalCoins || 0;
            inventory.shield = data.inventory?.shield || 0;
            inventory.magnet = data.inventory?.magnet || 0;
        } else {
            saveUserData();
        }
        updateMenuInfo();
    }).catch(() => updateMenuInfo());
}

function saveUserData() {
    if (!userId || !window.db) return;
    db.ref('players/' + userId).set({ 
        nick: nick, 
        best, 
        totalCoins, 
        inventory 
    });
}

window.onload = () => { 
    if(userId) loadUserData(userId); 
    else updateMenuInfo();
    startIceRain("menu"); 
};

function updateMenuInfo() {
    if (nick) {
        const welcomeElem = document.getElementById("welcome");
        if(welcomeElem) welcomeElem.innerHTML = `Герой <b>${nick}</b>`;
        const nickInput = document.getElementById("nick");
        if(nickInput) nickInput.style.display = "none";
    }
    const totalBal = document.getElementById("total-balance");
    if(totalBal) totalBal.innerHTML = `${totalCoins} ${getIceIcon()}`;
    const shopBalValue = document.getElementById("shop-balance");
    if(shopBalValue) shopBalValue.innerHTML = `${totalCoins} ${getIceIcon()}`;
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
        nick = val; 
        userId = val;
        localStorage.setItem("nick", nick);
    }
    stopIceRain();
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    resetGame();
}

function resetGame() {
    coins = 0; comboCount = 0; comboMultiplier = 1;
    shieldActive = false; magnetActive = false;
    targetLane = 1; speed = baseSpeed; gameRunning = true;
    const p = document.getElementById("player");
    p.className = ""; 
    p.style.left = lanes[targetLane] + "%";
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
    const isGood = Math.random() < 0.6;
    obs.dataset.type = isGood ? "good" : "bad";
    obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    obs.style.left = lanes[obstacleLane] + "%";
    obs.style.display = "block";
}

function update() {
    if (!gameRunning) return;
    obstacleY += speed;
    speed += difficulty;
    const obs = document.getElementById("obstacle");
    const p = document.getElementById("player");
    const playerTop = window.innerHeight * 0.75; 

    if (magnetActive && obs.dataset.type === "good") {
        let currentLeft = parseFloat(obs.style.left);
        let targetX = lanes[targetLane];
        let distY = playerTop - obstacleY;
        if (distY < 500 && distY > -30) {
            let newLeft = currentLeft + (targetX - currentLeft) * 0.25;
            obs.style.left = newLeft + "%";
        }
    }

    obs.style.top = obstacleY + "px";
    const catchRange = (magnetActive && obs.dataset.type === "good") ? 120 : 60;
    if (obstacleLane === targetLane && obstacleY > playerTop - catchRange && obstacleY < playerTop + catchRange) {
        handleCollision(obs, p);
    }
    if (obstacleY > window.innerHeight) spawnObstacle();
    if (gameRunning) loopId = requestAnimationFrame(update);
}

function handleCollision(obs, p) {
    const rect = obs.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (obs.dataset.type === "good") {
        createExplosion(centerX, centerY); 
        comboCount++;
        if (comboCount >= 12) comboMultiplier = 5;
        else if (comboCount >= 8) comboMultiplier = 4;
        else if (comboCount >= 5) comboMultiplier = 3;
        else if (comboCount >= 2) comboMultiplier = 2;
        else comboMultiplier = 1;
        coins += comboMultiplier; 
        updateScore(); 
        spawnObstacle();
    } else {
        if (shieldActive) {
            createCubeBoom(centerX, centerY); 
            shieldActive = false; 
            p.classList.remove("shield-aura");
            spawnObstacle();
        } else {
            gameOver();
        }
    }
}

function updateScore() {
    const hud = document.getElementById("hud");
    if(hud) hud.innerHTML = `${getIceIcon()} ${coins} | 🏆 ${best}`;
}

function gameOver() {
    gameRunning = false;
    totalCoins += coins;
    if (coins > best) best = coins;
    saveUserData();
    document.getElementById("gameOverScreen").classList.remove("hidden");
    document.getElementById("final-score").innerText = coins; 
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

let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, {passive: true});
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 25) return;
    const p = document.getElementById("player");
    if (diff > 0) targetLane = Math.min(3, targetLane + 1);
    else targetLane = Math.max(0, targetLane - 1);
    p.style.left = lanes[targetLane] + "%";
});

function buyItem(type) {
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
            document.getElementById("player").classList.remove("magnet-aura"); 
            updateBonusUI();
        }, 10000);
    }
}

function openShop() { 
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

// --- ИСПРАВЛЕННАЯ МЕХАНИКА КЛАВИАТУРЫ ---
document.addEventListener("keydown", (e) => {
    // Находим экран проигрыша
    const gameOverScreen = document.getElementById("gameOverScreen");
    const isGameOver = gameOverScreen && !gameOverScreen.classList.contains("hidden");

    // Если игра не запущена И мы не на экране проигрыша — ничего не делаем
    if (!gameRunning && !isGameOver) return;

    // Если нажата клавиша (A/D или стрелки)
    if (e.key === "ArrowLeft" || e.code === "KeyA" || e.key === "ArrowRight" || e.code === "KeyD") {
        
        // Если игрок нажал кнопку на экране GameOver — можем сразу запустить игру
        if (isGameOver) {
            startGame(); 
            return; 
        }

        const p = document.getElementById("player");
        if (!p) return;

        if (e.key === "ArrowLeft" || e.code === "KeyA") {
            targetLane = Math.max(0, targetLane - 1);
        } else {
            targetLane = Math.min(laneCount - 1, targetLane + 1);
        }

        p.style.left = lanes[targetLane] + "%";
    }
});
