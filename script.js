// === ПРОСТОЙ ТЕСТ BERRY RUNNER ===

console.log("=== script.js ЗАГРУЗИЛСЯ ===");

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let scene, camera, renderer, player;
let gameStarted = false;

// Основная функция
function init() {
    console.log("init() запущена");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0033);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(2);
    document.body.appendChild(renderer.domElement);

    console.log("Canvas успешно добавлен!");

    // Свет
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0xff88ff, 1);
    light.position.set(0, 10, 10);
    scene.add(light);

    // Игрок — большой ярко-розовый куб
    const geo = new THREE.BoxGeometry(1.5, 2, 1.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    player = new THREE.Mesh(geo, mat);
    player.position.set(0, 1, 0);
    scene.add(player);

    camera.position.set(0, 6, 12);
    camera.lookAt(0, 1, 0);

    animate();
}

function animate() {
    requestAnimationFrame(animate);

    if (gameStarted && player) {
        player.position.z -= 0.12;
        player.rotation.y += 0.02;
    }

    renderer.render(scene, camera);
}

// Запуск игры после нажатия PLAY
function startGame() {
    console.log("startGame() вызвана — скрываем меню");

    const menu = document.getElementById("menu");
    menu.style.opacity = "0";

    setTimeout(() => {
        menu.style.display = "none";
        gameStarted = true;
        console.log("Меню скрыто, игра запущена!");
    }, 300);
}

// Привязываем событие к кнопке (на всякий случай)
window.startGame = startGame;

// Автозапуск Three.js при загрузке страницы
window.addEventListener('load', () => {
    console.log("window load событие сработало");
    init();
});

console.log("=== script.js полностью выполнен ===");
