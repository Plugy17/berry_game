// === ДИАГНОСТИЧЕСКИЙ ТЕСТ ===
alert("1. Скрипт начал загружаться");

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

alert("2. Telegram WebApp готов");

window.addEventListener('load', () => {
    alert("3. Страница полностью загружена — начинаем init()");

    try {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2b0a3d);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        alert("4. Canvas успешно создан и добавлен!");

        // Простой кубик
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        camera.position.z = 8;

        function animate() {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        animate();

        alert("5. Игра запущена! Должен быть вращающийся розовый кубик.");

    } catch (error) {
        alert("ОШИБКА: " + error.message);
        console.error(error);
    }
});
