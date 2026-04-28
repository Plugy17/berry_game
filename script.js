console.log("script.js загружен");

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let scene, camera, renderer, player;
let gameStarted = false;

function init() {
    console.log("init() начала работу");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x440077);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(2);
    document.body.appendChild(renderer.domElement);

    console.log("Renderer и canvas созданы");

    // Свет
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    const light = new THREE.DirectionalLight(0xffaaff, 1);
    light.position.set(5, 10, 10);
    scene.add(light);

    // Большой яркий куб вместо игрока
    player = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2.5, 2),
        new THREE.MeshStandardMaterial({ color: 0xff00ff })
    );
    player.position.set(0, 1, 0);
    scene.add(player);

    camera.position.set(0, 6, 15);
    camera.lookAt(0, 1, 0);

    animate();
    console.log("init() завершена успешно");
}

function animate() {
    requestAnimationFrame(animate);
    if (gameStarted && player) {
        player.position.z -= 0.1;
        player.rotation.y += 0.03;
    }
    renderer.render(scene, camera);
}

function startGame() {
    console.log("=== Кнопка PLAY нажата ===");
    const menu = document.getElementById("menu");
    menu.style.opacity = "0";

    setTimeout(() => {
        menu.style.display = "none";
        gameStarted = true;
        console.log("Меню скрыто, игра должна запуститься");
    }, 400);
}

window.startGame = startGame;

// Запуск Three.js сразу при загрузке страницы
window.addEventListener("load", () => {
    console.log("Страница загружена — запускаем init()");
    init();
});
