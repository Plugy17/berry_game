let gameOver = false;
let player;
let score = 0;
let jumping = false;

// ▶ старт
function startGame() {
    console.log("START GAME");

    document.getElementById("lobby").style.display = "none";

    const game = document.getElementById("game");
    game.style.display = "block";

    game.style.background = "linear-gradient(#0b0f1a, #000)";

    player = document.getElementById("player");

    score = 0;
    document.getElementById("score").innerText = score;

    berryLoop();
}

function enableMobileControls() {
    document.getElementById("touchLayer").addEventListener("pointerdown", (e) => {
        e.preventDefault();
        jump();
    });
    
}
function openProfile() {
    alert("👤 ПРОФИЛЬ\n🍓 " + score + "\n🔥 уровень: 1");
}

function loseGame() {
    gameOver = true;

    document.getElementById("lose").style.display = "block";
}
function obstacleLoop() {
    setInterval(() => {
        if (gameOver) return;

        let obs = document.createElement("div");

        obs.style.position = "absolute";
        obs.style.width = "50px";
        obs.style.height = "50px";
        obs.style.background = "blue";
        obs.style.right = "0px";
        obs.style.bottom = "110px";
        obs.style.borderRadius = "10px";

        document.getElementById("game").appendChild(obs);

        let move = setInterval(() => {
            if (gameOver) {
                obs.remove();
                clearInterval(move);
                return;
            }

            let x = parseInt(obs.style.right);
            obs.style.right = (x + 7) + "px";

            // 💀 collision check
            let p = player.getBoundingClientRect();
            let o = obs.getBoundingClientRect();

            if (
                p.left < o.right &&
                p.right > o.left &&
                p.top < o.bottom &&
                p.bottom > o.top
            ) {
                loseGame();
            }

            if (x > window.innerWidth) {
                obs.remove();
                clearInterval(move);
            }
        }, 20);
    }, 1500);
}
// 🟡 прыжок


let velocityY = 0;
let gravity = 0.8;
let isOnGround = true;
let groundY = 110;

function jump() {
    if (gameOver) return;
    if (!isOnGround) return;

    velocityY = -15; // 🔼 сила прыжка (чем больше по модулю — тем выше)
    isOnGround = false;
}

function gameLoop() {
    if (!gameOver) {

        velocityY += gravity; // 🔽 гравитация
        let bottom = parseFloat(player.style.bottom || groundY);

        bottom -= velocityY;

        if (bottom <= groundY) {
            bottom = groundY;
            isOnGround = true;
            velocityY = 0;
        }

        player.style.bottom = bottom + "px";
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();

// 🍓 спавн ягод
function spawnBerry() {
    let b = document.createElement("div");
    b.className = "berry";

    b.style.left = window.innerWidth + "px";
    b.style.bottom = (120 + Math.random() * 200) + "px";

    document.getElementById("game").appendChild(b);

    let move = setInterval(() => {
        let x = parseInt(b.style.left);
        b.style.left = (x - 6) + "px";

        // сбор
        if (x < 100 && x > 0) {
            score++;
            document.getElementById("score").innerText = score;

            showPop("+1 🍓");
            b.remove();
            clearInterval(move);
        }

        if (x < -50) {
            b.remove();
            clearInterval(move);
        }
    }, 20);
}

function exitGame() {
    location.reload();
}
// ⏱ цикл
function berryLoop() {
    setInterval(spawnBerry, 1200);
}

function initControls() {
    const layer = document.getElementById("touchLayer");

    // ПК + мобилка
    window.addEventListener("pointerdown", (e) => {
        if (gameOver) return;
        jump();
    });

    // ФИКС: отдельный слой для телефона
    if (layer) {
        layer.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            if (gameOver) return;
            jump();
        });
    }
}
// ✨ текст эффект
function showPop(text) {
    let t = document.createElement("div");
    t.innerText = text;

    t.style.position = "absolute";
    t.style.left = "80px";
    t.style.bottom = "180px";
    t.style.color = "yellow";
    t.style.fontSize = "20px";
    t.style.zIndex = 100;

    document.getElementById("game").appendChild(t);

    setTimeout(() => {
        t.style.transition = "0.5s";
        t.style.transform = "translateY(-40px)";
        t.style.opacity = "0";
    }, 50);

    setTimeout(() => t.remove(), 600);
}
