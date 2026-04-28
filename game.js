let player;
let score = 0;
let jumping = false;

// ▶ старт игры
function startGame() {
    document.getElementById("lobby").style.display = "none";
    document.getElementById("game").style.display = "block";

    player = document.getElementById("player");

    berryLoop();
    obstacleLoop();
}

// 🟡 прыжок (тап / клик)
document.addEventListener("click", jump);
document.addEventListener("touchstart", jump);

function jump() {
    if (jumping) return;

    jumping = true;

    let h = 0;

    let up = setInterval(() => {
        h += 6;
        player.style.bottom = (110 + h) + "px";

        if (h > 120) {
            clearInterval(up);

            let down = setInterval(() => {
                h -= 6;
                player.style.bottom = (110 + h) + "px";

                if (h <= 0) {
                    clearInterval(down);
                    jumping = false;
                }
            }, 20);
        }
    }, 20);
}

// 🍓 BERRY спавн
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
            b.remove();
            clearInterval(move);
        }

        if (x < -50) {
            b.remove();
            clearInterval(move);
        }
    }, 20);
}

// ⏱ цикл BERRY
function berryLoop() {
    setInterval(spawnBerry, 1200);
}

// 👾 препятствия
function obstacleLoop() {
    setInterval(() => {
        let obs = document.createElement("div");

        obs.style.position = "absolute";
        obs.style.width = "40px";
        obs.style.height = "40px";
        obs.style.background = "blue";
        obs.style.right = "0px";
        obs.style.bottom = "110px";

        document.getElementById("game").appendChild(obs);

        let move = setInterval(() => {
            let x = parseInt(obs.style.right);
            obs.style.right = (x + 7) + "px";

            if (x > window.innerWidth) {
                obs.remove();
                clearInterval(move);
            }
        }, 20);
    }, 1800);
}