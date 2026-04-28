let player;
lconst canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 🖼️ ассеты
const bg = new Image();
bg.src = "assets/background.jpg";

const playerImg = new Image();
playerImg.src = "assets/unicorn.png";

const cubeImg = new Image();
cubeImg.src = "assets/cube.png";

// 👤 игрок
let player = {
    x: canvas.width / 2 - 40,
    y: canvas.height - 150,
    width: 80,
    height: 80,
    vx: 0
};

let obstacles = [];
let gameOver = false;
let frame = 0;

// ▶ старт
function startGame() {
    document.getElementById("menu").style.display = "none";
    resetGame();
    update();
}

// 🔄 рестарт
function restartGame() {
    document.getElementById("gameOver").style.display = "none";
    resetGame();
    update();
}

// 🏠 домой
function goHome() {
    gameOver = true;
    document.getElementById("menu").style.display = "block";
    document.getElementById("gameOver").style.display = "none";
}

// ♻️ сброс
function resetGame() {
    obstacles = [];
    gameOver = false;
    player.x = canvas.width / 2 - 40;
}

// 🚧 спавн
function spawnObstacle() {
    let size = 60;

    obstacles.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: 5
    });
}

// 🎮 управление
document.addEventListener("touchmove", e => {
    let t = e.touches[0];
    player.x = t.clientX - player.width / 2;
});

document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") player.vx = -5;
    if (e.key === "ArrowRight") player.vx = 5;
});

document.addEventListener("keyup", () => {
    player.vx = 0;
});

// 🔁 цикл
function update() {
    if (gameOver) return;

    frame++;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // 🌌 фон
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // 👤 игрок движение
    player.x += player.vx;

    // ✨ анимация
    let bob = Math.sin(frame * 0.1) * 5;

    ctx.save();
    ctx.translate(player.x + player.width/2, player.y);

    ctx.rotate(player.vx * 0.05);

    ctx.shadowColor = "pink";
    ctx.shadowBlur = 20;

    ctx.drawImage(playerImg, -40, bob, 80, 80);
    ctx.restore();

    // 🚧 препятствия
    obstacles.forEach((o, i) => {
        o.y += o.speed;

        // псевдо 3D
        o.width += 0.05;
        o.height += 0.05;

        ctx.shadowColor = "#ff00ff";
        ctx.shadowBlur = 30;

        ctx.drawImage(cubeImg, o.x, o.y, o.width, o.height);

        // 💥 столкновение
        if (
            player.x < o.x + o.width &&
            player.x + player.width > o.x &&
            player.y < o.y + o.height &&
            player.y + player.height > o.y
        ) {
            gameOver = true;
            document.getElementById("gameOver").style.display = "block";
        }

        if (o.y > canvas.height) {
            obstacles.splice(i,1);
        }
    });

    requestAnimationFrame(update);
}

// ⏱
setInterval(spawnObstacle, 1200);
