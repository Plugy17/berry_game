const loadedSkins = {};

// Предзагрузка запускается СРАЗУ
Object.keys(skinFiles).forEach(skinId => {
    const img = new Image();
    img.src = skinFiles[skinId]; 
    img.onload = () => console.log(`Спрайт ${skinId} успешно загружен из assets`);
    img.onerror = () => console.error(`Ошибка: файл не найден по пути ${skinFiles[skinId]}`);
    loadedSkins[skinId] = img;
});

// Используем addEventListener, чтобы не конфликтовать с другими скриптами
window.addEventListener('load', function() {
    const userIdDisplay = document.getElementById("user-id-display");
    const continueBtn = document.getElementById("continue-btn");
    const loadingScreen = document.getElementById("loading-screen");
    
    // 1. ОПРЕДЕЛЯЕМ ID (Telegram или Гость)
    let currentId = "Guest_" + Math.floor(Math.random() * 10000);
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        currentId = window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    if (userIdDisplay) userIdDisplay.innerText = currentId;

    // 2. ЗАГРУЖАЕМ ДАННЫЕ ИЗ FIREBASE
    // Пока крутится спиннер, мы уже тянем монеты и рекорды
    if (typeof loadUserData === 'function') {
        loadUserData(currentId); 
    }

    // 3. ТАЙМЕР ЗАГРУЗКИ
    setTimeout(() => {
        const title = document.querySelector(".loading-title");
        const spinner = document.querySelector(".spinner");
        if (title) title.innerText = "ГОТОВО!";
        if (spinner) spinner.style.display = "none";
        
        if (continueBtn) {
            continueBtn.classList.remove("hidden");
            continueBtn.style.display = "block"; 
        }
    }, 2000);

    // 4. ВХОД В МЕНЮ
    if (continueBtn) {
        continueBtn.onclick = function() {
            loadingScreen.style.opacity = "0";
            setTimeout(() => {
                loadingScreen.style.display = "none";
                // Запускаем анимацию льда только после входа
                startIceRain("menu");
            }, 500);
        };
    }
});

const skins = [
    { id: "default", name: "Берри", img: "assets/berry.png" },
    { id: "star", name: "Звездный", img: "assets/berry2.png" },
    { id: "pirate", name: "Пират", img: "assets/berry3.png" },
    { id: "silver", name: "Силвер", img: "assets/berry4.png" }
];

// 1. Устанавливаем активный скин из памяти или по умолчанию
let activeSkin = localStorage.getItem("activeSkin") || "default"; 

// 2. Находим индекс активного скина в массиве, чтобы меню открывалось на нужном месте
let currentSkinIndex = skins.findIndex(s => s.id === activeSkin);

// Если вдруг в памяти старый ID, которого нет в массиве, ставим 0
if (currentSkinIndex === -1) currentSkinIndex = 0;

function updateSkinUI() {
    const skin = skins[currentSkinIndex];
    const preview = document.getElementById("skinPreview");
    const nameLabel = document.getElementById("skinName");
    const selectBtn = document.getElementById("selectSkinBtn");

    // Ставим картинку
    preview.style.backgroundImage = `url('${skin.img}')`;
    nameLabel.innerText = skin.name;

    // Проверяем, этот ли скин сейчас "надет"
    if (activeSkin === skin.id) {
        selectBtn.innerText = "ВЫБРАНО";
        selectBtn.classList.add("active");
    } else {
        // Проверка: куплен ли скин
        // Замени эту строку в updateSkinUI
const isOwned = skin.id === "default" || (inventory && inventory.skins && inventory.skins.includes(skin.id));
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

// Кнопка выбора/надевания
document.getElementById("selectSkinBtn").onclick = () => {
    const skin = skins[currentSkinIndex];
    const isOwned = skin.id === "default" || (inventory.skins && inventory.skins.includes(skin.id));

    if (isOwned) {
        activeSkin = skin.id;
        currentSkin = skin.id; // Для механики в game_2.js
        updateSkinUI();
    } else {
        // Если не куплен, можно перекинуть в магазин
        openShop();
    }
};

// Стрелки
document.getElementById("nextSkin").onclick = () => {
    currentSkinIndex = (currentSkinIndex + 1) % skins.length;
    updateSkinUI();
};
document.getElementById("prevSkin").onclick = () => {
    currentSkinIndex = (currentSkinIndex - 1 + skins.length) % skins.length;
    updateSkinUI();
};

function initAudio() {
    // Проигрываем и сразу ставим на паузу пустой звук или наш эффект
    soundCollect.play().then(() => {
        soundCollect.pause();
        soundCollect.currentTime = 0;
    }).catch(e => console.log("Audio waiting for user tap"));
}

// --- ФУНКЦИЯ ПАУЗЫ (Должна стоять отдельно) ---
function togglePause() {
    if (!gameRunning) return; 

    isPaused = !isPaused;
    const pauseIcon = document.getElementById("pauseIcon");

    if (isPaused) {
        if (pauseIcon) pauseIcon.src = "assets/play.png"; // У тебя файл play.jpg
        cancelAnimationFrame(loopId);
        stopIceRain();
        console.log("Пауза включена");
    } else {
        if (pauseIcon) pauseIcon.src = "assets/pause.png";
        requestAnimationFrame(update);
        console.log("Игра продолжается");
    }
}

let totalDiamonds = 0; 
let diamonds = 0; // Алмазы за текущий забег
let currentSkin = localStorage.getItem("activeSkin") || "default";

const soundCollect = new Audio('assets/collect.mp3'); // Убедитесь, что файл лежит по этому пути
soundCollect.volume = 0.3;
let laneCount = 4;
let lanes = [12.5, 37.5, 62.5, 87.5]; 
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -150; 
let loopId = null;
let speed = 7;
let isPaused = false;
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
    const particleCount = 5;
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

function loadUserData(id) {
    if (!window.db || !id) return updateMenuInfo();
    
    db.ref('players/' + id).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            best = data.best || 0;
            totalCoins = data.totalCoins || 0;
            totalDiamonds = data.totalDiamonds || 0; 
            
            // Загружаем текущий надетый скин
            activeSkin = data.currentSkin || "default";
            currentSkin = activeSkin;

            // ИСПРАВЛЕНО: Загружаем весь инвентарь, включая массив skins
            if (data.inventory) {
                inventory.shield = data.inventory.shield || 0;
                inventory.magnet = data.inventory.magnet || 0;
                // Ключевая строчка: восстанавливаем список купленных скинов
                inventory.skins = data.inventory.skins || ["default"];
            } else {
                // Если инвентаря в базе нет, создаем базу
                inventory = { magnet: 0, shield: 0, skins: ["default"] };
            }
            
            // После загрузки всех данных обновляем UI
            if (typeof updateSkinUI === "function") {
                updateSkinUI(); 
            }
        } else {
            saveUserData();
        }
        updateMenuInfo();
    }).catch((err) => {
        console.error("Ошибка загрузки:", err);
        updateMenuInfo();
    });
}

function saveUserData() {
    if (!userId || !window.db) return;
    
    db.ref('players/' + userId).set({ 
        nick: nick, 
        best: best, 
        totalCoins: totalCoins, 
        totalDiamonds: totalDiamonds,
        inventory: inventory, // Теперь сюда входят и скины, и бонусы
        currentSkin: activeSkin // Сохраняем именно надетый скин
    });
}

function updateMenuInfo() {
    // 1. Приветствие
    if (nick) {
        const welcomeElem = document.getElementById("welcome");
        if(welcomeElem) welcomeElem.innerHTML = `Герой <b>${nick}</b>`;
        const nickInput = document.getElementById("nick");
        if(nickInput) nickInput.style.display = "none";
    }

    // Подготавливаем иконки из стилей
    const iceIcon = `<span class="ice-icon"></span>`;
    const diamondIcon = `<span class="diamond-icon"></span>`;

    // 2. ОБНОВЛЯЕМ МОРОЖЕНОЕ
    // Обновляем только конкретные числа, не трогая весь контейнер total-balance
    const menuCoins = document.getElementById("menuCoinCount");
    const shopCoins = document.getElementById("shop-balance");
    
    if(menuCoins) menuCoins.innerHTML = `${totalCoins} ${iceIcon}`;
    if(shopCoins) shopCoins.innerHTML = `${totalCoins} ${iceIcon}`;

    // 3. ОБНОВЛЯЕМ АЛМАЗЫ[cite: 2, 5]
    const menuDiamonds = document.getElementById("menuDiamondCount");
    const shopDiamonds = document.getElementById("shop-diamonds");
    const hudDiamonds = document.getElementById("diamondCount");

    if(menuDiamonds) menuDiamonds.innerHTML = `${totalDiamonds} ${diamondIcon}`;
    if(shopDiamonds) shopDiamonds.innerHTML = `${totalDiamonds} ${diamondIcon}`;
    if(hudDiamonds) hudDiamonds.innerHTML = `${totalDiamonds} ${diamondIcon}`;

    // 4. ОБНОВЛЯЕМ РЕКОРД[cite: 5]
    const menuBest = document.getElementById("menuLeaderboard");
    if(menuBest) menuBest.innerText = `🏆 ${best}`;

    updateBonusUI();
}

function updateBonusUI() {
    const sCount = document.getElementById("count-shield");
    const mCount = document.getElementById("count-magnet");
    if(sCount) sCount.innerText = inventory.shield;
    if(mCount) mCount.innerText = inventory.magnet;
}

function buyStarSkin() {
    const price = 100; // Твоя цена

    // 1. Проверяем, не куплен ли он уже (смотрим в inventory)
    if (inventory.skins && inventory.skins.includes("star")) {
        alert("Этот скин уже куплен! Выбери его в меню выбора персонажа.");
        return;
    }

    if (totalDiamonds >= price) {
        totalDiamonds -= price;
        
        // 2. ДОБАВЛЯЕМ В ИНВЕНТАРЬ (чтобы updateSkinUI увидел его)
        if (!inventory.skins) inventory.skins = ["default"];
        inventory.skins.push("star");

        // 3. Сразу делаем его активным
        activeSkin = "star";
        currentSkin = "star";
        
        saveUserData(); // Сохраняем в Firebase
        updateMenuInfo();
        updateSkinUI(); // Обновляем кнопки в меню выбора
        
        alert("Звездный Берри теперь твой навсегда!");
    } else {
        alert("Недостаточно алмазов!");
    }
}

function exchangeIceToDiamond() {
    if (totalCoins >= 1000) {
        totalCoins -= 1000;
        totalDiamonds += 10;
        saveUserData();
        updateMenuInfo();
    } else {
        alert("Нужно 1000 мороженого!");
    }
}

function startGame() {
    // 1. Сбор данных из интерфейса
    const diffSelect = document.getElementById("difficulty");
    const level = diffSelect ? diffSelect.value : 'medium';
    const p = document.getElementById("player");

    // 2. Логика ника (если ника нет — просим ввести)
    if (!nick) {
        const val = document.getElementById("nick")?.value.trim();
        if (!val || val.length < 2) return alert("Введи имя!");
        nick = val; 
        userId = val;
        localStorage.setItem("nick", nick);
    }

    // 3. Установка скина из активного выбора
    if (p) {
        const skinData = skins.find(s => s.id === activeSkin) || skins[0];
        p.style.backgroundImage = `url('${skinData.img}')`;
        p.style.backgroundSize = "contain";
        p.style.backgroundRepeat = "no-repeat";

        // Очищаем старые ауры и стили
        p.classList.remove(
            "skin-star", "skin-pirate", "skin-silver",
            "skin-star-aura", "skin-pirate-aura", "skin-silver-aura"
        );
        
        if (activeSkin !== "default") {
            p.classList.add(`skin-${activeSkin}`);
            p.classList.add(`skin-${activeSkin}-aura`);
        }
    }

    // 4. Настройка баланса сложности
    let spawnRate = 1000;
    if (level === 'easy') {
        baseSpeed = 6; difficulty = 0.001; spawnRate = 1200;
    } else if (level === 'medium') {
        baseSpeed = 7; difficulty = 0.002; spawnRate = 1000;
    } else if (level === 'hard') {
        baseSpeed = 11; difficulty = 0.005; spawnRate = 600;
    }
    speed = baseSpeed;

    // 5. Очистка игрового поля перед стартом
    document.querySelectorAll(".obstacle").forEach(obs => obs.remove()); 
    if (window.gameInterval) clearInterval(window.gameInterval); 

    // Запуск цикла появления препятствий
    window.gameInterval = setInterval(() => {
        if (gameRunning && !isPaused) spawnObstacle();
    }, spawnRate);[cite: 1]

    if (loopId) cancelAnimationFrame(loopId);

    // 6. Переключение экранов (УБИРАЕМ ЗАГРУЗКУ)
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    
    // Если у тебя есть экран загрузки в HTML, скрываем его здесь
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) loadingScreen.classList.add("hidden");

    resetGame();
    console.log("Игра успешно запущена на сложности:", level);
}

// 2. ИСПРАВЛЕННЫЙ БЛОК СБРОСА ИГРЫ
function resetGame() {
    // --- 1. Сброс игровых механик ---
    coins = 0; 
    comboCount = 0; 
    comboMultiplier = 1;
    shieldActive = false; 
    magnetActive = false;
    targetLane = 1; 
    speed = baseSpeed;
    gameRunning = true;
    
    // Сброс уникальных способностей скинов
    pirateShieldUsed = false; 
    if (typeof silverTimer !== 'undefined' && silverTimer) clearTimeout(silverTimer);

    // --- 2. ЖЕСТКАЯ ПРИВЯЗКА ВИЗУАЛА К ВЫБРАННОМУ СКИНУ ---
    const p = document.getElementById("player");
    if (p) {
        // Очищаем классы, чтобы убрать ауры, но оставляем базовый класс игрока если он нужен
        p.className = "player-base"; 
        p.style.filter = "none";
        
        // Находим данные активного скина в массиве по его ID[cite: 1, 2]
        const activeSkinData = skins.find(s => s.id === activeSkin) || skins[0];
        
        // Принудительно ставим картинку из объекта скина[cite: 1, 3]
        p.style.backgroundImage = `url('${activeSkinData.img}')`;
        p.style.backgroundSize = "contain";
        p.style.backgroundRepeat = "no-repeat";

        // Добавляем класс ауры в зависимости от activeSkin
        // Теперь используем переменную activeSkin, которую сохраняли в localStorage
        if (activeSkin !== "default") {
            p.classList.add(`skin-${activeSkin}-aura`);
        }
        
        // Начальная позиция
        p.style.left = lanes[targetLane] + "%";
    }

    // --- 3. Обновление интерфейса и старт ---
    updateScore(); 
    updateBonusUI();
    
    if (loopId) cancelAnimationFrame(loopId);
    
    // Очищаем старые объекты с поля[cite: 3]
    document.querySelectorAll(".obstacle").forEach(obs => obs.remove());
    
    spawnObstacle();
    update();
}

let lastSpawnTime = 0; // Время последнего появления объекта

function spawnObstacle() {
    if (!gameRunning || isPaused) return;

    const gameLayer = document.getElementById("game");
    if (!gameLayer) return;

    // 1. ПОЛУЧАЕМ ТЕКУЩУЮ СЛОЖНОСТЬ
    const diffSelect = document.getElementById("difficulty");
    const level = diffSelect ? diffSelect.value : 'medium';

    // 2. ДИНАМИЧЕСКИЕ ЛИМИТЫ
    const currentCount = document.querySelectorAll(".obstacle").length;
    let maxItems = 5; 
    if (level === 'easy') maxItems = 6; 
    if (level === 'hard') maxItems = 8; 
    
    if (currentCount >= maxItems) return;

    const obs = document.createElement("div");
    obs.className = "obstacle"; 

    // 3. НОВАЯ ЛОГИКА ШАНСОВ (Подарки и Алмазы)
    const rand = Math.random();

    if (rand < 0.03) { 
        // 3% шанс на фиолетовый подарок (Алмаз) — очень редкий[cite: 2]
        obs.dataset.type = "gift_purple";
        obs.style.backgroundImage = "url('assets/purple.png')";
        obs.classList.add("gift-purple-anim"); // Анимация свечения из CSS
    } 
    else if (rand < 0.10) { 
        // 7% шанс на черный подарок (Минус монеты)
        obs.dataset.type = "gift_black";
        obs.style.backgroundImage = "url('assets/black.png')";
    } 
    else {
        // 90% времени выпадают обычные объекты[cite: 2]
        const isGood = Math.random() < (level === 'hard' ? 0.45 : 0.65);
        obs.dataset.type = isGood ? "good" : "bad";
        obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    }
    

    // 4. ПОЗИЦИОНИРОВАНИЕ[cite: 2]
    const laneIndex = Math.floor(Math.random() * lanes.length);
    obs.style.left = lanes[laneIndex] + "%";
    
    // Ставим строго за верхнюю границу[cite: 2]
    obs.style.top = "-100px"; 

    gameLayer.appendChild(obs);
}

function update() {
    if (!gameRunning || (typeof isPaused !== 'undefined' && isPaused)) return;

    const p = document.getElementById("player");
    if (!p) return;

    // Вызываем обновление картинки скина
    drawPlayer();

    const pRect = p.getBoundingClientRect(); 

    // 2. ЭФФЕКТ ШЛЕЙФА
    if (Math.random() < 0.3) {
        const gameLayer = document.getElementById("game");
        if (gameLayer) {
            const part = document.createElement("div");
            part.className = "speed-particle";
            part.style.left = (pRect.left + pRect.width / 2) + "px";
            part.style.top = (pRect.top + pRect.height - 10) + "px";
            const pdx = (Math.random() - 0.5) * 40 + "px";
            part.style.setProperty('--pdx', pdx);
            gameLayer.appendChild(part);
            setTimeout(() => part.remove(), 400);
        }
    }

    // 3. ДВИЖЕНИЕ И ПРОВЕРКА СТОЛКНОВЕНИЙ
    const obstacles = document.querySelectorAll(".obstacle");

    obstacles.forEach(obstacle => {
        if (obstacle.dataset.collected) return; 

        let currentTop = parseFloat(obstacle.style.top) || -150;

        // ЛОГИКА МАГНИТА
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
                const force = 10;
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

        // УДАЛЕНИЕ ЗА ЭКРАНОМ
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
        const inset = 15;

        if (
            pRect.left + inset < obsRect.right &&
            pRect.right - inset > obsRect.left &&
            pRect.top + inset < obsRect.bottom &&
            pRect.bottom - inset > obsRect.top
        ) {
            obstacle.dataset.collected = "true"; 
            handleCollision(obstacle, p);
        }
    });

    loopId = requestAnimationFrame(update);
}

function handleCollision(obs, p) {
    if (obs.dataset.collected_check) return; 
    obs.dataset.collected_check = "true"; 
    obs.style.pointerEvents = 'none';
    obs.style.display = 'none'; 

    const type = obs.dataset.type;
    const rect = obs.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // --- 1. ЛОГИКА МОРОЖЕНОГО (GOOD) ---
    if (type === "good") {
        if (soundCollect) {
            soundCollect.currentTime = 0;
            soundCollect.play().catch(() => {});
        }

        comboCount++;
        let maxComboLimit = (currentSkin === "star") ? 8 : 5;
        comboMultiplier = Math.min(maxComboLimit, Math.floor(comboCount / 3) + 1);

        const comboEl = document.getElementById("combo-display");
        if (comboEl && comboCount >= 2) {
            comboEl.innerText = "x" + comboMultiplier;
            comboEl.style.opacity = "1";
            comboEl.classList.remove("combo-bump");
            void comboEl.offsetWidth; 
            comboEl.classList.add("combo-bump");
        }

        if (typeof createExplosion === 'function') {
            createExplosion(centerX, centerY); 
        }

        coins += comboMultiplier; 
        updateScore(); 
        obs.remove(); 
    } 
    
    // --- 2. ЛОГИКА ФИОЛЕТОВОГО ПОДАРКА (АЛМАЗ) ---
    else if (type === "gift_purple") {
        let addDia = Math.floor(Math.random() * 2) + 1;
        totalDiamonds += addDia;

        if (currentSkin === "silver") {
            activateSilverInvincibility(); // Защита Силвера на 30 сек
        }
        
        if (typeof createExplosion === 'function') {
            createExplosion(centerX, centerY); 
        }
        
        updateMenuInfo(); 
        obs.remove();
    }

    // --- 3. ЛОГИКА ЧЕРНОГО ПОДАРКА (ШТРАФ) ---
    else if (type === "gift_black") {
        if (currentSkin === "pirate") {
            console.log("Пират игнорирует штраф!");
            obs.remove();
        } else {
            let loss = 15 + Math.floor(Math.random() * 15);
            coins = Math.max(0, coins - loss);
            comboCount = 0;
            comboMultiplier = 1;

            if (typeof createCubeBoom === 'function') {
                createCubeBoom(centerX, centerY);
            }

            updateScore();
            obs.remove();
        }
    }

    // --- 4. ПРЕПЯТСТВИЯ (BAD) ---
    else if (type === "bad") { 
        if (shieldActive) {
            obs.remove();
            shieldActive = false;
            if (p) p.classList.remove("shield-aura");
            if (p) p.classList.remove("skin-silver-aura");
        } else if (currentSkin === "pirate" && !pirateShieldUsed) {
            pirateShieldUsed = true;
            createCubeBoom(centerX, centerY);
            if (p) p.classList.remove("skin-pirate-aura");
            obs.remove();
        } else {
            gameOver();
        }
    }
} // <--- ЗАКРЫВАЮЩАЯ СКОБКА ВСЕЙ ФУНКЦИИ

let silverTimer = null;

function activateSilverInvincibility() {
    shieldActive = true; 
    const p = document.getElementById("player");
    
    if (p) {
        p.classList.add("skin-silver-aura");
    }

    if (silverTimer) clearTimeout(silverTimer);
    
    silverTimer = setTimeout(() => {
        shieldActive = false;
        if (p) p.classList.remove("skin-silver-aura");
        console.log("Защита Силвера закончилась");
    }, 30000); 
}
        
function updateScore() {
    // Используем textContent — это в десятки раз быстрее, чем innerHTML
    const coinCountEl = document.getElementById("coinCount");
    const bestScoreEl = document.getElementById("bestScore");
    
    if (coinCountEl) coinCountEl.textContent = coins;
    if (bestScoreEl) bestScoreEl.textContent = best;
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(loopId); // Останавливаем цикл отрисовки
    clearInterval(window.spawnTimer);

    // 1. ПОЛНАЯ ЗАЧИСТКА: Удаляем все препятствия и частицы
    const obstacles = document.querySelectorAll(".obstacle");
    obstacles.forEach(obs => obs.remove());

    const particles = document.querySelectorAll(".speed-particle");
    particles.forEach(p => p.remove());

    console.log("Игра окончена, поле очищено.");

    // 2. СОХРАНЕНИЕ ДАННЫХ
    totalCoins += coins;
    if (coins > best) best = coins;
    saveUserData();

    // 3. ПОКАЗ ЭКРАНА СМЕРТИ
    // У тебя в коде два разных ID экрана: "lose-screen" и "gameOverScreen". 
    // Я объединил их проверку, чтобы сработал нужный.
    const loseScreen = document.getElementById("lose-screen");
    if (loseScreen) {
        loseScreen.style.display = "flex";
    }

    const goScreen = document.getElementById("gameOverScreen");
    if (goScreen) {
        goScreen.classList.remove("hidden");
        
        // Обновляем текст счета (БА-БАХ!)
        const finalScoreEl = document.getElementById("final-score");
        if (finalScoreEl) {
            finalScoreEl.innerText = coins;
        }
    }
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
// --- ОБНОВЛЕННЫЕ СВАЙПЫ С АНИМАЦИЕЙ ---
document.addEventListener("touchend", e => {
    if (!gameRunning || isPaused) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 25) return;

    const p = document.getElementById("player");
    if (!p) return;

    // Убираем старые классы анимации, если они вдруг остались
    p.classList.remove("berry-move-left", "berry-move-right");

    if (diff > 0) {
        // Движение ВПРАВО
        targetLane = Math.min(3, targetLane + 1);
        p.classList.add("berry-move-right"); // Добавляем класс анимации
    } else {
        // Движение ВЛЕВО
        targetLane = Math.max(0, targetLane - 1);
        p.classList.add("berry-move-left"); // Добавляем класс анимации
    }

    // Применяем позицию
    p.style.left = lanes[targetLane] + "%";

    // ОЧЕНЬ ВАЖНО: Через 300мс убираем класс, чтобы анимацию можно было запустить снова
    setTimeout(() => {
        p.classList.remove("berry-move-left", "berry-move-right");
    }, 300); // Время должно совпадать с временем в CSS (0.3s)
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
        inventory.magnet--; 
        magnetActive = true;
        document.getElementById("player").classList.add("magnet-aura");
        updateBonusUI();
        
        // Бонус времени для Звездного Берри
        let mDuration = (currentSkin === "star") ? 16000 : 10000; 

        setTimeout(() => { 
            magnetActive = false; 
            document.getElementById("player").classList.remove("magnet-aura"); 
            updateBonusUI();
        }, mDuration); // Используем переменную, а не 10000!
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

// --- ОБНОВЛЕННАЯ КЛАВИАТУРА С АНИМАЦИЕЙ ---
document.addEventListener("keydown", (e) => {
    if (!gameRunning || isPaused) return;

    const p = document.getElementById("player");
    if (!p) return;

    // Убираем старые классы
    p.classList.remove("berry-move-left", "berry-move-right");

    let moved = false;

    if (e.key === "ArrowLeft" || e.code === "KeyA") {
        targetLane = Math.max(0, targetLane - 1);
        p.classList.add("berry-move-left"); // Анимация влево
        moved = true;
    } 
    else if (e.key === "ArrowRight" || e.code === "KeyD") {
        targetLane = Math.min(laneCount - 1, targetLane + 1);
        p.classList.add("berry-move-right"); // Анимация вправо
        moved = true;
    }

    if (moved) {
        p.style.left = lanes[targetLane] + "%";
        
        // Убираем класс через 300мс
        setTimeout(() => {
            p.classList.remove("berry-move-left", "berry-move-right");
        }, 300);
    }
});

function createCollectExplosion(x, y, color) {
    const gameLayer = document.getElementById("game");
    for (let i = 0; i < 8; i++) { // Создаем 8 искр
        const p = document.createElement("div");
        p.className = "collect-particle";
        
        // Цвет искр под цвет мороженого (или просто золотистый/белый)
        p.style.background = color || "#ffcc00";
        p.style.left = x + "px";
        p.style.top = y + "px";
        
        // Случайное направление разлета
        const angle = (Math.PI * 2 / 8) * i;
        const dist = 50 + Math.random() * 30;
        const ex = Math.cos(angle) * dist + "px";
        const ey = Math.sin(angle) * dist + "px";
        
        p.style.setProperty('--ex', ex);
        p.style.setProperty('--ey', ey);
        
        gameLayer.appendChild(p);
        setTimeout(() => p.remove(), 500);
    }
}
// Ждем загрузки DOM, чтобы кнопки точно существовали
document.addEventListener('DOMContentLoaded', () => {
    const retryBtn = document.getElementById("retryBtn"); // Проверьте, что ID совпадает с вашим в HTML
    const menuBtn = document.getElementById("menuBtn");

    if (retryBtn) {
        retryBtn.addEventListener("click", () => {
            initAudio(); // "Пинаем" аудио-контекст
            startGame();
        });
    }

    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            initAudio(); // Тоже активируем звук, если игрок ушел в меню
            showMenu(); 
        });
    }
});

// Запускаем обновление интерфейса скинов сразу при загрузке скрипта
updateSkinUI();

function buySkin(skinId, price) {
    // 1. Приводим все к числам сразу, чтобы избежать проблем со сравнением "100" > 50
    let numericPrice = Number(price);
    totalDiamonds = Number(totalDiamonds);

    // Если цена не пришла, берем из справочника
    if (!numericPrice) {
        const prices = { 'pirate': 300, 'silver': 500, 'star': 100 };
        numericPrice = prices[skinId] || 0;
    }

    // 2. Убеждаемся, что inventory и массив skins существуют (защита от ошибок при первом запуске)
    if (!inventory) inventory = { magnet: 0, shield: 0, skins: ["default"] };
    if (!inventory.skins) inventory.skins = ["default"];

    // 3. Проверяем, не куплен ли он уже
    if (inventory.skins.includes(skinId)) {
        alert("Этот скин уже куплен! Просто выбери его в меню.");
        return;
    }

    // 4. Проверяем баланс
    if (totalDiamonds >= numericPrice) {
        totalDiamonds -= numericPrice; 
        
        // Добавляем в список купленных
        inventory.skins.push(skinId);

        // Устанавливаем как активный
        activeSkin = skinId;
        currentSkin = skinId; 

        // 5. Сохраняем и обновляем
        saveUserData(); // Теперь в Firebase уйдет обновленный массив со скином
        updateMenuInfo(); 
        
        // Важно: вызываем обновление кнопок, чтобы "Купить" исчезло
        if (typeof updateSkinUI === "function") {
            updateSkinUI(); 
        }
        
        alert(`Поздравляем! Вы открыли новый облик!`);
    } else {
        alert("Вам не хватает " + (numericPrice - totalDiamonds) + " алмазов!");
    }
}

function onPurchaseSuccess(skinId) {
    // 1. Сохраняем локально, чтобы сработало мгновенно
    if (!purchasedSkins.includes(skinId)) {
        purchasedSkins.push(skinId);
        localStorage.setItem('berry_inventory', JSON.stringify(purchasedSkins));
    }

    // 2. Отправляем в Firebase для "вечного" хранения
    if (userId) {
        const userRef = ref(db, 'users/' + userId);
        update(userRef, {
            inventory: purchasedSkins
        }).then(() => {
            console.log("Данные синхронизированы с облаком");
        }).catch((error) => {
            console.error("Ошибка сохранения в Firebase:", error);
        });
    }
}

function selectSkin(skinId) {
    // Проверяем наличие скина в инвентаре
    if (inventory.skins && inventory.skins.includes(skinId)) {
        activeSkin = skinId;
        currentSkin = skinId; // Синхронизируем обе переменные

        // Находим данные о скине в основном массиве skins
        const skinData = skins.find(s => s.id === skinId);
        
        if (!skinData) {
            console.error("Данные скина не найдены в массиве skins:", skinId);
            return;
        }

        // 1. Обновляем картинку в меню превью
        const preview = document.getElementById("skinPreview");
        if (preview) {
            preview.style.backgroundImage = `url('${skinData.img}')`;[cite: 1]
        }

        // 2. СРАЗУ обновляем игрока (картинку + ауру)
        const p = document.getElementById("player");
        if (p) {
            // Берем путь к файлу напрямую из данных скина (skinData.img)
            p.style.backgroundImage = `url('${skinData.img}')`;[cite: 1]
            
            // ОБЯЗАТЕЛЬНО: Обновляем классы аур
            // Сначала удаляем все возможные старые ауры
            p.classList.remove("skin-star-aura", "skin-pirate-aura", "skin-silver-aura");[cite: 3]
            
            // Добавляем новую ауру, если она нужна (не дефолтный скин)
            if (skinId !== 'default') {
                p.classList.add(`skin-${skinId}-aura`);[cite: 3]
            }
        }

        // Сохраняем состояние
        saveUserData(); // Отправляем обновленный activeSkin в Firebase
        localStorage.setItem("activeSkin", skinId); // Дублируем в локальную память для надежности[cite: 1]
        
        updateSkinUI(); // Обновляем кнопки в меню (Выбрано/Выбрать)
        console.log("Скин успешно применен: " + skinId);[cite: 1]
    }
}
