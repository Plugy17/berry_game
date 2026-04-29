let lane = 1;
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -100;
let loopId = null;

let nick = localStorage.getItem("nick");
let coins = 0;
let best = parseInt(localStorage.getItem("best")) || 0;
let totalCoins = parseInt(localStorage.getItem("totalCoins")) || 0;

let speed = 6;
let difficulty = 0.002;

const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')";

window.onload = () => {
    updateMenuInfo();
};

function updateMenuInfo() {
    if (nick) {
        // Приветствие со вспышками
        document.getElementById("welcome").innerHTML = `<span class="flash-effect"></span> Герой <b>${nick}</b> готов к забегу! <span class="flash-effect"></span>`;
        document.getElementById("nick").style.display = "none";
    }
    document.getElementById("menuLeaderboard").innerText = "🏆 Рекорд: " + best;
    document.getElementById("total-balance").innerHTML = `У тебя всего: ${totalCoins} <img src="assets/icecream.png" style="width:20px; vertical-align:middle;">`;
}

function startGame() {
    if (!nick) {
        const input = document.getElementById("nick").value.trim();
        if (input.length < 2) {
            alert("Введи свой ник!");
            return;
        }
        nick = input;
        localStorage.setItem("nick", nick);
    }

    const mode = document.getElementById("difficulty").value;
    speed = mode === "easy" ? 5 : mode === "hard" ? 9 : 7;
    difficulty = mode === "easy" ? 0.001 : mode === "hard" ? 0.003 : 0.002;

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");

    resetGame();
}

function resetGame() {
    coins = 0;
    updateScore(); // Сброс счета и показ рекорда в HUD
    lane = 1;
    targetLane = 1;
    obstacleY = -100;
    gameRunning = true;
    spawnObstacle();
    if (loopId) cancelAnimationFrame(loopId);
    update();
}

function spawnObstacle() {
    obstacleLane = Math.floor(Math.random() * 3);
    obstacleY = -100;
    const obs = document.getElementById("obstacle");
    
    const isGood = Math.random() < 0.6;
    obs.dataset.type = "good"; // Тип по умолчанию
    if (!isGood) obs.dataset.type = "bad";
    
    obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    obs.style.left = [15, 50, 85][obstacleLane] + "%";
}

function update() {
    if (!gameRunning) return;

    obstacleY += speed;
    speed += difficulty;

    const obs = document.getElementById("obstacle");
    obs.style.top = obstacleY + "px";

    if (obstacleY > window.innerHeight - 180 && obstacleY < window.innerHeight - 80) {
        if (obstacleLane === targetLane) {
            if (obs.dataset.type === "good") {
                coins++;
                updateScore();
                
                // Эффект увеличения HUD при сборе
                const hud = document.getElementById("hud");
                hud.classList.add("score-bump");
                setTimeout(() => hud.classList.remove("score-bump"), 200);

                spawnObstacle();
            } else {
                gameOver();
                return;
            }
        }
    }

    if (obstacleY > window.innerHeight) spawnObstacle();
    loopId = requestAnimationFrame(update);
}

// ПРАВКА: Красивый HUD со счетом и рекордом снизу
function updateScore() {
    const hud = document.getElementById("hud");
    hud.innerHTML = `
        <div class="score-main">${coins} <img src="assets/icecream.png" style="width:35px; vertical-align:middle;"></div>
        <div class="score-record">Best: ${best}</div>
    `;
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(loopId);

    totalCoins += coins;
    localStorage.setItem("totalCoins", totalCoins);

    if (coins > best) {
        best = coins;
        localStorage.setItem("best", best);
    }

    alert(`Берри врезался! 💥\nСобрано сейчас: ${coins} 🍦\nВсего в копилке: ${totalCoins}`);
    backToMenu();
}

function backToMenu() {
    gameRunning = false;
    if (loopId) cancelAnimationFrame(loopId);
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
    updateMenuInfo();
}

// Управление
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 30) return;

    const playerImg = document.getElementById("player");
    if (diff > 0) {
        targetLane = Math.min(2, targetLane + 1);
        playerImg.style.transform = "translateX(-50%) rotate(15deg)";
    } else {
        targetLane = Math.max(0, targetLane - 1);
        playerImg.style.transform = "translateX(-50%) rotate(-15deg)";
    }
    playerImg.style.left = [15, 50, 85][targetLane] + "%";
    setTimeout(() => {
        playerImg.style.transform = "translateX(-50%) rotate(0deg)";
    }, 200);
});

function openShop() {
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("shop").classList.remove("hidden");
}

function closeShop() {
    document.getElementById("shop").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}
