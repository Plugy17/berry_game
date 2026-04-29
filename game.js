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
let inventory = { magnet: 0, shield: 0 };
const PRICES = { magnet: 500, shield: 300 };

let shieldActive = false;
let magnetActive = false;
let comboCount = 0;
let comboMultiplier = 1;

// ИСПРАВЛЕННЫЕ ПУТИ
const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";

// --- FIREBASE (БЕЗ ИЗМЕНЕНИЙ) ---
function loadUserData(playerNick) {
    if (!window.db) return updateMenuInfo();
    db.ref('players/' + playerNick).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            best = data.best || 0;
            totalCoins = data.totalCoins || 0;
            inventory.shield = (data.inventory && data.inventory.shield) || 0;
            inventory.magnet = (data.inventory && data.inventory.magnet) || 0;
        }
        updateMenuInfo();
    }).catch(() => updateMenuInfo());
}

function saveUserData() {
    if (!nick || !window.db) return;
    db.ref('players/' + nick).set({ best, totalCoins, inventory });
}

window.onload = () => { if(nick) loadUserData(nick); else updateMenuInfo(); };

function updateMenuInfo() {
    if (nick) {
        document.getElementById("welcome").innerHTML = `Герой <b>${nick}</b>`;
        document.getElementById("nick").style.display = "none";
    }
    document.getElementById("menuLeaderboard").innerText = "🏆 " + best;
    document.getElementById("total-balance").innerHTML = `${totalCoins} 🍦`;
    document.getElementById("shop-balance").innerText = totalCoins + " 🍦";
    updateBonusUI();
}

function updateBonusUI() {
    document.getElementById("count-shield").innerText = inventory.shield;
    document.getElementById("count-magnet").innerText = inventory.magnet;
}

function startGame() {
    if (!nick) {
        const val = document.getElementById("nick").value.trim();
        if (val.length < 2) return alert("Введи имя!");
        nick = val; localStorage.setItem("nick", nick);
    }
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
    targetLane = 1; speed = baseSpeed; gameRunning = true;
    const p = document.getElementById("player");
    p.className = ""; p.style.left = lanes[targetLane] + "%";
    // ДОБАВЛЕНО: сброс поворота при рестарте
    p.style.transform = "translateX(-50%) rotate(0deg)"; 
    updateScore(); 
    spawnObstacle();
    updateBonusUI(); // ДОБАВЛЕНО: возврат баффов на экран игры
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
    obs.style.top = obstacleY + "px";
    const playerTop = window.innerHeight * 0.75; 
    if (obstacleLane === targetLane && obstacleY > playerTop - 40 && obstacleY < playerTop + 40) {
        handleCollision(obs, document.getElementById("player"));
    }
    if (obstacleY > window.innerHeight) {
        if (obs.dataset.type === "good") { 
            comboCount = 0; 
            comboMultiplier = 1; 
            document.getElementById("combo-ui").classList.add("hidden"); 
        }
        spawnObstacle();
    }
    if (gameRunning) loopId = requestAnimationFrame(update);
}

function handleCollision(obs, p) {
    if (obs.dataset.type === "good") {
        comboCount++;
        comboMultiplier = comboCount >= 6 ? 3 : (comboCount >= 3 ? 2 : 1);
        const ui = document.getElementById("combo-ui");
        if(comboMultiplier > 1) { ui.innerText = "x" + comboMultiplier; ui.classList.remove("hidden"); }
        coins += comboMultiplier; updateScore(); spawnObstacle();
    } else if (obs.dataset.type === "bad") {
        if (shieldActive) {
            shieldActive = false; p.classList.remove("shield-aura");
            obstacleY = window.innerHeight + 500; spawnObstacle();
            updateBonusUI(); // ДОБАВЛЕНО: обновление иконок баффов
        } else gameOver();
    }
}

function updateScore() {
    document.getElementById("hud").innerHTML = `🍦 ${coins} | 🏆 ${best}`;
}

function gameOver() {
    gameRunning = false; totalCoins += coins;
    if (coins > best) best = coins;
    saveUserData();
    alert("Игра окончена! Собрано: " + coins);
    backToMenu();
}

function backToMenu() {
    gameRunning = false;
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    updateMenuInfo();
}

// УПРАВЛЕНИЕ (ДОБАВЛЕН ЖИВОЙ БЕРРИ - ПОВОРОТЫ)
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 30) return;

    const p = document.getElementById("player");
    if (diff > 0) {
        targetLane = Math.min(3, targetLane + 1);
        p.style.transform = "translateX(-50%) rotate(15deg)"; // Наклон вправо
    } else {
        targetLane = Math.max(0, targetLane - 1);
        p.style.transform = "translateX(-50%) rotate(-15deg)"; // Наклон влево
    }
    
    p.style.left = lanes[targetLane] + "%";
    
    // Возвращаем в прямое положение через 200мс
    setTimeout(() => {
        p.style.transform = "translateX(-50%) rotate(0deg)";
    }, 200);
});

// МАГАЗИН И БОНУСЫ
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
        setTimeout(() => { magnetActive = false; document.getElementById("player").classList.remove("magnet-aura"); }, 10000);
    }
}

function createFallingEffects() {
    const shopScreen = document.getElementById("shop");
    document.querySelectorAll('.falling-ice').forEach(p => p.remove());
    for (let i = 0; i < 15; i++) {
        const ice = document.createElement("div");
        ice.className = "falling-ice";
        ice.style.left = Math.random() * 100 + "vw";
        ice.style.animationDuration = (Math.random() * 3 + 2) + "s";
        ice.style.backgroundImage = imgIceCream; 
        ice.style.backgroundSize = "contain";
        ice.style.height = "25px";
        shopScreen.appendChild(ice);
    }
}

function openShop() { document.getElementById("menu").classList.add("hidden"); document.getElementById("shop").classList.remove("hidden"); createFallingEffects(); }
function closeShop() { document.getElementById("shop").classList.add("hidden"); document.getElementById("menu").classList.remove("hidden"); }
