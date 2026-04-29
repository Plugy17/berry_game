let laneCount = 4;
let lanes = [12.5, 37.5, 62.5, 87.5]; 
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -150; 
let loopId = null;

let nick = localStorage.getItem("nick");
let coins = 0;
let best = parseInt(localStorage.getItem("best")) || 0;
let totalCoins = parseInt(localStorage.getItem("totalCoins")) || 0;

let speed = 6;
let baseSpeed = 6;
let difficulty = 0.002;

let inventory = {
    magnet: parseInt(localStorage.getItem("inv_magnet")) || 0,
    shield: parseInt(localStorage.getItem("inv_shield")) || 0
};
const PRICES = { magnet: 500, shield: 300 };

let shieldActive = false;
let magnetActive = false;
let magnetTimer = null;
let comboCount = 0;
let isRainbowMode = false;

const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";

window.onload = () => {
    updateMenuInfo();
};

function updateMenuInfo() {
    const welcome = document.getElementById("welcome");
    const nickInput = document.getElementById("nick");
    if (nick && welcome) {
        welcome.innerHTML = `Герой <b>${nick}</b> готов!`;
        if(nickInput) nickInput.style.display = "none";
    }
    
    const leader = document.getElementById("menuLeaderboard");
    if(leader) leader.innerText = "🏆 " + best;

    const balanceHTML = `${totalCoins} <img src="assets/icecream.png" style="width:20px;">`;
    const totalBal = document.getElementById("total-balance");
    const shopBal = document.getElementById("shop-balance");
    
    if(totalBal) totalBal.innerHTML = balanceHTML;
    if(shopBal) shopBal.innerHTML = "Баланс: " + totalCoins;
    
    updateBonusUI();
}

function updateBonusUI() {
    const cs = document.getElementById("count-shield");
    const cm = document.getElementById("count-magnet");
    if(cs) cs.innerText = inventory.shield;
    if(cm) cm.innerText = inventory.magnet;
}

function startGame() {
    const nickInput = document.getElementById("nick");
    if (!nick && nickInput) {
        const val = nickInput.value.trim();
        if (val.length < 2) return alert("Введи ник!");
        nick = val;
        localStorage.setItem("nick", nick);
    }
    
    const diff = document.getElementById("difficulty");
    const mode = diff ? diff.value : "medium";
    baseSpeed = mode === "easy" ? 5 : mode === "hard" ? 9 : 7;
    difficulty = mode === "easy" ? 0.001 : mode === "hard" ? 0.003 : 0.002;

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    resetGame();
}

function resetGame() {
    coins = 0; comboCount = 0; isRainbowMode = false;
    shieldActive = false; magnetActive = false;
    targetLane = 1;
    speed = baseSpeed;
    gameRunning = true;

    const player = document.getElementById("player");
    if(player) {
        player.classList.remove("shield-aura");
        player.style.left = lanes[targetLane] + "%";
        player.style.backgroundImage = "url('assets/player.png')"; // Убедись, что путь верный
    }

    updateScore();
    spawnObstacle();
    if (loopId) cancelAnimationFrame(loopId);
    update();
}

function spawnObstacle() {
    obstacleLane = Math.floor(Math.random() * laneCount);
    obstacleY = -150;
    const obs = document.getElementById("obstacle");
    if(!obs) return;
    const isGood = Math.random() < 0.6;
    obs.dataset.type = isGood ? "good" : "bad";
    obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    obs.style.left = lanes[obstacleLane] + "%";
}

function update() {
    if (!gameRunning) return;
    
    obstacleY += speed;
    speed += difficulty;
    
    const obs = document.getElementById("obstacle");
    const player = document.getElementById("player");
    
    if (magnetActive && obs.dataset.type === "good" && obstacleY > 0) {
        obstacleLane = targetLane;
        obs.style.left = lanes[obstacleLane] + "%";
    }
    
    if(obs) obs.style.top = obstacleY + "px";

    let pRect = player.getBoundingClientRect();
    let oRect = obs.getBoundingClientRect();

    if (oRect.bottom > pRect.top + 10 && oRect.top < pRect.bottom - 10 && obstacleLane === targetLane) {
        if (obs.dataset.type === "good") {
            coins += isRainbowMode ? 2 : 1;
            comboCount = isRainbowMode ? 0 : comboCount + 1;
            if(comboCount >= 5) activateRainbow();
            updateScore();
            spawnObstacle();
        } else {
            gameOver();
            return;
        }
    }

    if (obstacleY > window.innerHeight) {
        if (obs.dataset.type === "good") comboCount = 0;
        spawnObstacle();
        updateScore();
    }
    
    loopId = requestAnimationFrame(update);
}

function activateRainbow() {
    isRainbowMode = true; comboCount = 0;
    document.getElementById("game").classList.add("rainbow-active");
    setTimeout(() => {
        isRainbowMode = false;
        document.getElementById("game").classList.remove("rainbow-active");
    }, 5000);
}

function updateScore() {
    const hud = document.getElementById("hud");
    if(!hud) return;
    hud.innerHTML = `<div>🍦 ${coins}</div><div style="font-size:12px">Best: ${best}</div>`;
}

function gameOver() {
    if (shieldActive) {
        shieldActive = false;
        document.getElementById("player").classList.remove("shield-aura");
        spawnObstacle();
        return;
    }
    gameRunning = false;
    totalCoins += coins;
    localStorage.setItem("totalCoins", totalCoins);
    if (coins > best) { best = coins; localStorage.setItem("best", best); }
    alert("Берри врезался! Собрано: " + coins);
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
    document.getElementById("player").style.left = lanes[targetLane] + "%";
});

function openShop() {
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("shop").classList.remove("hidden");
    updateMenuInfo();
}
function closeShop() {
    document.getElementById("shop").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}

function buyItem(type) {
    if (totalCoins >= PRICES[type]) {
        totalCoins -= PRICES[type];
        inventory[type]++;
        localStorage.setItem("totalCoins", totalCoins);
        localStorage.setItem("inv_" + type, inventory[type]);
        updateMenuInfo();
    } else alert("Мало BERRY!");
}

function useShield() {
    if (inventory.shield > 0 && !shieldActive && gameRunning) {
        inventory.shield--;
        shieldActive = true;
        document.getElementById("player").classList.add("shield-aura");
        updateBonusUI();
    }
}

function useMagnet() {
    if (inventory.magnet > 0 && !magnetActive && gameRunning) {
        inventory.magnet--;
        magnetActive = true;
        updateBonusUI();
        setTimeout(() => { magnetActive = false; }, 10000);
    }
}
