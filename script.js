// ==================== BERRY RUNNER ====================

let scene, camera, renderer, player;
let obstacles = [];
let gameStarted = false;
let speed = 0.22;
let currentLane = 1;
const lanes = [-2.5, 0, 2.5];

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

console.log("Скрипт запущен");

// ====================== INIT ======================
function init() {
    console.log("init() началась");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b0a3d);
    scene.fog = new THREE.Fog(0x2b0a3d, 15, 60);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // Свет
    scene.add(new THREE.DirectionalLight(0xffccff, 1.4));
    scene.add(new THREE.AmbientLight(0xbb99ff, 0.7));

    // Дорога
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 400),
        new THREE.MeshStandardMaterial({ color: 0x3a0a5f })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -120;
    scene.add(road);

    // Игрок (единорог пока как розовый куб)
    const geo = new THREE.BoxGeometry(1.3, 1.9, 1.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff77ff });
    player = new THREE.Mesh(geo, mat);
    player.position.set(lanes[currentLane], 0.95, 2);
    scene.add(player);

    camera.position.set(0, 6, 14);
    camera.lookAt(player.position);

    animate();
    console.log("Инициализация завершена");
}

// ====================== АНИМАЦИЯ ======================
function animate() {
    requestAnimationFrame(animate);

    if (gameStarted && player) {
        // Движение препятствий
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.position.z += speed;

            // Коллизия
            if (Math.abs(player.position.x - obs.position.x) < 1.4 && 
                Math.abs(player.position.z - obs.position.z) < 2) {
                gameOver();
                return;
            }

            // Удаление
            if (obs.position.z > 20) {
                scene.remove(obs);
                obstacles.splice(i, 1);
            }
        }

        // Имитация бега
        player.rotation.y = Math.sin(Date.now() * 0.006) * 0.08;
    }

    renderer.render(scene, camera);
}

// ====================== УПРАВЛЕНИЕ ======================
let touchStartX = 0;

document.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
});

document.addEventListener("touchend", (e) => {
    if (!gameStarted || !player) return;

    const diff = touchStartX - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 45) {
        // Свайп
        if (diff > 0 && currentLane < 2) currentLane++;      // влево
        else if (diff < 0 && currentLane > 0) currentLane--; // вправо
        
        player.position.x = lanes[currentLane];
    } else {
        // Тап = прыжок
        jump();
    }
});

function jump() {
    if (!player || player.position.y > 2) return;

    let y = player.position.y;
    let velocity = 5.5;

    const jumpInterval = setInterval(() => {
        velocity -= 0.45;
        y += velocity * 0.07;
        player.position.y = y;

        if (y <= 0.95) {
            player.position.y = 0.95;
            clearInterval(jumpInterval);
        }
    }, 16);
}

// Спавн препятствий
function spawnObstacle() {
    if (!gameStarted) return;

    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.6, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xff3366 })
    );

    const laneIndex = Math.floor(Math.random() * 3);
    obs.position.set(lanes[laneIndex], 0.8, -50);
    scene.add(obs);
    obstacles.push(obs);
}

function gameOver() {
    gameStarted = false;
    alert("💥 Столкновение!\nИгра окончена");
    document.getElementById("menu").style.display = "flex";
}

// ====================== СТАРТ ======================
function startGame() {
    document.getElementById("menu").style.display = "none";
    gameStarted = true;
    
    // Запуск спавнера препятствий
    setInterval(spawnObstacle, 1100);
}

// Запуск приложения
init();
