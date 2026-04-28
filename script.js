// ==================== BERRY RUNNER v33 ====================

alert("Скрипт загрузился v33");

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let scene, camera, renderer, player;
let gameStarted = false;
let obstacles = [];
let currentLane = 1;
const lanes = [-2.5, 0, 2.5];

function init() {
    console.log("init() запущена");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b0a3d);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Свет
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0xffaaff, 1.2);
    light.position.set(5, 10, 10);
    scene.add(light);

    // Дорога
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 300),
        new THREE.MeshStandardMaterial({ color: 0x3a0a5f })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.z = -80;
    scene.add(road);

    // Игрок (розовый кубик)
    player = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xff00ff })
    );
    player.position.set(lanes[currentLane], 1, 0);
    scene.add(player);

    camera.position.set(0, 6, 13);
    camera.lookAt(0, 1, 0);

    animate();
    console.log("Сцена готова");
}

function animate() {
    requestAnimationFrame(animate);

    if (gameStarted && player) {
        // Имитация бега
        player.position.z -= 0.08;
        player.rotation.y = Math.sin(Date.now() * 0.005) * 0.1;

        // Движение препятствий
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].position.z += 0.22;
            if (obstacles[i].position.z > 15) {
                scene.remove(obstacles[i]);
                obstacles.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}

// ====================== УПРАВЛЕНИЕ ======================
let touchStartX = 0;

document.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {
    if (!gameStarted || !player) return;

    const diff = touchStartX - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 40) {
        // Свайп влево/вправо
        if (diff > 0 && currentLane < 2) currentLane++;
        else if (diff < 0 && currentLane > 0) currentLane--;

        player.position.x = lanes[currentLane];
    } else {
        // Прыжок
        jump();
    }
});

function jump() {
    if (!player || player.position.y > 1.5) return;

    let y = 1;
    let vel = 0.45;

    const interval = setInterval(() => {
        vel -= 0.035;
        y += vel;
        player.position.y = y;

        if (y <= 1) {
            player.position.y = 1;
            clearInterval(interval);
        }
    }, 16);
}

// Спавн препятствий
function spawnObstacle() {
    if (!gameStarted) return;

    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.6, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xff3333 })
    );
    const lane = Math.floor(Math.random() * 3);
    obs.position.set(lanes[lane], 0.8, -45);
    scene.add(obs);
    obstacles.push(obs);
}

function startGame() {
    console.log("startGame вызвана");
    const menu = document.getElementById("menu");
    menu.style.opacity = "0";

    setTimeout(() => {
        menu.style.display = "none";
        gameStarted = true;
        console.log("Игра запущена!");

        // Запуск спавна препятствий
        setInterval(spawnObstacle, 1300);
    }, 350);
}

// Запуск
window.addEventListener("load", () => {
    console.log("Страница загружена");
    init();
});
