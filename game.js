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
let currentSkinIndex = 0;
let activeSkin = "default"; // Тот, что реально выбран для игры

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
        const isOwned = skin.id === "default" || (inventory.skins && inventory.skins.includes(skin.id));
        
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
            
            // Загружаем новую валюту и активный скин
            totalDiamonds = data.totalDiamonds || 0; 
            currentSkin = data.currentSkin || "default";
            activeSkin = data.currentSkin || "default";

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
    const diffSelect = document.getElementById("difficulty");
    const level = diffSelect ? diffSelect.value : 'medium';

    if (!nick) {
        const val = document.getElementById("nick")?.value.trim();
        if (!val || val.length < 2) return alert("Введи имя!");
        nick = val; 
        userId = val;
        localStorage.setItem("nick", nick);
        const p = document.getElementById("player");
if (currentSkin === "star") p.classList.add("skin-star");
    }

    // Настраиваем параметры под сложность
    let spawnRate = 1000; // Частота появления в мс
    if (level === 'easy') {
        baseSpeed = 6;      
        difficulty = 0.001; 
        spawnRate = 1200;   // Реже на легком
    } else if (level === 'medium') {
        baseSpeed = 7;      
        difficulty = 0.002;
        spawnRate = 1000;
    } else if (level === 'hard') {
        baseSpeed = 11;     
        difficulty = 0.005; 
        spawnRate = 600;    // Чаще на сложном
    }

    speed = baseSpeed;       
    lastSpawnTime = 0;       
    
    // 1. Очистка старых данных
    document.querySelectorAll(".obstacle").forEach(obs => obs.remove()); 
    if (window.gameInterval) clearInterval(window.gameInterval); // Убиваем старый таймер спавна

    // 2. ЗАПУСК АВТОНОМНОГО СПАВНА (Это решит проблему зависаний)
    window.gameInterval = setInterval(() => {
        if (gameRunning && !isPaused) {
            spawnObstacle();
        }
    }, spawnRate);

    stopIceRain(); 
    if (loopId) cancelAnimationFrame(loopId);

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("gameOverScreen").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");

    resetGame();
}

function resetGame() {
    // 1. Сброс игровых механик
    coins = 0; 
    comboCount = 0; 
    comboMultiplier = 1;
    shieldActive = false; 
    magnetActive = false;
    targetLane = 1; 
    speed = baseSpeed;[cite: 1]
    gameRunning = true;
    
    // Сброс уникальных способностей скинов
    pirateShieldUsed = false; 
    if (typeof silverTimer !== 'undefined' && silverTimer) clearTimeout(silverTimer);

    // 2. РАБОТА С ПЕРСОНАЖЕМ (Объявляем 'p' только ОДИН раз)
    const p = document.getElementById("player");[cite: 1]
    
    if (p) {
        p.className = ""; // Очищаем старые ауры и эффекты
        p.style.filter = "none";
        
        // Добавляем класс в зависимости от активного скина
        if (currentSkin === "star") p.classList.add("skin-star");[cite: 1]
        
        if (currentSkin === "pirate") {
            p.classList.add("skin-pirate-aura"); // Аура со значками для Пирата
        }
        
        if (currentSkin === "silver") {
            // Силвер начинает без визуальных эффектов (они появятся от алмаза)
        }
        
        p.style.left = lanes[targetLane] + "%";[cite: 1]
    }

    // 3. Запуск игрового цикла
    updateScore(); 
    updateBonusUI();
    if (loopId) cancelAnimationFrame(loopId);
    spawnObstacle();
    update();[cite: 1]
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

    setTimeout(() => {

        else if (type === "gift_black") {
    // Если игрок Пират — штраф не списывается
    if (currentSkin === "pirate") {
        console.log("Пират игнорирует штраф!");
        obs.remove();
        return; 
    }

        else if (currentSkin === "pirate" && !pirateShieldUsed) {
    pirateShieldUsed = true;
    createCubeBoom(centerX, centerY);[cite: 1]
    
    // Убираем пиратскую ауру, так как защита потрачена
    if (p) p.classList.remove("skin-pirate-aura");
    
    obs.remove();[cite: 1]
}

            else {
    if (shieldActive) {
        // ... код щита
    } else if (currentSkin === "pirate" && !pirateShieldUsed) {
        // Пират ломает препятствие один раз за забег
        pirateShieldUsed = true;
        createCubeBoom(centerX, centerY); // Эффект взрыва[cite: 1]
        obs.remove();
        // Можно добавить визуальный эффект, что броня спала
        p.style.filter = "grayscale(0.5)"; 
    } else {
        gameOver();[cite: 1]
    }
}

            else if (type === "gift_purple") {
    let addDia = Math.floor(Math.random() * 2) + 1;[cite: 1]
    totalDiamonds += addDia;[cite: 1]

    if (currentSkin === "silver") {
        activateSilverInvincibility(); // Запуск 30 сек защиты[cite: 1]
    }
    
    updateMenuInfo();[cite: 1]
    obs.remove();[cite: 1]
}

        let silverTimer = null;

function activateSilverInvincibility() {
    shieldActive = true; // Используем существующую механику щита[cite: 1]
    const p = document.getElementById("player");
    if (p) p.classList.add("shield-aura");[cite: 1]
    
    if (p) {
        p.classList.add("skin-silver-aura");
 }

    if (silverTimer) clearTimeout(silverTimer);
    
    silverTimer = setTimeout(() => {
        shieldActive = false;
        if (p) p.classList.remove("shield-aura");[cite: 1]
        console.log("Защита Силвера закончилась");
    }, 30000); // 30 секунд
}
        // --- 1. ЛОГИКА МОРОЖЕНОГО (GOOD) ---
        if (type === "good") {
            if (soundCollect) {
                soundCollect.currentTime = 0;
                soundCollect.play().catch(() => {});
            }

            comboCount++;
            // Используем динамический лимит: 8 для звезды, 5 для обычного
            let maxComboLimit = (currentSkin === "star") ? 8 : 5;
            comboMultiplier = Math.min(maxComboLimit, Math.floor(comboCount / 3) + 1);

            const comboEl = document.getElementById("combo-display");
            if (comboEl && comboCount >= 2) {
                comboEl.innerText = "x" + comboMultiplier;
                comboEl.style.opacity = "1";
                // Добавим эффект пульсации при росте комбо
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
            // Редкая валюта: умеренно 1-2 алмаза
            let addDia = Math.floor(Math.random() * 2) + 1;
            totalDiamonds += addDia;
            
            // Визуальный эффект алмаза (синие искры)
            if (typeof createExplosion === 'function') {
                createExplosion(centerX, centerY); 
            }
            
            updateMenuInfo(); // Обновляем счетчики везде
            obs.remove();
        }

        // --- 3. ЛОГИКА ЧЕРНОГО ПОДАРКА (ШТРАФ) ---
        else if (type === "gift_black") {
            let loss = 15 + Math.floor(Math.random() * 15);
            coins = Math.max(0, coins - loss);
            
            // Сбрасываем комбо при плохом подарке
            comboCount = 0;
            comboMultiplier = 1;
            
            if (typeof createCubeBoom === 'function') {
                createCubeBoom(centerX, centerY); // Эффект взрыва
            }
            
            updateScore();
            obs.remove();
        }

        // --- 4. ПРЕПЯТСТВИЯ (BAD) ---
        else {
            if (shieldActive) {
                obs.remove(); 
                shieldActive = false; 
                p.classList.remove("shield-aura");
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
                }
            } else {
                gameOver();
            }
        }
    }, 0);
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
    // 1. Проверяем, не куплен ли он уже
    if (inventory.skins && inventory.skins.includes(skinId)) {
        alert("Этот скин уже куплен!");
        return;
    }

    // 2. Проверяем баланс алмазов
    if (totalDiamonds >= price) {
        totalDiamonds -= price; // Списываем валюту
        
        // 3. Добавляем в инвентарь
        if (!inventory.skins) inventory.skins = ["default"];
        inventory.skins.push(skinId);

        // 4. Устанавливаем как активный
        activeSkin = skinId;
        currentSkin = skinId; // Для мгновенной синхронизации

        // 5. Сохраняем в Firebase и обновляем UI
        saveUserData(); // Отправка данных в облако
        updateMenuInfo(); // Обновление счетчиков алмазов
        updateSkinUI(); // Обновление выбора скина в главном меню[cite: 1]
        
        alert(`Поздравляем! Вы открыли скин: ${skinId}`);
    } else {
        alert("Недостаточно алмазов для этой покупки!");
    }
}

