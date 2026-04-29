let laneCount = 4;
let lanes = [12.5, 37.5, 62.5, 87.5]; 
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -150; 
let loopId = null;

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

const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";

// --- РАБОТА С FIREBASE ---

function loadUserData(playerNick) {
    db.ref('players/' + playerNick).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            best = data.best || 0;
            totalCoins = data.totalCoins || 0;
            inventory.shield = data.inventory?.shield || 0;
            inventory.magnet = data.inventory?.magnet || 0;
        } else {
            saveUserData(); // Создаем нового игрока
        }
        updateMenuInfo();
    });
}

function saveUserData() {
    if (!nick) return;
    db.ref('players/' + nick).set({
        best: best,
        totalCoins: totalCoins,
        inventory: inventory
    });
}

// --- ЛОГИКА ИГРЫ ---

window.onload = () => { 
    if(nick) loadUserData(nick);
    else updateMenuInfo();
};

function updateMenuInfo() {
    const welcome = document.getElementById("welcome");
    const nickInput = document.getElementById("nick");
    if (nick && welcome) {
        welcome.innerHTML = `<span style="color:white">Герой <b>${nick}</b></span>`;
        if(nickInput) nickInput.style.display = "none";
    }
    document.getElementById("menuLeaderboard").innerText = "🏆 " + best;
    document.getElementById("total-balance").innerHTML = `${totalCoins} <img src="assets/icecream.png" class="mini-ice">`;
    document.getElementById("shop-balance").innerText = "Баланс: " + totalCoins;
    updateBonusUI();
}

function updateBonusUI() {
    document.getElementById("count-shield").innerText = inventory.shield;
    document.getElementById("count-magnet").innerText = inventory.magnet;
}

function startGame() {
    const nickInput = document.getElementById("nick");
    if (!nick) {
        const val = nickInput.value.trim();
        if (val.length < 2) return alert("Введи ник!");
        nick = val;
        localStorage.setItem("nick", nick);
        loadUserData(nick);
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
    p.classList.remove("shield-aura");
    p.style.left = lanes[targetLane] + "%";
    
    updateScore();
    spawnObstacle();
    if (loopId) cancelAnimationFrame(loopId);
    update();
}

function spawnObstacle() {
    const obs = document.getElementById("obstacle");
    if(!obs) return;
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
    
    if (magnetActive && obs.dataset.type === "good") {
        obstacleLane = targetLane;
        obs.style.left = lanes[obstacleLane] + "%";
    }
    obs.style.top = obstacleY + "px";

    let pRect = p.getBoundingClientRect();
    let oRect = obs.getBoundingClientRect();

    if (oRect.bottom > pRect.top + 20 && oRect.top < pRect.bottom - 20 && obstacleLane === targetLane) {
        if (obs.dataset.type === "good") {
            comboCount++;
            comboMultiplier = comboCount >= 6 ? 3 : (comboCount >= 3 ? 2 : 1);
            if(comboMultiplier > 1) {
                const ui = document.getElementById("combo-ui");
                ui.innerText = "x" + comboMultiplier;
                ui.classList.remove("hidden");
            }
            coins += comboMultiplier;
            updateScore();
            spawnObstacle();
        } else {
            gameOver();
            return;
        }
    }

    if (obstacleY > window.innerHeight) {
        if (obs.dataset.type === "good") { comboCount = 0; comboMultiplier = 1; document.getElementById("combo-ui").classList.add("hidden"); }
        spawnObstacle();
    }
    loopId = requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById("hud").innerHTML = `
        <div class="hud-coins"><img src="assets/icecream.png" class="hud-ice"> ${coins}</div>
        <div class="hud-best">Best: ${best}</div>
    `;
}

function gameOver() {
    if (shieldActive) {
        shieldActive = false;
        document.getElementById("player").classList.remove("shield-aura");
        spawnObstacle(); return;
    }
    gameRunning = false;
    totalCoins += coins;
    if (coins > best) best = coins;
    
    saveUserData(); // Сохранение в Firebase
    alert("Игра окончена! Собрано: " + coins);
    backToMenu();
}

function backToMenu() {
    gameRunning = false;
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    updateMenuInfo();
}

// Управление свайпами
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 30) return;
    if (diff > 0) targetLane = Math.min(3, targetLane + 1);
    else targetLane = Math.max(0, targetLane - 1);
    const p = document.getElementById("player");
    p.style.left = lanes[targetLane] + "%";
});

function buyItem(type) {
    if (totalCoins >= PRICES[type]) {
        totalCoins -= PRICES[type];
        inventory[type]++;
        saveUserData(); // Сохранение покупки в Firebase
        updateMenuInfo();
    } else alert("Мало BERRY!");
}

function useShield() {
    if (inventory.shield > 0 && !shieldActive && gameRunning) {
        inventory.shield--; shieldActive = true;
        document.getElementById("player").classList.add("shield-aura");
        saveUserData();
        updateBonusUI();
    }
}

function useMagnet() {
    if (inventory.magnet > 0 && !magnetActive && gameRunning) {
        inventory.magnet--; magnetActive = true;
        saveUserData();
        updateBonusUI();
        setTimeout(() => { magnetActive = false; }, 10000);
    }
}

function openShop() { document.getElementById("menu").classList.add("hidden"); document.getElementById("shop").classList.remove("hidden"); }
function closeShop() { document.getElementById("shop").classList.add("hidden"); document.getElementById("menu").classList.remove("hidden"); }
