// ==================== BERRY RUNNER v34 ====================

let scene, camera, renderer, player;
let gameStarted = false;
let obstacles = [];
let currentLane = 1;
const lanes = [-2.5, 0, 2.5];

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Ждём полной загрузки Three.js
window.addEventListener('load', () => {
    console.log("Страница загружена");
    
    if (typeof THREE === "undefined") {
        alert("Three.js всё ещё не загружен. Попробуйте обновить страницу.");
        return;
    }

    console.log("Three.js загружен успешно");
    init();
});

function init() {
    console.log("init() началась");

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

    // Игрок
    player = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2.0, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xff00ff })
    );
    player.position.set(lanes[currentLane], 1, 0);
    scene.add(player);

    camera.position.set(0, 6, 13);
    camera.lookAt(0, 1, 0);

    animate();
}

function animate() {
    requestAnimationFrame(animate);

    if (gameStarted && player) {
        player.position.z -= 0.08;
        player.rotation.y = Math.sin(Date.now() * 0.005) * 0.1;

        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].position.z += 0.25;
            if (obstacles[i].position.z > 20) {
                scene.remove(obstacles[i]);
                obstacles.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}

function startGame() {
    const menu = document.getElementById("menu");
    menu.style.opacity = "0";

    setTimeout(() => {
        menu.style.display = "none";
        gameStarted = true;

        // Запуск спавна препятствий
        setInterval(() => {
            if (!gameStarted) return;
            spawnObstacle();
        }, 1200);
    }, 400);
}

function spawnObstacle() {
    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.6, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xff3366 })
    );
    const lane = Math.floor(Math.random() * 3);
    obs.position.set(lanes[lane], 0.8, -50);
    scene.add(obs);
    obstacles.push(obs);
}

function jump() {
    if (!player || player.position.y > 2) return;
    // Простой прыжок
    let y = 1;
    let vel = 0.5;
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

// Управление
let touchStartX = 0;
document.addEventListener("touchstart", e => touchStartX = e.touches[0].clientX);
document.addEventListener("touchend", e => {
    if (!gameStarted || !player) return;
    const diff = touchStartX - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 40) {
        if (diff > 0 && currentLane < 2) currentLane++;
        else if (diff < 0 && currentLane > 0) currentLane--;
        player.position.x = lanes[currentLane];
    } else {
        jump();
    }
});
