const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 40,
    speed: 5
};

let keys = {};
let berries = 0;
let bombs = [];

document.getElementById("startBtn").onclick = () => {
    document.getElementById("startBtn").style.display = "none";
    gameLoop();
};

/* управление */
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

/* движение */
function movePlayer() {
    if (keys["w"]) player.y -= player.speed;
    if (keys["s"]) player.y += player.speed;
    if (keys["a"]) player.x -= player.speed;
    if (keys["d"]) player.x += player.speed;
}

/* бомба */
window.addEventListener("click", () => {
    bombs.push({
        x: player.x,
        y: player.y,
        radius: 10
    });
});

/* обновление бомб */
function updateBombs() {
    bombs.forEach(b => b.radius += 2);
    bombs = bombs.filter(b => b.radius < 80);
}

/* ягоды */
let berriesList = [];

function spawnBerry() {
    berriesList.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height
    });
}

setInterval(spawnBerry, 1000);

/* проверка сбора */
function collect() {
    berriesList = berriesList.filter(b => {
        let dx = b.x - player.x;
        let dy = b.y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
            berries++;
            document.getElementById("berries").innerText = berries;
            return false;
        }
        return true;
    });
}

/* отрисовка */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // фон (псевдо 3D сетка)
    ctx.strokeStyle = "#111";
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }

    // игрок (вид сверху)
    ctx.fillStyle = "gold";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();

    // ягоды
    ctx.fillStyle = "red";
    berriesList.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fill();
    });

    // бомбы
    ctx.strokeStyle = "cyan";
    bombs.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.stroke();
    });
}

/* главный цикл */
function gameLoop() {
    movePlayer();
    updateBombs();
    collect();
    draw();

    requestAnimationFrame(gameLoop);
}