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

// 🟡 прыжок
document.addEventListener("click", jump, { passive: true });
document.addEventListener("touchstart", jump, { passive: true });

function jump() {
    if (jumping) return;
    jumping = true;

    let h = 0;
    let speed = 8;

    let up = setInterval(() => {
        h += speed;
        player.style.bottom = (110 + h) + "px";

        if (h >= 120) {
            clearInterval(up);

            let down = setInterval(() => {
                h -= speed;
                player.style.bottom = (110 + h) + "px";

                if (h <= 0) {
                    clearInterval(down);
                    jumping = false;
                }
            }, 18);
        }
    }, 18);
}

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
