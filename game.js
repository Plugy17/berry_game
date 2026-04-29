let lane = 1;
let targetLane = 1;
let gameRunning = false;
let obstacleLane = 0;
let obstacleY = -100;
let loopId = null;

let nick = localStorage.getItem("nick");
let coins = 0; // Очки за текущий забег
let best = parseInt(localStorage.getItem("best")) || 0;

let speed = 6;
const baseSpeed = 6;
let difficulty = 0.002;

// Пути к картинкам
const imgIceCream = "url('assets/icecream.png')";
const imgBad = "url('assets/obstacle.png')"; // Замени на кирпич или донат

function startGame() {
    if (!nick) {
        const input = document.getElementById("nick").value;
        if (!input) { alert("Введите ник!"); return; }
        nick = input;
        localStorage.setItem("nick", nick);
    }

    let mode = document.getElementById("difficulty").value;
    speed = mode === "easy" ? 5 : mode === "hard" ? 9 : 7;
    
    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");

    resetGame();
}

function resetGame() {
    coins = 0;
    updateScore();
    lane = 1;
    targetLane = 1;
    gameRunning = true;
    spawnObstacle();
    if (loopId) cancelAnimationFrame(loopId);
    update();
}

function spawnObstacle() {
    obstacleLane = Math.floor(Math.random() * 3);
    obstacleY = -100;
    const obs = document.getElementById("obstacle");
    
    // 60% шанс на мороженое, 40% на препятствие
    const isGood = Math.random() < 0.6;
    obs.dataset.type = isGood ? "good" : "bad";
    obs.style.backgroundImage = isGood ? imgIceCream : imgBad;
    obs.style.left = [15, 50, 85][obstacleLane] + "%";
}

function update() {
    if (!gameRunning) return;

    obstacleY += speed;
    speed += difficulty; // Постепенное ускорение

    const obs = document.getElementById("obstacle");
    obs.style.top = obstacleY + "px";

    // Проверка столкновения
    if (obstacleY > window.innerHeight - 180 && obstacleY < window.innerHeight - 80) {
        if (obstacleLane === targetLane) {
            if (obs.dataset.type === "good") {
                coins++;
                updateScore();
                spawnObstacle();
            } else {
                gameOver();
                return;
            }
        }
    }

    // Если пролетел мимо
    if (obstacleY > window.innerHeight) {
        spawnObstacle();
    }

    loopId = requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById("score").innerText = coins;
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(loopId);

    if (coins > best) {
        best = coins;
        localStorage.setItem("best", best);
        // Тут можно добавить сохранение в Firebase
    }

    alert(`Игра окончена!\nСобрано мороженого: ${coins}\nВаш рекорд: ${best}`);
    backToMenu();
}

function backToMenu() {
    gameRunning = false;
    document.getElementById("game").classList.add("hidden");
    document.getElementById("menu").classList.remove("hidden");
}

// Управление свайпами
let startX = 0;
document.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
document.addEventListener("touchend", e => {
    if (!gameRunning) return;
    let diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 30) return;
    if (diff > 0) targetLane = Math.min(2, targetLane + 1);
    else targetLane = Math.max(0, targetLane - 1);
    
    // Визуальное перемещение
    document.getElementById("player").style.left = [15, 50, 85][targetLane] + "%";
});
