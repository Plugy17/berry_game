let scene, camera, renderer;
let player;
let obstacles = [];
let coins = [];
let score = 0;
let gameStarted = false;
let speed = 0.18;
let isJumping = false;

const loader = new THREE.GLTFLoader();

// Пулы моделей
let playerModel, obstacleModel, coinModel;

// Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ---------------- INIT ----------------
async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b0a3d);
    scene.fog = new THREE.Fog(0x2b0a3d, 8, 45);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // Свет
    const light = new THREE.DirectionalLight(0xffccff, 1.3);
    light.position.set(5, 12, 8);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xaa88ff, 0.7));

    // Дорога
    const roadGeo = new THREE.PlaneGeometry(10, 300);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a0a5f });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -80;
    scene.add(road);

    camera.position.set(0, 4, 8);

    // Загружаем модели один раз
    await loadAllModels();

    // Управление
    setupControls();

    animate();
}

// Загрузка моделей один раз
async function loadAllModels() {
    try {
        const [playerGltf, obsGltf, coinGltf] = await Promise.all([
            loader.loadAsync("assets/berry.glb"),
            loader.loadAsync("assets/obstacle.glb"),
            loader.loadAsync("assets/coin.glb")
        ]);

        playerModel = playerGltf.scene;
        obstacleModel = obsGltf.scene;
        coinModel = coinGltf.scene;

        // Добавляем игрока
        player = playerModel.clone();
        player.scale.set(1.1, 1.1, 1.1);
        player.position.set(0, 0, 0);
        scene.add(player);
    } catch (e) {
        console.error("Ошибка загрузки моделей:", e);
    }
}

// Спавн препятствия
function spawnObstacle() {
    if (!obstacleModel || !gameStarted) return;
    const obs = obstacleModel.clone();
    obs.position.set((Math.random() - 0.5) * 4.2, 0, -45);
    obs.scale.set(0.9, 0.9, 0.9);
    scene.add(obs);
    obstacles.push(obs);
}

// Спавн монеты
function spawnCoin() {
    if (!coinModel || !gameStarted) return;
    const coin = coinModel.clone();
    coin.position.set((Math.random() - 0.5) * 4.2, 1.2, -45);
    coin.scale.set(0.8, 0.8, 0.8);
    scene.add(coin);
    coins.push(coin);
}

// Основной цикл
function animate() {
    requestAnimationFrame(animate);

    if (gameStarted && player) {
        // Движение объектов к игроку
        obstacles.forEach((o, i) => {
            o.position.z += speed;
            if (o.position.z > 8) {
                scene.remove(o);
                obstacles.splice(i, 1);
            }
        });

        coins.forEach((c, i) => {
            c.position.z += speed;
            c.rotation.y += 0.05; // вращение монеты

            if (c.position.z > 8) {
                scene.remove(c);
                coins.splice(i, 1);
            }
        });

        // Простая коллизия (можно улучшить с Box3)
        checkCollisions();
    }

    renderer.render(scene, camera);
}

// Простая проверка коллизий
function checkCollisions() {
    if (!player) return;

    const playerBox = new THREE.Box3().setFromObject(player);

    // Препятствия
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obsBox = new THREE.Box3().setFromObject(obstacles[i]);
        if (playerBox.intersectsBox(obsBox)) {
            gameOver();
            return;
        }
    }

    // Монеты
    for (let i = coins.length - 1; i >= 0; i--) {
        const coinBox = new THREE.Box3().setFromObject(coins[i]);
        if (playerBox.intersectsBox(coinBox)) {
            score += 10;
            scene.remove(coins[i]);
            coins.splice(i, 1);
            // Можно добавить звук или частицы
        }
    }
}

function gameOver() {
    gameStarted = false;
    alert(`Игра окончена!\nВаш счёт: ${score}\n\nПопробуй ещё раз!`);
    // Можно добавить кнопку рестарта
    document.getElementById("menu").style.display = "flex";
}

// ---------------- Управление ----------------
let touchStartX = 0;

function setupControls() {
    // Клавиатура (для теста)
    document.addEventListener("keydown", (e) => {
        if (!player || !gameStarted) return;
        if (e.key === "ArrowLeft" || e.key === "a") player.position.x -= 0.8;
        if (e.key === "ArrowRight" || e.key === "d") player.position.x += 0.8;
        if ((e.key === " " || e.key === "w") && !isJumping) jump();
    });

    // Touch swipe
    document.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener("touchend", (e) => {
        if (!player || !gameStarted) return;
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > 50) { // порог свайпа
            if (diff > 0) player.position.x -= 1.2; // свайп влево
            else player.position.x += 1.2;          // свайп вправо
        } else {
            // Тап = прыжок
            if (!isJumping) jump();
        }

        // Ограничение по X
        player.position.x = Math.max(-4, Math.min(4, player.position.x));
    });
}

function jump() {
    if (isJumping || !player) return;
    isJumping = true;
    const startY = player.position.y;

    let up = true;
    const jumpInterval = setInterval(() => {
        if (up) {
            player.position.y += 0.35;
            if (player.position.y >= 2.8) up = false;
        } else {
            player.position.y -= 0.35;
            if (player.position.y <= startY) {
                player.position.y = startY;
                isJumping = false;
                clearInterval(jumpInterval);
            }
        }
    }, 16);
}

// ---------------- START ----------------
function startGame() {
    document.getElementById("menu").style.display = "none";
    gameStarted = true;
    score = 0;

    // Очистка старых объектов
    obstacles.forEach(o => scene.remove(o));
    coins.forEach(c => scene.remove(c));
    obstacles = [];
    coins = [];

    // Запуск спавнеров
    setInterval(spawnObstacle, 1400);
    setInterval(spawnCoin, 900);
}

// Resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Запуск
init();