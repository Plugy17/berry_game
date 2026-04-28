let scene, camera, renderer;
let player;
let obstacles = [];
let coins = [];
let score = 0;
let gameStarted = false;
let speed = 0.18;
let isJumping = false;

const loader = new THREE.GLTFLoader();
let playerModel, obstacleModel, coinModel;

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
    const light = new THREE.DirectionalLight(0xffddff, 1.4);
    light.position.set(5, 12, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xbb99ff, 0.8));

    // Дорога
    const roadGeo = new THREE.PlaneGeometry(10, 300);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a0a5f });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -80);
    scene.add(road);

    camera.position.set(0, 4.5, 9);

    await loadAllModels();
    setupControls();
    animate();
}

// Загрузка моделей один раз
async function loadAllModels() {
    try {
        const [pGltf, oGltf, cGltf] = await Promise.all([
            loader.loadAsync("assets/berry.glb"),
            loader.loadAsync("assets/obstacle.glb"),
            loader.loadAsync("assets/coin.glb")
        ]);

        playerModel = pGltf.scene;
        obstacleModel = oGltf.scene;
        coinModel = cGltf.scene;

        player = playerModel.clone();
        player.scale.set(1.15, 1.15, 1.15);
        player.position.set(0, 0, 0);
        scene.add(player);
    } catch (e) {
        console.error("Ошибка загрузки моделей:", e);
    }
}

// Спавн
function spawnObstacle() {
    if (!obstacleModel || !gameStarted) return;
    const obs = obstacleModel.clone();
    obs.position.set((Math.random() - 0.5) * 4.5, 0, -45);
    scene.add(obs);
    obstacles.push(obs);
}

function spawnCoin() {
    if (!coinModel || !gameStarted) return;
    const coin = coinModel.clone();
    coin.position.set((Math.random() - 0.5) * 4.5, 1.3, -45);
    coin.rotation.x = Math.PI / 2;
    scene.add(coin);
    coins.push(coin);
}

// Анимация
function animate() {
    requestAnimationFrame(animate);

    if (gameStarted && player) {
        // Движение препятствий и монет
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].position.z += speed;
            if (obstacles[i].position.z > 10) {
                scene.remove(obstacles[i]);
                obstacles.splice(i, 1);
            }
        }

        for (let i = coins.length - 1; i >= 0; i--) {
            coins[i].position.z += speed;
            coins[i].rotation.y += 0.06;

            if (coins[i].position.z > 10) {
                scene.remove(coins[i]);
                coins.splice(i, 1);
            }
        }

        checkCollisions();
    }

    renderer.render(scene, camera);
}

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
        }
    }
}

function gameOver() {
    gameStarted = false;
    alert(`💥 Игра окончена!\n\nТвой счёт: ${score}\n\nПопробуй ещё раз!`);
    document.getElementById("menu").style.display = "flex";
}

// Управление
function setupControls() {
    let touchStartX = 0;

    document.addEventListener("touchstart", e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener("touchend", e => {
        if (!gameStarted || !player) return;
        const diff = touchStartX - e.changedTouches[0].screenX;

        if (Math.abs(diff) > 40) {
            player.position.x += diff > 0 ? -1.3 : 1.3;   // свайп влево/вправо
        } else {
            if (!isJumping) jump();                       // тап = прыжок
        }

        player.position.x = Math.max(-4.2, Math.min(4.2, player.position.x));
    });

    // Клавиатура (для теста на ПК)
    document.addEventListener("keydown", e => {
        if (!gameStarted || !player) return;
        if (e.key === "ArrowLeft") player.position.x -= 1;
        if (e.key === "ArrowRight") player.position.x += 1;
        if (e.key === " " && !isJumping) jump();
    });
}

function jump() {
    if (isJumping || !player) return;
    isJumping = true;
    let height = 0;
    const jumpUp = setInterval(() => {
        height += 0.25;
        player.position.y = height;
        if (height >= 2.8) {
            clearInterval(jumpUp);
            const jumpDown = setInterval(() => {
                height -= 0.25;
                player.position.y = height;
                if (height <= 0) {
                    player.position.y = 0;
                    isJumping = false;
                    clearInterval(jumpDown);
                }
            }, 16);
        }
    }, 16);
}

// ====================== ЗАПУСК ИГРЫ ======================
function startGame() {
    document.getElementById("menu").style.display = "none";
    
    // Сброс переменных
    gameStarted = true;
    score = 0;
    obstacles.forEach(o => scene.remove(o));
    coins.forEach(c => scene.remove(c));
    obstacles = [];
    coins = [];

    // Запуск спавнеров
    setInterval(spawnObstacle, 1300);
    setInterval(spawnCoin, 850);
}

// Запуск всего
init();