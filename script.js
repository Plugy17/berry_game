// ==================== BERRY RUNNER v35 ====================

alert("Скрипт v35 загружен успешно");

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let scene, camera, renderer, player;
let gameStarted = false;
let obstacles = [];
let currentLane = 1;
const lanes = [-2.5, 0, 2.5];

// Основная инициализация
function init() {
    console.log("init() запущена");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b0a3d);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Свет и дорога
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0xffaaff, 1.2);
    light.position.set(5, 10, 10);
    scene.add(light);

    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 300),
        new THREE.MeshStandardMaterial({ color: 0x3a0a5f })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -80;
    scene.add(road);

    // Игрок
    player = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xff00ff })
    );
    player.position.set(lanes[currentLane], 1, 0);
    scene.add(player);

    camera.position.set(0, 6, 13);

    animate();
}

// Игровой цикл
function animate() {
    requestAnimationFrame(animate);
    if (gameStarted && player) {
        player.rotation.y = Math.sin(Date.now() * 0.005) * 0.1;
    }
    renderer.render(scene, camera);
}

// Функция запуска игры — САМАЯ ВАЖНАЯ ЧАСТЬ
function startGame() {
    alert("Кнопка PLAY нажата! Начинаем игру...");

    const menu = document.getElementById("menu");
    if (menu) {
        menu.style.transition = "opacity 0.3s";
        menu.style.opacity = "0";

        setTimeout(() => {
            menu.style.display = "none";
            gameStarted = true;
            alert("Меню скрыто. Игра должна начаться!");
            
            // Запускаем спавн препятствий
            setInterval(() => {
                if (gameStarted) spawnObstacle();
            }, 1500);
        }, 400);
    } else {
        alert("Меню не найдено!");
    }
}

function spawnObstacle() {
    if (!scene) return;
    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.6, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xff3366 })
    );
    const lane = Math.floor(Math.random() * 3);
    obs.position.set(lanes[lane], 0.8, -45);
    scene.add(obs);
    obstacles.push(obs);
}

// Управление
let touchStartX = 0;
document.addEventListener("touchstart", e => touchStartX = e.touches[0].clientX);
document.addEventListener("touchend", e => {
    if (!gameStarted || !player) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
        currentLane = Math.max(0, Math.min(2, currentLane + (diff > 0 ? 1 : -1)));
        player.position.x = lanes[currentLane];
    } else {
        // прыжок
        if (player.position.y <= 1.2) {
            let y = 1;
            let vel = 0.45;
            const int = setInterval(() => {
                vel -= 0.04;
                y += vel;
                player.position.y = y;
                if (y <= 1) {
                    player.position.y = 1;
                    clearInterval(int);
                }
            }, 16);
        }
    }
});

// Запуск инициализации
window.addEventListener("load", () => {
    console.log("Страница загружена");
    init();
});

// Делаем функцию доступной глобально
window.startGame = startGame;
