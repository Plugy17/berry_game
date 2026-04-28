alert("Скрипт загрузился! v32");

// Проверка, загрузилась ли библиотека Three.js
if (typeof THREE === "undefined") {
    alert("ОШИБКА: Three.js не загружен!");
} else {
    alert("Three.js успешно загружен!");
}

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let scene, camera, renderer, player;
let gameStarted = false;

function init() {
    alert("Начинаем создание сцены...");

    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2b0a3d);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        alert("✅ Canvas создан!");

        // Простой розовый кубик
        player = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 2, 1.5),
            new THREE.MeshBasicMaterial({ color: 0xff00ff })
        );
        player.position.set(0, 1, 0);
        scene.add(player);

        camera.position.set(0, 6, 12);

        function animate() {
            requestAnimationFrame(animate);
            if (gameStarted) {
                player.rotation.y += 0.02;
            }
            renderer.render(scene, camera);
        }
        animate();

        alert("✅ Игра запущена! Должен быть розовый кубик.");

    } catch (e) {
        alert("Ошибка при создании сцены: " + e.message);
    }
}

function startGame() {
    alert("PLAY нажата");
    document.getElementById("menu").style.display = "none";
    gameStarted = true;
}

// Запуск после полной загрузки страницы
window.addEventListener("load", () => {
    alert("Страница загружена — запускаем игру");
    init();
});
