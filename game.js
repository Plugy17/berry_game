// ========================================================
// 1. ГЛОБАЛЬНОЕ СОСТОЯНИЕ (Единый источник правды)
// ========================================================
window.gameState = {
    currentSkin: localStorage.getItem('activeSkin') || "default",
    inventory: {
        skins: JSON.parse(localStorage.getItem('boughtSkins')) || ["default"],
        items: { 
            magnet: Number(localStorage.getItem('magnetCount')) || 0, 
            shield: Number(localStorage.getItem('shieldCount')) || 0, 
            diamonds: Number(localStorage.getItem('totalDiamonds')) || 0 
        }
    }
};

// ========================================================
// 2. МОСТИКИ ДЛЯ СОВМЕСТИМОСТИ
// ========================================================
// Теперь эти переменные ссылаются напрямую в gameState
currentSkin = gameState.currentSkin; 
inventory = {
    get magnet() { return gameState.inventory.items.magnet; },
    set magnet(val) { gameState.inventory.items.magnet = val; },
    get shield() { return gameState.inventory.items.shield; },
    set shield(val) { gameState.inventory.items.shield = val; },
    get skins() { return gameState.inventory.skins; },
    set skins(val) { gameState.inventory.skins = val; }
};

// ========================================================
// 3. КОНФИГУРАЦИЯ СКИНОВ И ПРЕДЗАГРУЗКА
// ========================================================
const skins = [
    { id: "default", name: "Берри", img: "assets/berry.png" },
    { id: "star", name: "Звездный", img: "assets/berry2.png" },
    { id: "pirate", name: "Пират", img: "assets/berry3.png" },
    { id: "silver", name: "Силвер", img: "assets/berry4.png" }
];

const loadedSkins = {};
skins.forEach(skin => {
    const img = new Image();
    img.src = skin.img;
    img.onload = () => { loadedSkins[skin.id] = img; };
    img.onerror = () => console.error(`Ошибка загрузки: ${skin.img}`);
});

// ========================================================
// 4. ПЕРЕМЕННЫЕ ИГРЫ
// ========================================================
let totalDiamonds = gameState.inventory.items.diamonds; 
let diamonds = 0; 
let coins = 0;
let best = Number(localStorage.getItem('highScore')) || 0;
let totalCoins = 0;

// Синхронизируем активный скин
activeSkin = gameState.currentSkin;

const soundCollect = new Audio('assets/collect.mp3');
if (soundCollect) soundCollect.volume = 0.3;

let laneCount = 4;
let lanes = [12.5, 37.5, 62.5, 87.5]; 
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -150; 
let loopId = null;
let speed = 7;
let baseSpeed = 7;
let isPaused = false;
let difficulty = 0.002;

let nick = localStorage.getItem("nick") || "Guest";
let userId = localStorage.getItem("userId") || "0"; 

const PRICES = { magnet: 500, shield: 300 };

let shieldActive = false;
let magnetActive = false;
let comboCount = 0;
let comboMultiplier = 1;

// ========================================================
// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ОТРИСОВКИ
// ========================================================
function drawPlayer() {
    const p = document.getElementById("player");
    if (!p) return;

    const skinId = gameState.currentSkin; 
    const skinData = skins.find(s => s.id === skinId);
    
    if (skinData) {
        p.style.backgroundImage = `url(${skinData.img})`;
        p.style.backgroundSize = "contain";
        p.style.backgroundRepeat = "no-repeat";
    }
}

let currentSkinIndex = skins.findIndex(s => s.id === activeSkin);
if (currentSkinIndex === -1) currentSkinIndex = 0;

function updateSkinUI() {
    const skin = skins[currentSkinIndex];
    const preview = document.getElementById("skinPreview");
    const nameLabel = document.getElementById("skinName");
    const selectBtn = document.getElementById("selectSkinBtn");

    if (preview) preview.style.backgroundImage = `url('${skin.img}')`;
    if (nameLabel) nameLabel.innerText = skin.name;

    if (activeSkin === skin.id) {
        selectBtn.innerText = "ВЫБРАНО";
        selectBtn.classList.add("active");
    } else {
        const isOwned = skin.id === "default" || (gameState.inventory.skins.includes(skin.id));
        if (isOwned) {
            selectBtn.innerText = "ВЫБРАТЬ";
            selectBtn.classList.remove("active");
            selectBtn.style.opacity = "1";
        } else {
            selectBtn.innerText = "КУПИТЬ";
            selectBtn.classList.remove("active");
            selectBtn.style.opacity = "0.5";
        }
    }
}

document.getElementById("selectSkinBtn").onclick = () => {
    const skin = skins[currentSkinIndex];
    const isOwned = skin.id === "default" || (gameState.inventory.skins.includes(skin.id));

    if (isOwned) {
        activeSkin = skin.id;
        gameState.currentSkin = skin.id;
        currentSkin = skin.id;
        localStorage.setItem("activeSkin", skin.id);
        updateSkinUI();
        drawPlayer();
    } else {
        if (typeof openShop === 'function') openShop();
    }
};

document.getElementById("nextSkin").onclick = () => {
    currentSkinIndex = (currentSkinIndex + 1) % skins.length;
    updateSkinUI();
};
document.getElementById("prevSkin").onclick = () => {
    currentSkinIndex = (currentSkinIndex - 1 + skins.length) % skins.length;
    updateSkinUI();
};

function initAudio() {
    soundCollect.play().then(() => {
        soundCollect.pause();
        soundCollect.currentTime = 0;
    }).catch(e => console.log("Audio waiting for user tap"));
}

function togglePause() {
    if (!gameRunning) return; 

    isPaused = !isPaused;
    const pauseIcon = document.getElementById("pauseIcon");

    if (isPaused) {
        if (pauseIcon) pauseIcon.src = "assets/play.png"; 
        cancelAnimationFrame(loopId);
        stopIceRain();
    } else {
        if (pauseIcon) pauseIcon.src = "assets/pause.png";
        requestAnimationFrame(update);
        if (gameRunning) startIceRain('game-container'); // Укажите ваш ID контейнера
    }
}

// --- 2. ИНИЦИАЛИЗАЦИЯ TELEGRAM ---
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
    const tgUser = tg.initDataUnsafe?.user;
    if (tgUser) {
        nick = tgUser.username || tgUser.first_name; 
        userId = tgUser.id;
    }
}

// --- 3. ОСТАЛЬНОЙ ФУНКЦИОНАЛ ---
let rainInterval = null;
const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";

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
    setTimeout(() => { if(drop.parentNode) drop.remove(); }, duration * 1000);
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
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement("div");
        particle.className = "ice-particle";
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 120; 
        particle.style.setProperty('--dx', Math.cos(angle) * dist + "px");
        particle.style.setProperty('--dy', Math.sin(angle) * dist + "px");
        particle.style.left = x + "px";
        particle.style.top = y + "px";
        particle.style.backgroundImage = imgIceCream;
        layer.appendChild(particle);
        setTimeout(() => particle.remove(), 600);
    }
}

function createCubeBoom(x, y) {
    const layer = document.getElementById("effects-layer") || document.getElementById("game");
    if (!layer) return;
    const boom = document.createElement('div');
    boom.className = 'cube-boom';
    boom.style.left = x + 'px';
    boom.style.top = y + 'px';
    layer.appendChild(boom);
    setTimeout(() => { if(boom.parentNode) boom.remove(); }, 500);
}

function loadUserData(id) {
    const loader = document.getElementById("loading-screen");
    
    // ГАРАНТИЯ: Скрываем загрузчик через 3.5 секунды в любом случае
    const forceCloseLoader = setTimeout(() => {
        if (loader && !loader.classList.contains("hidden")) {
            loader.classList.add("hidden");
            console.warn("Загрузка форсирована по таймауту (Firebase не ответил вовремя)");
        }
    }, 3500);

    if (!window.db || !id) {
        clearTimeout(forceCloseLoader);
        if (loader) loader.classList.add("hidden");
        return updateMenuInfo();
    }
    
    const userRef = db.ref('players/' + id);
    userRef.once('value').then((snapshot) => {
        // Если данные пришли, отменяем экстренный таймаут
        clearTimeout(forceCloseLoader);

        if (snapshot.exists()) {
            const data = snapshot.val();
            
            best = Number(data.best) || 0;
            totalCoins = Number(data.totalCoins) || 0;
            totalDiamonds = Number(data.totalDiamonds) || 0; 
            
            gameState.currentSkin = data.currentSkin || "default";
            activeSkin = gameState.currentSkin;
            currentSkin = gameState.currentSkin;

            if (data.inventory) {
                gameState.inventory.items.shield = Number(data.inventory.shield) || 0;
                gameState.inventory.items.magnet = Number(data.inventory.magnet) || 0;
                gameState.inventory.items.diamonds = totalDiamonds;
                gameState.inventory.skins = data.inventory.skins || ["default"];
                
                inventory.shield = gameState.inventory.items.shield;
                inventory.magnet = gameState.inventory.items.magnet;
                inventory.skins = gameState.inventory.skins;
            }
            
            if (typeof updateSkinUI === "function") updateSkinUI(); 
        } else {
            saveUserData();
        }

        updateMenuInfo();
        if (loader) loader.classList.add("hidden"); 

    }).catch((err) => {
        clearTimeout(forceCloseLoader);
        console.error("Ошибка Firebase:", err);
        updateMenuInfo();
        if (loader) loader.classList.add("hidden");
    });
}

function saveUserData() {
    if (!userId || !window.db) return;
    
    // Сохраняем расширенный объект для надежности
    db.ref('players/' + userId).set({ 
        nick: nick, 
        best: best, 
        totalCoins: totalCoins, 
        totalDiamonds: totalDiamonds,
        inventory: {
            shield: gameState.inventory.items.shield,
            magnet: gameState.inventory.items.magnet,
            skins: gameState.inventory.skins
        },
        currentSkin: activeSkin
    }).then(() => console.log("Данные сохранены")).catch(e => console.error("Ошибка сохранения:", e));
}

function updateMenuInfo() {
    if (nick) {
        const welcomeElem = document.getElementById("welcome");
        if(welcomeElem) welcomeElem.innerHTML = `Герой <b>${nick}</b>`;
        const nickInput = document.getElementById("nick");
        if(nickInput) nickInput.style.display = "none";
    }

    const iceIcon = `<span class="ice-icon"></span>`;
    const diamondIcon = `<span class="diamond-icon"></span>`;

    // 2. ОБНОВЛЯЕМ МОРОЖЕНОЕ
    const menuCoins = document.getElementById("menuCoinCount");
    const shopCoins = document.getElementById("shop-balance");
    if(menuCoins) menuCoins.innerHTML = `${totalCoins} ${iceIcon}`;
    if(shopCoins) shopCoins.innerHTML = `${totalCoins} ${iceIcon}`;

    // 3. ОБНОВЛЯЕМ АЛМАЗЫ
    const menuDiamonds = document.getElementById("menuDiamondCount");
    const shopDiamonds = document.getElementById("shop-diamonds");
    const hudDiamonds = document.getElementById("diamondCount");

    if(menuDiamonds) menuDiamonds.innerHTML = `${totalDiamonds} ${diamondIcon}`;
    if(shopDiamonds) shopDiamonds.innerHTML = `${totalDiamonds} ${diamondIcon}`;
    if(hudDiamonds) hudDiamonds.innerHTML = `${totalDiamonds} ${diamondIcon}`;

    // 4. ОБНОВЛЯЕМ РЕКОРД
    const menuBest = document.getElementById("menuLeaderboard");
    if(menuBest) menuBest.innerText = `🏆 ${best}`;

    updateBonusUI();
}

function updateBonusUI() {
    const sCount = document.getElementById("count-shield");
    const mCount = document.getElementById("count-magnet");
    if(sCount) sCount.innerText = gameState.inventory.items.shield;
    if(mCount) mCount.innerText = gameState.inventory.items.magnet;
}

function buyStarSkin() {
    const price = 100;
    if (gameState.inventory.skins.includes("star")) {
        alert("Этот скин уже куплен!");
        return;
    }

    if (totalDiamonds >= price) {
        totalDiamonds -= price;
        gameState.inventory.items.diamonds = totalDiamonds;
        gameState.inventory.skins.push("star");
        activeSkin = "star";
        gameState.currentSkin = "star";
        
        saveUserData();
        updateMenuInfo();
        updateSkinUI();
        alert("Звездный Берри теперь твой!");
    } else {
        alert("Недостаточно алмазов!");
    }
}

function exchangeIceToDiamond() {
    if (totalCoins >= 1000) {
        totalCoins -= 1000;
        totalDiamonds += 10;
        gameState.inventory.items.diamonds = totalDiamonds;
        saveUserData();
        updateMenuInfo();
    } else {
        alert("Нужно 1000 мороженого!");
    }
}

function startGame() {
    const diffSelect = document.getElementById("difficulty");
    const level = diffSelect ? diffSelect.value : 'medium';
    const p = document.getElementById("player");

    if (!nick) {
        const val = document.getElementById("nick")?.value.trim();
        if (!val || val.length < 2) return alert("Введи имя!");
        nick = val; userId = val;
        localStorage.setItem("nick", nick);
    }

    gameState.currentSkin = activeSkin; 
    if (p) {
        drawPlayer(); 
        p.className = ""; 
        p.id = "player";
        if (activeSkin !== "default") {
            p.classList.add(`skin-${activeSkin}`);
            p.classList.add(`skin-${activeSkin}-aura`);
        }
    }

    let spawnRate = 1000;
    if (level === 'easy') {
        baseSpeed = 6; difficulty = 0.001; spawnRate = 1200;
    } else if (level === 'medium') {
        baseSpeed = 7; difficulty = 0.002; spawnRate = 1000;
    } else if (level === 'hard') {
        baseSpeed = 11; difficulty = 0.005; spawnRate = 600;
    }
    speed = baseSpeed;

    document.querySelectorAll(".obstacle").forEach(obs => obs.remove()); 
    
    // Очистка всех старых интервалов
    if (window.gameInterval) clearInterval(window.gameInterval); 

    gameRunning = true; 
    isPaused = false;

    window.gameInterval = setInterval(() => {
        if (gameRunning && !isPaused) spawnObstacle(); 
    }, spawnRate);

    if (loopId) cancelAnimationFrame(loopId);
    loopId = requestAnimationFrame(update);

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    
    const ls = document.getElementById("loading-screen") || document.getElementById("loadingScreen");
    if (ls) ls.style.display = "none";

    if (typeof resetGame === 'function') resetGame();
    console.log("Старт:", level, "| Скин:", gameState.currentSkin);
}

// 2. ИСПРАВЛЕННЫЙ БЛОК СБРОСА ИГРЫ
function resetGame() {
    // --- 1. Сброс игровых механик ---
    score = 0; // Сбрасываем текущий счет
    coins = 0; 
    comboCount = 0; 
    comboMultiplier = 1;
    shieldActive = false; 
    magnetActive = false;
    targetLane = 1; 
    speed = baseSpeed;
    gameRunning = true;
    
    // Сброс уникальных способностей скинов
    if (typeof pirateShieldUsed !== 'undefined') pirateShieldUsed = false; 
    if (typeof silverTimer !== 'undefined' && silverTimer) {
        clearTimeout(silverTimer);
        silverTimer = null;
    }

    // --- 2. ЖЕСТКАЯ ПРИВЯЗКА ВИЗУАЛА К ВЫБРАННОМУ СКИНУ ---
    const p = document.getElementById("player");
    if (p) {
        p.className = "player-base"; 
        p.style.filter = "none";
        
        // Находим данные активного скина
        const activeSkinData = skins.find(s => s.id === activeSkin) || skins[0];
        
        p.style.backgroundImage = `url('${activeSkinData.img}')`;
        p.style.backgroundSize = "contain";
        p.style.backgroundRepeat = "no-repeat";

        // Добавляем класс ауры
        if (activeSkin !== "default") {
            p.classList.add(`skin-${activeSkin}-aura`);
        }
        
        // Начальная позиция
        p.style.left = lanes[targetLane] + "%";
        p.style.top = ""; // Сбрасываем возможные смещения
    }

    // --- 3. Обновление интерфейса и старт ---
    if (typeof updateScore === 'function') updateScore(); 
    if (typeof updateBonusUI === 'function') updateBonusUI();
    
    if (loopId) cancelAnimationFrame(loopId);
    
    // Очищаем старые объекты с поля
    document.querySelectorAll(".obstacle").forEach(obs => obs.remove());
    
    // Запускаем первый объект вручную (необязательно, но для старта полезно)
    spawnObstacle();
    loopId = requestAnimationFrame(update);
}

function spawnObstacle() {
    if (!gameRunning || (typeof isPaused !== 'undefined' && isPaused)) return;

    const gameLayer = document.getElementById("game");
    if (!gameLayer) return;

    const diffSelect = document.getElementById("difficulty");
    const level = diffSelect ? diffSelect.value : 'medium';

    const currentCount = document.querySelectorAll(".obstacle").length;
    let maxItems = 5; 
    if (level === 'easy') maxItems = 4; 
    if (level === 'hard') maxItems = 7; 
    
    if (currentCount >= maxItems) return;

    const obs = document.createElement("div");
    obs.className = "obstacle"; 

    const rand = Math.random();

    if (rand < 0.03) { 
        // 3% шанс на Алмаз
        obs.dataset.type = "gift_purple";
        obs.style.backgroundImage = "url('assets/purple.png')";
        obs.classList.add("gift-purple-anim");
    } 
    else if (rand < 0.10) { 
        // 7% шанс на Штраф
        obs.dataset.type = "gift_black";
        obs.style.backgroundImage = "url('assets/black.png')";
    } 
    else {
        // Обычные объекты
        const isGood = Math.random() < (level === 'hard' ? 0.45 : 0.65);
        obs.dataset.type = isGood ? "good" : "bad";
        obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    }

    const laneIndex = Math.floor(Math.random() * lanes.length);
    obs.style.left = lanes[laneIndex] + "%";
    obs.style.top = "-100px"; 

    gameLayer.appendChild(obs);
}

function update() {
    if (!gameRunning || (typeof isPaused !== 'undefined' && isPaused)) return;

    const p = document.getElementById("player");
    if (!p) return;

    const pRect = p.getBoundingClientRect(); 

    // ЭФФЕКТ ШЛЕЙФА
    if (Math.random() < 0.2) { 
        const gameLayer = document.getElementById("game");
        if (gameLayer) {
            const part = document.createElement("div");
            part.className = "speed-particle";
            part.style.left = (pRect.left + pRect.width / 2) + "px";
            part.style.top = (pRect.top + pRect.height - 10) + "px";
            const pdx = (Math.random() - 0.5) * 40 + "px";
            part.style.setProperty('--pdx', pdx);
            gameLayer.appendChild(part);
            setTimeout(() => { if(part.parentNode) part.remove(); }, 300); 
        }
    }

    const obstacles = document.querySelectorAll(".obstacle");

    obstacles.forEach(obstacle => {
        // Защита от двойного сбора
        if (obstacle.dataset.collected === "true" || obstacle.dataset.processing === "true") return; 

        let currentTop = parseFloat(obstacle.style.top) || -150;

        // МАГНИТ (только для "good")
        if (typeof magnetActive !== 'undefined' && magnetActive && obstacle.dataset.type === "good") {
            const obsRect = obstacle.getBoundingClientRect();
            const pX = pRect.left + pRect.width / 2;
            const pY = pRect.top + pRect.height / 2;
            const oX = obsRect.left + obsRect.width / 2;
            const oY = obsRect.top + obsRect.height / 2;
            const dx = pX - oX;
            const dy = pY - oY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 400) {
                const force = 12; // Чуть усилил магнит
                if (obstacle.style.left.includes('%')) {
                    obstacle.style.left = obsRect.left + "px";
                }
                const newLeft = (parseFloat(obstacle.style.left) || 0) + (dx / distance) * force;
                obstacle.style.left = newLeft + "px";
                currentTop += (dy / distance) * force;
            }
        }

        currentTop += speed;
        obstacle.style.top = currentTop + "px";

        // Удаление за экраном + сброс комбо
        if (currentTop > window.innerHeight) {
            if (obstacle.dataset.type === "good") {
                comboCount = 0;
                comboMultiplier = 1;
                const comboEl = document.getElementById("combo-display");
                if (comboEl) comboEl.style.opacity = "0";
                
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
                }
            }
            obstacle.remove();
            return; 
        }

        // ПРОВЕРКА СТОЛКНОВЕНИЙ
        const obsRect = obstacle.getBoundingClientRect();
        const inset = 18; // Увеличил отступ для более честных столкновений

        if (
            pRect.left + inset < obsRect.right &&
            pRect.right - inset > obsRect.left &&
            pRect.top + inset < obsRect.bottom &&
            pRect.bottom - inset > obsRect.top
        ) {
            // Мгновенная блокировка до вызова логики
            obstacle.dataset.collected = "true"; 
            obstacle.dataset.processing = "true"; 
            if (typeof handleCollision === 'function') handleCollision(obstacle, p);
        }
    });

    loopId = requestAnimationFrame(update);
}

function handleCollision(obs, p) {
    // 1. Проверка: если объект уже собран или обрабатывается — выходим
    if (obs.dataset.collected_check === "true" || obs.dataset.processing === "true") return; 

    // 2. Блокируем объект сразу
    obs.dataset.collected_check = "true"; 
    obs.dataset.processing = "true";
    
    // Прячем визуально и выключаем физику
    obs.style.pointerEvents = 'none';
    obs.style.display = 'none'; 

    const type = obs.dataset.type;
    const rect = obs.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // --- ЛОГИКА МОРОЖЕНОГО (GOOD) ---
    if (type === "good") {
        if (typeof soundCollect !== 'undefined' && soundCollect) {
            soundCollect.currentTime = 0;
            soundCollect.play().catch(() => {});
        }

        comboCount++;
        // Способность Звездного скина увеличивать лимит комбо (до x8)
        let maxComboLimit = (currentSkin === "star") ? 8 : 5;
        comboMultiplier = Math.min(maxComboLimit, Math.floor(comboCount / 3) + 1);

        const comboEl = document.getElementById("combo-display");
        if (comboEl && comboCount >= 2) {
            comboEl.textContent = "x" + comboMultiplier;
            comboEl.style.opacity = "1";
            comboEl.classList.remove("combo-bump");
            void comboEl.offsetWidth; // Force reflow
            comboEl.classList.add("combo-bump");
        }

        if (typeof createExplosion === 'function') {
            createExplosion(centerX, centerY); 
        }

        coins += comboMultiplier; 
        updateScore(); 
        obs.remove(); 
    } 
    
    // --- ЛОГИКА ФИОЛЕТОВОГО ПОДАРКА (АЛМАЗ) ---
    else if (type === "gift_purple" || type === "diamond") {
        let addDia = Math.floor(Math.random() * 2) + 1;
        
        totalDiamonds += addDia;
        if (typeof gameState !== 'undefined') {
            gameState.inventory.items.diamonds += addDia;
        }

        // Способность Силвера: бессмертие на 30 сек при подборе алмаза
        if (currentSkin === "silver") {
            activateSilverInvincibility(); 
        }
        
        if (typeof createExplosion === 'function') {
            createExplosion(centerX, centerY); 
        }
        
        if (typeof updateMenuInfo === 'function') updateMenuInfo(); 
        obs.remove();
    }

    // --- ЛОГИКА ЧЕРНОГО ПОДАРКА (ШТРАФ) ---
    else if (type === "gift_black") {
        // Пират игнорирует штрафы черных подарков
        if (currentSkin === "pirate") {
            console.log("🏴‍☠️ Пират проигнорировал ловушку!");
            obs.remove();
        } else {
            let loss = 15 + Math.floor(Math.random() * 15);
            coins = Math.max(0, coins - loss);
            comboCount = 0;
            comboMultiplier = 1;

            if (typeof createCubeBoom === 'function') createCubeBoom(centerX, centerY);

            updateScore();
            obs.remove();
        }
    }

    // --- ПРЕПЯТСТВИЯ (BAD) ---
    else if (type === "bad") { 
        if (typeof shieldActive !== 'undefined' && shieldActive) {
            obs.remove();
            // Если это обычный щит (не Силвера), снимаем его
            if (currentSkin !== "silver") {
                shieldActive = false;
                if (p) p.classList.remove("shield-aura");
            }
        } 
        // Вторая жизнь Пирата (один раз за забег)
        else if (currentSkin === "pirate" && typeof pirateShieldUsed !== 'undefined' && !pirateShieldUsed) {
            pirateShieldUsed = true;
            if (typeof createCubeBoom === 'function') createCubeBoom(centerX, centerY);
            if (p) p.classList.remove("skin-pirate-aura");
            obs.remove();
        } 
        else {
            gameOver();
        }
    }
}

let silverTimer = null;

function activateSilverInvincibility() {
    shieldActive = true; 
    const p = document.getElementById("player");
    
    if (p) {
        p.classList.add("skin-silver-aura");
    }

    if (silverTimer) clearTimeout(silverTimer);
    
    silverTimer = setTimeout(() => {
        // Снимаем защиту, только если мы все еще в игре и не имеем другого щита
        shieldActive = false;
        if (p) p.classList.remove("skin-silver-aura");
        console.log("Защита Силвера закончилась");
    }, 30000); 
}
        
function updateScore() {
    const coinCountEl = document.getElementById("coinCount");
    const bestScoreEl = document.getElementById("bestScore");
    
    if (coinCountEl) coinCountEl.textContent = coins;
    if (bestScoreEl) bestScoreEl.textContent = best;
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(loopId);
    
    // 1. ПОЛНАЯ ЗАЧИСТКА ПОЛЯ
    document.querySelectorAll(".obstacle").forEach(obs => obs.remove());
    document.querySelectorAll(".speed-particle").forEach(part => part.remove());

    // 2. СОХРАНЕНИЕ ДАННЫХ
    totalCoins += coins;
    if (coins > best) best = coins;
    if (typeof saveUserData === 'function') saveUserData();

    // 3. ПОКАЗ ЭКРАНА СМЕРТИ
    const loseScreen = document.getElementById("lose-screen") || document.getElementById("gameOverScreen");
    if (loseScreen) {
        loseScreen.style.display = "flex";
        loseScreen.classList.remove("hidden");
        
        const finalScoreEl = document.getElementById("final-score");
        if (finalScoreEl) {
            finalScoreEl.textContent = coins;
        }
    }
}

function backToMenu() {
    gameRunning = false;
    if (loopId) cancelAnimationFrame(loopId);
    document.getElementById("gameOverScreen").classList.add("hidden");
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    if (typeof startIceRain === 'function') startIceRain("menu"); 
    updateMenuInfo();
}

let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, {passive: true});

// --- ОБНОВЛЕННЫЕ СВАЙПЫ С АНИМАЦИЕЙ ---
document.addEventListener("touchend", e => {
    if (!gameRunning || (typeof isPaused !== 'undefined' && isPaused)) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 25) return;

    const p = document.getElementById("player");
    if (!p) return;

    p.classList.remove("berry-move-left", "berry-move-right");

    if (diff > 0) {
        targetLane = Math.min(laneCount - 1, targetLane + 1);
        p.classList.add("berry-move-right"); 
    } else {
        targetLane = Math.max(0, targetLane - 1);
        p.classList.add("berry-move-left"); 
    }

    p.style.left = lanes[targetLane] + "%";

    setTimeout(() => {
        p.classList.remove("berry-move-left", "berry-move-right");
    }, 300); 
});

function buyItem(type) {
    if (totalCoins >= PRICES[type]) {
        totalCoins -= PRICES[type]; 
        inventory[type]++;
        saveUserData(); 
        updateMenuInfo();
    } else alert("Недостаточно мороженого!");
}

function useShield() {
    if (inventory.shield > 0 && !shieldActive && gameRunning) {
        inventory.shield--; 
        shieldActive = true;
        document.getElementById("player").classList.add("shield-aura");
        if (typeof updateBonusUI === 'function') updateBonusUI();
    }
}

function useMagnet() {
    if (inventory.magnet > 0 && !magnetActive && gameRunning) {
        inventory.magnet--; 
        magnetActive = true;
        document.getElementById("player").classList.add("magnet-aura");
        if (typeof updateBonusUI === 'function') updateBonusUI();
        
        // Бонус времени для Звездного Берри: 16 сек вместо 10
        let mDuration = (currentSkin === "star") ? 16000 : 10000; 

        setTimeout(() => { 
            magnetActive = false; 
            const p = document.getElementById("player");
            if (p) p.classList.remove("magnet-aura"); 
            if (typeof updateBonusUI === 'function') updateBonusUI();
        }, mDuration);
    }
}

// --- КЛАВИАТУРА ---
document.addEventListener("keydown", (e) => {
    if (!gameRunning || (typeof isPaused !== 'undefined' && isPaused)) return;

    const p = document.getElementById("player");
    if (!p) return;

    p.classList.remove("berry-move-left", "berry-move-right");
    let moved = false;

    if (e.key === "ArrowLeft" || e.code === "KeyA") {
        targetLane = Math.max(0, targetLane - 1);
        p.classList.add("berry-move-left");
        moved = true;
    } 
    else if (e.key === "ArrowRight" || e.code === "KeyD") {
        targetLane = Math.min(laneCount - 1, targetLane + 1);
        p.classList.add("berry-move-right");
        moved = true;
    }

    if (moved) {
        p.style.left = lanes[targetLane] + "%";
        setTimeout(() => {
            p.classList.remove("berry-move-left", "berry-move-right");
        }, 300);
    }
});

function createCollectExplosion(x, y, color) {
    const gameLayer = document.getElementById("game");
    if (!gameLayer) return;

    for (let i = 0; i < 8; i++) {
        const p = document.createElement("div");
        p.className = "collect-particle";
        p.style.background = color || "#ffcc00";
        p.style.left = x + "px";
        p.style.top = y + "px";
        
        const angle = (Math.PI * 2 / 8) * i;
        const dist = 50 + Math.random() * 30;
        p.style.setProperty('--ex', Math.cos(angle) * dist + "px");
        p.style.setProperty('--ey', Math.sin(angle) * dist + "px");
        
        gameLayer.appendChild(p);
        setTimeout(() => p.remove(), 500);
    }
}

// Покупка и выбор скинов
function buySkin(skinId, price) {
    let numericPrice = Number(price);
    let currentDiamonds = Number(totalDiamonds);

    if (inventory.skins.includes(skinId)) {
        alert("Этот скин уже куплен!");
        return;
    }

    if (currentDiamonds >= numericPrice) {
        totalDiamonds -= numericPrice; 
        inventory.skins.push(skinId);
        activeSkin = skinId;
        currentSkin = skinId; 

        saveUserData(); 
        updateMenuInfo(); 
        if (typeof updateSkinUI === "function") updateSkinUI(); 
        alert(`Поздравляем! Новый облик открыт!`);
    } else {
        alert("Вам не хватает " + (numericPrice - currentDiamonds) + " алмазов!");
    }
}

function selectSkin(skinId) {
    if (inventory.skins && inventory.skins.includes(skinId)) {
        activeSkin = skinId;
        currentSkin = skinId; 

        const skinData = skins.find(s => s.id === skinId);
        if (!skinData) return;

        // Обновление превью
        const preview = document.getElementById("skinPreview");
        if (preview) preview.style.backgroundImage = `url('${skinData.img}')`;

        // Обновление игрока
        const p = document.getElementById("player");
        if (p) {
            p.style.backgroundImage = `url('${skinData.img}')`;
            p.classList.remove("skin-star-aura", "skin-pirate-aura", "skin-silver-aura");
            if (skinId !== 'default') p.classList.add(`skin-${skinId}-aura`);
        }

        saveUserData();
        localStorage.setItem("activeSkin", skinId);
        if (typeof updateSkinUI === "function") updateSkinUI();
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. Прячем загрузочный экран (если он есть), так как скрипт дочитан до конца
    const loader = document.getElementById("loader") || document.querySelector(".loading");
    if (loader) loader.style.display = "none";

    // 2. Настраиваем кнопки на экране проигрыша
    const retryBtn = document.getElementById("retryBtn");
    const menuBtn = document.getElementById("menuBtn");

    if (retryBtn) {
        retryBtn.onclick = () => {
            if (typeof initAudio === 'function') initAudio(); 
            startGame(); // Перезапуск игры
        };
    }

    if (menuBtn) {
        menuBtn.onclick = () => {
            if (typeof initAudio === 'function') initAudio();
            backToMenu(); // Возврат в меню
        };
    }

    // 3. Обновляем визуальную часть магазина и меню
    try {
        if (typeof updateSkinUI === "function") updateSkinUI();
        if (typeof updateMenuInfo === "function") updateMenuInfo();
        console.log("Berry Runner: Система готова!");
    } catch (e) {
        console.error("Ошибка инициализации интерфейса:", e);
    }
});
