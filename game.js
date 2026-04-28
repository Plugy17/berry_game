let player;
let score = 0;
let jumping = false;

/* ⚙️ ФИЗИКА */
const GRAVITY = 0.8;
const JUMP_FORCE = -14;
const GROUND = 110;

let level = 1;
let speed = 6;
let berryRate = 1200;

/* ▶ старт */
function startGame() {
    document.getElementById("lobby").style.display = "none";
    document.getElementById("game").classList.remove("hidden");

    player = document.getElementById("player");

    berryLoop();
    obstacleLoop();
    gameLoop();
}

/* 🟡 ПРЫЖОК (ФИКС) */
document.addEventListener("click", jump);
document.addEventListener("touchstart", jump);

let velY = 0;
let y = 0;

function jump() {
    if (y >= 0) {
        velY = JUMP_FORCE;
    }
}

/* 🎮 ОСНОВНОЙ ЛУП (ФИЗИКА) */
function gameLoop() {
    velY += GRAVITY;
    y += velY;

    if (y > 0) {
        y = 0;
        velY = 0;
    }

    player.style.bottom = (GROUND - y) + "px";

    updateLevel();

    requestAnimationFrame(gameLoop);
}

/* 📈 УРОВНИ */
function updateLevel() {
    level = Math.floor(score / 10) + 1;

    speed = 6 + level * 1.2;
    berryRate = Math.max(400, 1200 - level * 100);
}

/* 🍓 BERRY */
function spawnBerry() {
    let b = document.createElement("div");
    b.className = "berry";

    b.style.left = window.innerWidth + "px";
    b.style.bottom = (120 + Math.random() * 200) + "px";

    document.getElementById("game").appendChild(b);

    let move = setInterval(() => {
        let x = parseInt(b.style.left);
        b.style.left = (x - speed) + "px";

        if (x < 100 && x > 0) {
            score++;
            document.getElementById("score").innerText = score;
            b.remove();
            clearInterval(move);
        }

        if (x < -50) {
            b.remove();
            clearInterval(move);
        }
    }, 20);
}

/* ⏱ BERRY LOOP (ДИНАМИКА) */
function berryLoop() {
    setInterval(spawnBerry, berryRate);
}

/* 👾 ПРЕПЯТСТВИЯ */
function obstacleLoop() {
    setInterval(() => {
        let obs = document.createElement("div");
        obs.className = "obstacle";

        obs.style.right = "0px";
        obs.style.bottom = "110px";

        document.getElementById("game").appendChild(obs);

        let move = setInterval(() => {
            let x = parseInt(obs.style.right);
            obs.style.right = (x + speed) + "px";

            if (x > window.innerWidth) {
                obs.remove();
                clearInterval(move);
            }
        }, 20);
    }, 1800);
}