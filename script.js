// ==================== BERRY RUNNER ====================
let scene, camera, renderer;
let player;
let obstacles = [];
let score = 0;
let gameStarted = false;
let speed = 0.25;

const lanes = [-2.5, 0, 2.5]; // три полосы
let currentLane = 1; // 0 = лево, 1 = центр, 2 = право

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ====================== INIT ======================
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b0a3d);
    scene.fog = new THREE.Fog(0x2b0a3d, 10, 60);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // Свет
    const dirLight = new THREE.DirectionalLight(0xffddff, 1.3);
    dirLight.position.set(5, 12, 10);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xbb99ff, 0.8));

    // Дорога
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 400),
        new THREE.MeshStandardMaterial({ color: 0x3a0a5f })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -100;
    scene.add(road);

    // Игрок (пока кубик — потом заменим на единорога)
    const playerGeo = new THREE.BoxGeometry(1.2, 1.8, 1.2);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0xff88ff });
    player = new THREE.Mesh(playerGeo, playerMat);
    player.position.set(lanes[currentLane], 0.9, 0);
    scene.add(player);

    camera.position.set(0, 5, 12);
    camera.lookAt(0, 2, 0);

    animate();
}

// ====================== ИГРОВОЙ ЦИКЛ ======================
function animate() {
    requestAnimationFrame(animate);

    if (gameStarted) {
        // Движение препятствий
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].position.z += speed;

            // Коллизия
            if (checkCollision(obstacles[i])) {
                gameOver();
                return;
            }

            // Удаление
            if (obstacles[i].position.z > 15) {
                scene.remove(obstacles[i]);
                obstacles.splice(i, 1);
            }
        }

        // Лёгкое покачивание игрока (имитация бега)
        if (player) player.rotation.y = Math.sin(Date.now() * 0.005) * 0.1;
    }

    renderer.render(scene, camera);
}

// Проверка столкновения
function checkCollision(obs) {
    const dx = player.position.x - obs.position.x;
    const dz = player.position.z - obs.position.z;
    return Math.abs(dx) < 1.2 && Math.abs(dz) < 1.5;
}

// ====================== УПРАВЛЕНИЕ ======================
let touchStartX = 0;

document.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {
    if (!gameStarted || !player) return;

    const diff = touchStartX - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 50) { // свайп
        if (diff > 0 && currentLane < 2) { // свайп влево
            currentLane++;
        } else if (diff < 0 && currentLane > 0) { // свайп вправо
            currentLane--;
        }
        player.position.x = lanes[currentLane];
    } else {
        // Тап = прыжок
        jump();
    }
});

// Прыжок
function jump() {
    if (!player || player.position.y > 1) return;

    let height = 0;
    const jumpInterval = setInterval(() => {
        height += 0.45;
        player.position.y = height;

        if (height >= 4) {
            clearInterval(jumpInterval);
            const fall = setInterval(() => {
                height -= 0.45;
                player.position.y = height;
                if (height <= 0.9) {
                    player.position.y = 0.9;
                    clearInterval(fall);
                }
            }, 16);
        }
    }, 16);
}

// Спавн препятствий
function spawnObstacle() {
    if (!gameStarted) return;

    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.4, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xff4444 })
    );

    const randomLane = Math.floor(Math.random() * 3);
    obs.position.set(lanes[randomLane], 0.7, -45);
    scene.add(obs);
    obstacles.push(obs);
}

// ====================== СТАРТ ИГРЫ ======================
function startGame() {
    document.getElementById("menu").style.display = "none";
    gameStarted = true;
    score = 0;

    // Запускаем спавн препятствий
    setInterval(spawnObstacle, 1200);
}

// Запуск
init();
