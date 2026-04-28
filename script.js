// ==================== BERRY RUNNER ====================
let scene, camera, renderer, player;
let gameStarted = false;

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

console.log("Скрипт загружен");

// Основная инициализация Three.js
function initThree() {
    console.log("initThree запущен");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b0a3d);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    document.body.appendChild(renderer.domElement);
    console.log("Canvas добавлен в body");

    // Свет
    const dirLight = new THREE.DirectionalLight(0xffccff, 1.4);
    dirLight.position.set(5, 10, 10);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    // Дорога
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 300),
        new THREE.MeshStandardMaterial({ color: 0x3a0a5f })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.1, -60);
    scene.add(road);

    // Временный игрок — яркий кубик (чтобы сразу видеть результат)
    const geometry = new THREE.BoxGeometry(1.2, 1.8, 1.2);
    const material = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    player = new THREE.Mesh(geometry, material);
    player.position.set(0, 0.9, 0);
    scene.add(player);

    camera.position.set(0, 5, 10);
    camera.lookAt(0, 1, 0);

    animate();
    console.log("initThree завершён успешно");
}

function animate() {
    requestAnimationFrame(animate);

    if (gameStarted && player) {
        // Движение игрока вперёд (для ощущения бега)
        player.position.z -= 0.15;
        
        // Лёгкое покачивание
        player.rotation.y = Math.sin(Date.now() * 0.003) * 0.1;
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ====================== ЗАПУСК ИГРЫ ======================
function startGame() {
    console.log("Кнопка PLAY нажата");

    const menu = document.getElementById("menu");
    if (menu) {
        menu.style.opacity = "0";
        setTimeout(() => {
            menu.style.display = "none";
            console.log("Меню скрыто");
            
            gameStarted = true;
            console.log("gameStarted = true");
        }, 400);
    }
}

// Управление
document.addEventListener("touchend", (e) => {
    if (!gameStarted || !player) return;

    const touch = e.changedTouches[0];
    // Простой прыжок по тапу
    if (player.position.y < 1) {
        let vel = 4;
        const jumpInterval = setInterval(() => {
            vel -= 0.35;
            player.position.y += vel * 0.07;
            if (player.position.y <= 0) {
                player.position.y = 0;
                clearInterval(jumpInterval);
            }
        }, 16);
    }
});

// Инициализация при загрузке страницы
window.onload = () => {
    console.log("window.onload сработал");
    initThree();
};

// Для отладки
console.log("Скрипт полностью загружен");
