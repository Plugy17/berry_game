function initAudio() {
    // Проигрываем и сразу ставим на паузу пустой звук или наш эффект
    soundCollect.play().then(() => {
        soundCollect.pause();
        soundCollect.currentTime = 0;
    }).catch(e => console.log("Audio waiting for user tap"));
}

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
    // 1. Проверяем ник (если его нет)
    if (!nick) {
        const val = document.getElementById("nick")?.value.trim();
        if (!val || val.length < 2) return alert("Введи имя!");
        nick = val; 
        userId = val;
        localStorage.setItem("nick", nick);
    }

    // 2. ОСТАНАВЛИВАЕМ старые процессы перед запуском новых
    stopIceRain(); 
    if (loopId) {
        cancelAnimationFrame(loopId); // Убиваем старый цикл игры
        loopId = null;
    }

    // 3. СКРЫВАЕМ ВСЕ ОКНА (и меню, и экран проигрыша)
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("gameOverScreen").classList.add("hidden"); // Важно добавить эту строку!
    document.getElementById("game").classList.remove("hidden");

    // 4. СБРОС И ЗАПУСК
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
    if (!gameRunning) return;

    const gameLayer = document.getElementById("game");
    if (!gameLayer) return;

    // Создаем НОВЫЙ элемент
    const obs = document.createElement("div");
    obs.className = "obstacle"; // Важно: класс должен совпадать с тем, что в CSS
    
    const isGood = Math.random() < 0.6;
    obs.dataset.type = isGood ? "good" : "bad";
    
    // Используем твои переменные путей к картинкам
    obs.style.backgroundImage = isGood ? imgIceCream : imgBad;

    // Выбираем линию из твоего массива lanes
    const obstacleLane = Math.floor(Math.random() * lanes.length);
    obs.style.left = lanes[obstacleLane] + "%";
    
    // Начальная позиция над экраном
    obs.style.top = "-150px"; 
    obs.style.display = "block";

    gameLayer.appendChild(obs);
}

function update() {
    if (!gameRunning) return;

    const p = document.getElementById("player");
    if (!p) return;

    const pRect = p.getBoundingClientRect();

    // 1. ЭФФЕКТ ШЛЕЙФА (оставляем без изменений)
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

    // 2. ДВИЖЕНИЕ И ПРОВЕРКА СТОЛКНОВЕНИЙ
    const obstacles = document.querySelectorAll(".obstacle");
    obstacles.forEach(obstacle => {
        // --- ДОБАВЛЯЕМ ДВИЖЕНИЕ ---
        let currentTop = parseFloat(obstacle.style.top) || -150;
        currentTop += speed; // Убедись, что переменная speed у тебя объявлена (например, 5 или 7)
        obstacle.style.top = currentTop + "px";

        // --- УДАЛЕНИЕ, ЕСЛИ УЛЕТЕЛ ЗА ЭКРАН ---
        if (currentTop > window.innerHeight) {
            obstacle.remove();
            spawnObstacle(); // Спавним новый взамен улетевшего
            return; // Переходим к следующему объекту
        }

        // --- ПРОВЕРКА СТОЛКНОВЕНИЙ ---
        const obsRect = obstacle.getBoundingClientRect();
        const inset = 15; 

        if (
            pRect.left + inset < obsRect.right &&
            pRect.right - inset > obsRect.left &&
            pRect.top + inset < obsRect.bottom &&
            pRect.bottom - inset > obsRect.top
        ) {
            handleCollision(obstacle, p);
        }
    });

    loopId = requestAnimationFrame(update);
}

function handleCollision(obs, p) {
    const rect = obs.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const comboEl = document.getElementById("combo-display");

    if (obs.dataset.type === "good") {
        // ЗВУК (тихий)
        if (typeof soundCollect !== 'undefined' && soundCollect) {
            soundCollect.volume = 0.3;
            soundCollect.currentTime = 0;
            soundCollect.play().catch(e => console.log("Audio blocked"));
        }

        // ЛОГИКА КОМБО
        comboCount++;
        if (comboCount >= 12) comboMultiplier = 5;
        else if (comboCount >= 8) comboMultiplier = 4;
        else if (comboCount >= 5) comboMultiplier = 3;
        else if (comboCount >= 2) comboMultiplier = 2;
        else comboMultiplier = 1;

        // ВИЗУАЛ КОМБО
        if (comboEl && comboCount >= 2) {
            comboEl.innerText = "x" + comboMultiplier;
            comboEl.style.opacity = "1";
            if (comboMultiplier >= 5) comboEl.style.color = "#ffff00";
            else if (comboMultiplier >= 3) comboEl.style.color = "#00f2ff";
            else comboEl.style.color = "#ffffff";

            comboEl.classList.remove("combo-pop");
            void comboEl.offsetWidth; 
            comboEl.classList.add("combo-pop");
        }

        // ЭФФЕКТЫ
        const explosionColor = comboMultiplier >= 3 ? "#ff00ff" : "#FF69B4";
        createCollectExplosion(centerX, centerY, explosionColor);
        
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }

        createExplosion(centerX, centerY); 
        p.classList.remove("berry-collect");
        void p.offsetWidth; 
        p.classList.add("berry-collect");

        coins += comboMultiplier; 
        updateScore(); 
        spawnObstacle();
    } else {
        // СТОЛКНОВЕНИЕ С ПРЕПЯТСТВИЕМ
        if (shieldActive) {
            comboCount = 0; // Сбрасываем комбо даже при щите
            comboMultiplier = 1;
            if (comboEl) comboEl.style.opacity = "0";

            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
            }

            const gameEl = document.getElementById("game");
            if (gameEl) {
                gameEl.classList.add("screen-shake");
                setTimeout(() => gameEl.classList.remove("screen-shake"), 300);
            }

            createCubeBoom(centerX, centerY); 
            shieldActive = false; 
            p.classList.remove("shield-aura");
            p.classList.add("berry-hit-shield");
            spawnObstacle();
        } else {
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }
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
    if (loopId) cancelAnimationFrame(loopId); // Останавливаем цикл немедленно

    // --- ОБНУЛЯЕМ КОМБО ПРИ СМЕРТИ ---
    comboCount = 0;
    comboMultiplier = 1;
    const comboEl = document.getElementById("combo-display");
    if (comboEl) {
        comboEl.style.opacity = "0"; // Прячем надпись x2, x3...
        comboEl.innerText = "";
    }

    totalCoins += coins;
    if (coins > best) best = coins;
    
    saveUserData();

    // Показываем экран смерти
    const goScreen = document.getElementById("gameOverScreen");
    if (goScreen) {
        goScreen.classList.remove("hidden");
        // Обновляем текст на экране "БА-БАХ!"
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
    if (!gameRunning) return;
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

// --- ОБНОВЛЕННАЯ КЛАВИАТУРА С АНИМАЦИЕЙ ---
document.addEventListener("keydown", (e) => {
    if (!gameRunning) return;

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
