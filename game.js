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
    const continueBtn = document.getElementById("continue-btn");
    const loaderTitle = document.querySelector(".loading-title");
    const idDisplay = document.getElementById("user-id-display");

    // Выводим ID на экран загрузки
    if (idDisplay) idDisplay.innerText = id;

    // Функция завершения загрузки
    const finishLoading = () => {
        if (loaderTitle) loaderTitle.innerText = "ГОТОВО!";
        if (continueBtn) {
            continueBtn.classList.remove("hidden");
            continueBtn.onclick = () => {
                if (loader) loader.classList.add("hidden");
                // Запускаем анимацию в меню только после входа
                if (typeof startMenuAnimation === "function") startMenuAnimation();
            };
        } else {
            setTimeout(() => { if (loader) loader.classList.add("hidden"); }, 1000);
        }
    };

    const forceCloseLoader = setTimeout(() => {
        if (loader && !loader.classList.contains("hidden")) {
            console.warn("Загрузка форсирована");
            finishLoading();
        }
    }, 3500);

    if (!window.db || !id) {
        clearTimeout(forceCloseLoader);
        updateMenuInfo();
        finishLoading();
        return;
    }
    
    const userRef = db.ref('players/' + id);
    userRef.once('value').then((snapshot) => {
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
                gameState.inventory.items.shield = Number(data.inventory.items.shield) || 0;
                gameState.inventory.items.magnet = Number(data.inventory.items.magnet) || 0;
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
        finishLoading();

    }).catch((err) => {
        clearTimeout(forceCloseLoader);
        console.error("Firebase Error:", err);
        finishLoading();
    });
}

function saveUserData() {
    if (!userId || !window.db) return;
    
    // Формируем объект, который на 100% совпадает со структурой загрузки
    const dataToSave = {
        nick: nick,
        best: best,
        totalCoins: totalCoins,
        totalDiamonds: totalDiamonds,
        currentSkin: gameState.currentSkin,
        inventory: {
            skins: gameState.inventory.skins,
            items: {
                shield: gameState.inventory.items.shield,
                magnet: gameState.inventory.items.magnet,
                diamonds: totalDiamonds // Дублируем для надежности
            }
        }
    };

    db.ref('players/' + userId).set(dataToSave)
        .then(() => console.log("Данные успешно синхронизированы с Firebase"))
        .catch(e => console.error("Ошибка сохранения в облако:", e));
        
    // Локальное сохранение как запасной вариант
    localStorage.setItem("boughtSkins", JSON.stringify(gameState.inventory.skins));
    localStorage.setItem("totalDiamonds", totalDiamonds);
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
    // 1. Сбор параметров сложности
    const diffSelect = document.getElementById("difficulty");
    const level = diffSelect ? diffSelect.value : 'medium';
    const p = document.getElementById("player");

    // 2. Проверка ника (с защитой от пустых значений)
    if (!nick) {
        const nickInput = document.getElementById("nick");
        const val = nickInput ? nickInput.value.trim() : "";
        if (!val || val.length < 2) {
            alert("Введи имя (минимум 2 символа)!");
            return;
        }
        nick = val; 
        userId = val;
        localStorage.setItem("nick", nick);
    }

    // 3. Инициализация состояния (защита от undefined)
    if (!window.gameState) window.gameState = { currentSkin: "default" };
    gameState.currentSkin = activeSkin || "default"; 

    // 4. Сброс персонажа и применение скинов
    if (p) {
        // Очищаем классы, но сохраняем базовый ID
        p.className = ""; 
        p.classList.add("player-base"); // Хорошая практика иметь базовый класс

        if (gameState.currentSkin !== "default") {
            p.classList.add(`skin-${gameState.currentSkin}`);
            p.classList.add(`skin-${gameState.currentSkin}-aura`);
        }
        
        // Если есть функция отрисовки — вызываем
        if (typeof drawPlayer === 'function') drawPlayer(); 
    }

    // 5. Балансировка сложности
    let spawnRate = 1000;
    if (level === 'easy') {
        baseSpeed = 4; difficulty = 0.0005; spawnRate = 1300;
    } else if (level === 'medium') {
        baseSpeed = 6; difficulty = 0.001; spawnRate = 1000;
    } else if (level === 'hard') {
        baseSpeed = 9; difficulty = 0.003; spawnRate = 700;
    }
    speed = baseSpeed;

    // 6. ПРИНУДИТЕЛЬНАЯ ОЧИСТКА (чтобы ничего не замирало)
    document.querySelectorAll(".obstacle").forEach(obs => obs.remove());
    if (window.gameInterval) clearInterval(window.gameInterval);
    if (loopId) cancelAnimationFrame(loopId);

    // 7. Запуск циклов
    gameRunning = true;
    isPaused = false;

    // Интервал спавна
    window.gameInterval = setInterval(() => {
        if (gameRunning && !isPaused) {
            // Проверка: не слишком ли много объектов уже на экране?
            const currentObs = document.querySelectorAll(".obstacle").length;
            const maxAllowed = (level === 'hard') ? 8 : 5;
            
            if (currentObs < maxAllowed) {
                spawnObstacle();
            }
        }
    }, spawnRate);

    // Запуск основного цикла движения
    loopId = requestAnimationFrame(update);

    // 8. Переключение экранов
    const menu = document.getElementById("menu");
    const gameScreen = document.getElementById("game");
    if (menu) menu.classList.add("hidden");
    if (gameScreen) gameScreen.classList.remove("hidden");

    // Прячем загрузку
    const ls = document.getElementById("loading-screen") || document.getElementById("loadingScreen");
    if (ls) ls.style.display = "none";

    // Сброс очков и комбо (если функция есть)
    if (typeof resetGame === 'function') resetGame();

    console.log("🚀 Поехали!", { level, skin: gameState.currentSkin, speed });
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
    if (!p) {
        loopId = requestAnimationFrame(update);
        return;
    }

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
        // Если объект уже обработан, мы его игнорируем
        if (obstacle.dataset.collected === "true") return; 

        let currentTop = parseFloat(obstacle.style.top) || -150;

        // МАГНИТ
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
                const force = 12;
                if (obstacle.style.left.includes('%')) {
                    obstacle.style.left = obsRect.left + "px";
                }
                const newLeft = (parseFloat(obstacle.style.left) || 0) + (dx / distance) * force;
                obstacle.style.left = newLeft + "px";
                currentTop += (dy / distance) * force;
            }
        }

        // ДВИЖЕНИЕ
        currentTop += speed;
        obstacle.style.top = currentTop + "px";

        // УДАЛЕНИЕ ЗА ЭКРАНОМ
        if (currentTop > window.innerHeight) {
            if (obstacle.dataset.type === "good") {
                if (typeof comboCount !== 'undefined') comboCount = 0;
                if (typeof comboMultiplier !== 'undefined') comboMultiplier = 1;
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
        const inset = 18; 

        if (
            pRect.left + inset < obsRect.right &&
            pRect.right - inset > obsRect.left &&
            pRect.top + inset < obsRect.bottom &&
            pRect.bottom - inset > obsRect.top
        ) {
            // Мгновенно помечаем, чтобы не было повтора
            obstacle.dataset.collected = "true"; 
            
            // Оборачиваем в try-catch, чтобы ПРИ ОШИБКЕ ОБЪЕКТ УДАЛИЛСЯ, А ИГРА ШЛА ДАЛЬШЕ
            try {
                if (typeof handleCollision === 'function') {
                    handleCollision(obstacle, p);
                }
            } catch (e) {
                console.error("Ошибка в handleCollision:", e);
                obstacle.remove(); // Если всё сломалось — просто удаляем объект
            }
        }
    });

    // САМОЕ ВАЖНОЕ: перезапуск цикла ВСЕГДА в конце
    loopId = requestAnimationFrame(update);
}

function handleCollision(obs, p) {
    if (!obs || obs.dataset.processing === "true") return;
    obs.dataset.processing = "true";
    
    // Сразу фиксируем данные, пока объект еще в DOM
    const type = obs.dataset.type;
    const rect = obs.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // УДАЛЯЕМ СРАЗУ. Если код ниже упадет, объект не будет висеть на экране
    obs.remove();

    try {
        const currentActiveSkin = (window.gameState && window.gameState.currentSkin) ? window.gameState.currentSkin : "default";

        if (type === "good") {
            // Звук
            if (window.soundCollect) {
                soundCollect.currentTime = 0;
                soundCollect.play().catch(() => {});
            }

            window.comboCount = (window.comboCount || 0) + 1;
            let maxComboLimit = (currentActiveSkin === "star") ? 8 : 5;
            window.comboMultiplier = Math.min(maxComboLimit, Math.floor(window.comboCount / 3) + 1);

            if (typeof createCollectExplosion === 'function') {
                createCollectExplosion(centerX, centerY, "#ffcc00");
            }

            window.coins = (window.coins || 0) + window.comboMultiplier; 
            if (typeof updateScore === 'function') updateScore(); 
        } 
        
        else if (type === "gift_purple" || type === "diamond") {
            let addDia = Math.floor(Math.random() * 2) + 1;
            window.totalDiamonds = (window.totalDiamonds || 0) + addDia;

            // БЕЗОПАСНАЯ ЗАПИСЬ (проверяем всю цепочку)
            if (window.gameState && window.gameState.inventory && window.gameState.inventory.items) {
                window.gameState.inventory.items.diamonds = window.totalDiamonds;
            }

            if (currentActiveSkin === "silver" && typeof activateSilverInvincibility === 'function') {
                activateSilverInvincibility(); 
            }
            
            if (typeof createCollectExplosion === 'function') {
                createCollectExplosion(centerX, centerY, "#e040fb");
            }
            
            if (typeof saveUserData === 'function') saveUserData(); 
            if (typeof updateMenuInfo === 'function') updateMenuInfo(); 
        }

        else if (type === "bad") {
            let isShielded = (window.shieldActive === true);

            if (isShielded) {
                if (currentActiveSkin !== "silver") {
                    window.shieldActive = false;
                    if (p) p.classList.remove("shield-aura");
                }
                if (typeof createCollectExplosion === 'function') {
                    createCollectExplosion(centerX, centerY, "#ff0000");
                }
            } else if (currentActiveSkin === "pirate" && !window.pirateShieldUsed) {
                window.pirateShieldUsed = true;
                if (p) p.classList.remove("skin-pirate-aura");
                if (typeof createCollectExplosion === 'function') {
                    createCollectExplosion(centerX, centerY, "#704214");
                }
            } else {
                // Если проиграли — выходим
                if (typeof gameOver === 'function') gameOver();
                return;
            }
        }
    } catch (err) {
        console.error("Критическая ошибка в столкновении:", err);
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
    const coinEl = document.getElementById("coinCount");
    const gameScoreEl = document.querySelector(".score-val"); // Проверь, есть ли такой класс в index.html
    
    if (coinEl) coinEl.textContent = coins;
    if (gameScoreEl) gameScoreEl.textContent = coins;
    
    // Сохраняем лучший результат, если нужно
    if (coins > best) {
        best = coins;
        const bestEl = document.getElementById("bestScore");
        if (bestEl) bestEl.textContent = best;
    }
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

// 1. Покупка скина
function buySkin(skinId, price) {
    let numericPrice = Number(price);
    
    // Проверяем наличие через gameState
    if (gameState.inventory.skins.includes(skinId)) {
        alert("Этот скин уже куплен!");
        return;
    }

    if (totalDiamonds >= numericPrice) {
        // Уменьшаем баланс
        totalDiamonds -= numericPrice;
        
        // ОБЯЗАТЕЛЬНО: Обновляем gameState, так как saveUserData() берет данные оттуда
        gameState.inventory.items.diamonds = totalDiamonds;
        gameState.inventory.skins.push(skinId);
        
        // Устанавливаем как активный
        activeSkin = skinId;
        gameState.currentSkin = skinId; 

        // Сохраняем и обновляем всё
        saveUserData(); 
        updateMenuInfo(); 
        if (typeof updateSkinUI === "function") updateSkinUI(); 
        
        alert(`Поздравляем! Новый облик открыт!`);
    } else {
        alert("Вам не хватает " + (numericPrice - totalDiamonds) + " алмазов!");
    }
}

// 2. Выбор уже купленного скина
function selectSkin(skinId) {
    if (gameState.inventory.skins.includes(skinId)) {
        activeSkin = skinId;
        gameState.currentSkin = skinId; 

        const skinData = skins.find(s => s.id === skinId);
        if (!skinData) return;

        // Обновление превью и игрока (вызываем drawPlayer если она есть)
        if (typeof drawPlayer === 'function') {
            drawPlayer();
        } else {
            const p = document.getElementById("player");
            if (p) {
                p.style.backgroundImage = `url('${skinData.img}')`;
                p.className = "player-base"; // Сброс классов
                if (skinId !== 'default') p.classList.add(`skin-${skinId}-aura`);
            }
        }

        saveUserData();
        localStorage.setItem("activeSkin", skinId);
        if (typeof updateSkinUI === "function") updateSkinUI();
    }
}

// 3. Инициализация (с фиксом звука для Telegram)
window.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById("loader") || document.getElementById("loading-screen");
    if (loader) loader.style.display = "none";

    const retryBtn = document.getElementById("retryBtn");
    const menuBtn = document.getElementById("menuBtn");

    // Функция для "разблокировки" звука в браузере
    const unlockAudio = () => {
        if (typeof initAudio === 'function') initAudio();
        // Проигрываем и сразу стопаем звук, чтобы разрешить аудио в сессии
        if (window.soundCollect) {
            window.soundCollect.play().then(() => {
                window.soundCollect.pause();
                window.soundCollect.currentTime = 0;
            }).catch(e => console.log("Audio waiting for interaction"));
        }
    };

    if (retryBtn) {
        retryBtn.onclick = () => {
            unlockAudio();
            startGame();
        };
    }

    if (menuBtn) {
        menuBtn.onclick = () => {
            unlockAudio();
            backToMenu();
        };
    }

    try {
        if (typeof updateSkinUI === "function") updateSkinUI();
        if (typeof updateMenuInfo === "function") updateMenuInfo();
        console.log("Berry Runner: Система готова!");
    } catch (e) {
        console.error("Ошибка инициализации интерфейса:", e);
    }
});

function openShop() {
    const mainMenu = document.getElementById('menu'); // Проверь, какой ID у главного меню: 'menu' или 'main-menu'
    const shopScreen = document.getElementById('shop');
    
    if (shopScreen) {
        if (mainMenu) mainMenu.classList.add('hidden');
        shopScreen.classList.remove('hidden');
        console.log("Магазин открыт");
        if (typeof updateSkinUI === "function") updateSkinUI(); 
    } else {
        console.error("Элемент с id='shop' не найден!");
    }
}

function closeShop() {
    const mainMenu = document.getElementById('menu');
    const shopScreen = document.getElementById('shop');
    
    if (shopScreen) {
        shopScreen.classList.add('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');
        console.log("Магазин закрыт");
    }
}

function startMenuAnimation() {
    if (gameRunning) return; // Не пускаем в игре

    const menuLayer = document.getElementById("menu"); 
    if (!menuLayer) return;

    const decor = document.createElement("div");
    decor.className = "obstacle decor-item"; // Добавь decor-item в CSS
    decor.style.left = Math.random() * 100 + "%";
    decor.style.top = "-50px";
    
    // Выбираем случайную картинку
    const images = ["url('assets/icecream.png')", "url('assets/purple.png')"];
    decor.style.backgroundImage = images[Math.floor(Math.random() * images.length)];
    decor.style.position = "absolute";
    decor.style.width = "30px";
    decor.style.height = "30px";
    decor.style.backgroundSize = "contain";
    decor.style.opacity = "0.6"; // Немного прозрачности для фона

    menuLayer.appendChild(decor);

    // Плавное падение
    const fallDuration = 3000 + Math.random() * 2000;
    decor.animate([
        { top: "-50px", transform: "rotate(0deg)" },
        { top: "110vh", transform: `rotate(${Math.random() * 360}deg)` }
    ], {
        duration: fallDuration,
        easing: "linear"
    }).onfinish = () => decor.remove();
}

// Запускай каждые 1.5 секунды
setInterval(() => {
    if (!gameRunning) startMenuAnimation();
}, 1500);
