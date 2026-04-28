let scene, camera, renderer, player;
let obstacles = [], coins = [];
let score = 0;
let gameStarted = false;
let speed = 0.18;
let isJumping = false;

let playerModel, obstacleModel, coinModel;

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ====================== INIT ======================
async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b0a3d);
    scene.fog = new THREE.Fog(0x2b0a3d, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // Свет
    scene.add(new THREE.DirectionalLight(0xffccff, 1.5));
    scene.add(new THREE.AmbientLight(0xbb99ff, 0.8));

    // Простая дорога
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 300),
        new THREE.MeshStandardMaterial({ color: 0x3a0a5f })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -80;
    scene.add(road);

    camera.position.set(0, 5, 10);

    await loadModels();
    setupControls();
    animate();
}

// Загрузка моделей
async function loadModels() {
    const loader = new THREE.GLTFLoader();
    try {
        const [p, o, c] = await Promise.all([
            loader.loadAsync("assets/berry.glb"),
            loader.loadAsync("assets/obstacle.glb"),
            loader.loadAsync("assets/coin.glb")
        ]);

        playerModel = p.scene;
        obstacleModel = o.scene;
        coinModel = c.scene;

        player = playerModel.clone();
        player.scale.set(1.2, 1.2, 1.2);
        player.position.y = 0;
        scene.add(player);
    } catch (err) {
        console.error("Не удалось загрузить модели:", err);
    }
}

// Спавн
function spawnObstacle() {
    if (!gameStarted || !obstacleModel) return;
    const obs = obstacleModel.clone();
    obs.position.set((Math.random() - 0.5) * 4.5, 0, -50);
    scene.add(obs);
    obstacles.push(obs);
}

function spawnCoin() {
    if (!gameStarted || !coinModel) return;
    const coin = coinModel.clone();
    coin.position.set((Math.random() - 0.5) * 4.5, 1.4, -50);
    scene.add(coin);
    coins.push(coin);
}

// Игровой цикл
function animate() {
    requestAnimationFrame(animate);

    if (gameStarted && player) {
        obstacles.forEach((obs, i) => {
            obs.position.z += speed;
            if (obs.position.z > 15) {
                scene.remove(obs);
                obstacles.splice(i, 1);
            }
        });

        coins.forEach((coin, i) => {
            coin.position.z += speed;
            coin.rotation.y += 0.08;
            if (coin.position.z > 15) {
                scene.remove(coin);
                coins.splice(i, 1);
            }
        });

        checkCollisions();
    }

    renderer.render(scene, camera);
}

function checkCollisions() {
    if (!player) return;
    const pBox = new THREE.Box3().setFromObject(player);

    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (pBox.intersectsBox(new THREE.Box3().setFromObject(obstacles[i]))) {
            gameOver();
            return;
        }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
        if (pBox.intersectsBox(new THREE.Box3().setFromObject(coins[i]))) {
            score += 10;
            scene.remove(coins[i]);
            coins.splice(i, 1);
        }
    }
}

function gameOver() {
    gameStarted = false;
    alert(`Игра окончена!\nСчёт: ${score}`);
    document.getElementById("menu").style.display = "flex";
}

// Управление
function setupControls() {
    let startX = 0;

    document.addEventListener("touchstart", e => startX = e.touches[0].clientX);
    document.addEventListener("touchend", e => {
        if (!gameStarted || !player) return;
        const diff = startX - e.changedTouches[0].clientX;

        if (Math.abs(diff) > 30) {
            player.position.x += diff > 0 ? -1.4 : 1.4;
        } else if (!isJumping) {
            jump();
        }
        player.position.x = Math.max(-4, Math.min(4, player.position.x));
    });
}

function jump() {
    if (isJumping || !player) return;
    isJumping = true;
    let y = 0;
    const interval = setInterval(() => {
        y += 0.28;
        player.position.y = y;
        if (y >= 3) {
            clearInterval(interval);
            const down = setInterval(() => {
                y -= 0.28;
                player.position.y = y;
                if (y <= 0) {
                    player.position.y = 0;
                    isJumping = false;
                    clearInterval(down);
                }
            }, 16);
        }
    }, 16);
}

// ====================== ЗАПУСК ======================
function startGame() {
    const menu = document.getElementById("menu");
    menu.style.opacity = "0";

    setTimeout(() => {
        menu.style.display = "none";
        menu.style.opacity = "1"; // сброс для следующего раза

        gameStarted = true;
        score = 0;
        obstacles = [];
        coins = [];

        // Запускаем спавнеры
        setInterval(spawnObstacle, 1400);
        setInterval(spawnCoin, 950);
    }, 400);
}

// Старт приложения
init();