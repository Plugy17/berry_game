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

// Переменная для управления дождем
let rainInterval = null;

// ИСПРАВЛЕННЫЕ ПУТИ
const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";

// Функция для создания HTML иконки мороженого
const getIceIcon = () => `<span class="ice-icon"></span>`;

// --- ЭФФЕКТ ПАДАЮЩЕГО МОРОЖЕНОГО (Дождь) ---
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

// --- ТОТ САМЫЙ ЭФФЕКТ ВЗРЫВА (БАХ!) ---
function createExplosion(x, y) {
    const layer = document.getElementById("effects-layer") || document.getElementById("game");
    if (!layer) return;
    
    // 15 частиц для сочного эффекта "лопнувшего шарика"
    const particleCount = 15;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.className = "ice-particle";
        
        const angle = Math.random() * Math.PI * 2;
        // Увеличил разброс для эффекта "слопал"
        const dist = 80 + Math.random() * 120; 
        const dx = Math.cos(angle) * dist + "px";
        const dy = Math.sin(angle) * dist + "px";
        
        particle.style.setProperty('--dx', dx);
        particle.style.setProperty('--dy', dy);
        particle.style.left = x + "px";
        particle.style.top = y + "px";
        particle.style.backgroundImage = imgIceCream;
        
        layer.appendChild(particle);
        // Удаляем через 0.6с, когда анимация в CSS закончится
        setTimeout(() => particle.remove(), 600);
    }
}

function createIcePop(x, y) {
    createExplosion(x, y); 
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

// --- FIREBASE ---
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

window.onload = () => { 
    if(nick) loadUserData(nick); 
    else updateMenuInfo();
    startIceRain("menu"); 
};

function updateMenuInfo() {
    if (nick) {
        document.getElementById("welcome").innerHTML = `Герой <b>${nick}</b>`;
        document.getElementById("nick").style.display = "none";
    }
    document.getElementById("menuLeaderboard").innerText = "🏆 " + best;
    document.getElementById("total-balance").innerHTML = `${totalCoins} ${getIceIcon()}`;
    
    const shopBal = document.getElementById("shop-balance");
    if(shopBal) {
        // Счёт и две иконки мороженого
        shopBal.innerHTML = `${totalCoins} ${getIceIcon()}${getIceIcon()}`;
    }
    
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
        nick = val; localStorage.setItem("nick", nick);
    }
    stopIceRain(); 
    const goScreen = document.getElementById("gameOverScreen");
    if(goScreen) goScreen.classList.add("hidden");

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
    p.className = ""; 
    p.style.left = lanes[targetLane] + "%";
    p.style.transform = "translateX(-50%) rotate(0deg)"; 
    
    const ui = document.getElementById("combo-ui");
    ui.classList.add("hidden");
    ui.classList.remove("combo-epic");

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
    obs.style.transform = "scale(1)";
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
            if (distY < 180) {
                obs.style.left = targetX + "%";
                obstacleLane = targetLane;
            }
            obstacleY -= (speed * 0.5); 
        }
    }

    obs.style.top = obstacleY + "px";

    const catchRange = (magnetActive && obs.dataset.type === "good") ? 120 : 60;

    if (obstacleLane === targetLane && obstacleY > playerTop - catchRange && obstacleY < playerTop + catchRange) {
        handleCollision(obs, p);
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

function triggerComboFlash(mult) {
    const flash = document.createElement("div");
    flash.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: ${mult >= 4 ? 'rgba(0, 234, 255, 0.3)' : 'rgba(255, 79, 216, 0.2)'};
        pointer-events: none; z-index: 1000; animation: fadeOut 0.3s forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
}

function handleCollision(obs, p) {
    const rect = obs.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (obs.dataset.type === "good") {
        // --- ЗАПУСК ЭФФЕКТА БА-БАХ ---
        createExplosion(centerX, centerY); 

        comboCount++;
        let oldMult = comboMultiplier;
        
        if (comboCount >= 12) comboMultiplier = 5;
        else if (comboCount >= 8) comboMultiplier = 4;
        else if (comboCount >= 5) comboMultiplier = 3;
        else if (comboCount >= 2) comboMultiplier = 2;
        else comboMultiplier = 1;

        const ui = document.getElementById("combo-ui");
        if(comboMultiplier > 1) { 
            ui.innerText = "x" + comboMultiplier; 
            ui.classList.remove("hidden");
            if (comboMultiplier >= 5) ui.classList.add("combo-epic");
            else ui.classList.remove("combo-epic");
            ui.style.animation = 'none';
            ui.offsetHeight; 
            ui.style.animation = null;
            if (comboMultiplier > oldMult) triggerComboFlash(comboMultiplier);
        }

        coins += comboMultiplier; 
        updateScore(); 
        spawnObstacle();
    } else if (obs.dataset.type === "bad") {
        if (shieldActive) {
            createCubeBoom(centerX, centerY); 
            shieldActive = false; 
            p.classList.remove("shield-aura");
            obstacleY = window.innerHeight + 500; 
            spawnObstacle();
            updateBonusUI();
            triggerComboFlash(1);
        } else {
            createCubeBoom(centerX, centerY); 
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
    
    const goScreen = document.getElementById("gameOverScreen");
    const finalScore = document.getElementById("final-score");
    if(goScreen) {
        goScreen.classList.remove("hidden");
        if(finalScore) finalScore.innerText = coins; 
    } else {
        alert(`Игра окончена! Собрано: ${coins}`);
        backToMenu();
    }
}

function backToMenu() {
    gameRunning = false;
    if (loopId) cancelAnimationFrame(loopId);
    
    const goScreen = document.getElementById("gameOverScreen");
    if(goScreen) goScreen.classList.add("hidden");

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
    if (diff > 0) {
        targetLane = Math.min(3, targetLane + 1);
        p.style.transform = "translateX(-50%) rotate(15deg) scale(1.1)";
    } else {
        targetLane = Math.max(0, targetLane - 1);
        p.style.transform = "translateX(-50%) rotate(-15deg) scale(1.1)";
    }
    p.style.left = lanes[targetLane] + "%";
    setTimeout(() => {
        if(gameRunning) p.style.transform = "translateX(-50%) rotate(0deg) scale(1)";
    }, 150);
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
            if(gameRunning) {
                document.getElementById("player").classList.remove("magnet-aura"); 
                updateBonusUI();
            }
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
