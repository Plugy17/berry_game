let scene, camera, renderer;
let player;
let obstacles = [];
let coins = [];
let gameStarted = false;
let speed = 0.15;

const loader = new THREE.GLTFLoader();

// Telegram
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b0a3d);
    scene.fog = new THREE.Fog(0x2b0a3d, 5, 40);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffccff, 1.2);
    light.position.set(5, 10, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xaa66ff, 0.6));

    // Дорога
    const roadGeo = new THREE.PlaneGeometry(10, 200);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a0a5f });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -50;
    scene.add(road);

    camera.position.set(0, 3, 6);

    loadModels();
    animate();
}

function loadModels() {
    // Игрок
    loader.load("assets/berry.glb", (gltf) => {
        player = gltf.scene;
        player.scale.set(1, 1, 1);
        player.position.set(0, 0, 0);
        scene.add(player);
    });

    // Спавн препятствий
    setInterval(() => {
        if (!gameStarted) return;
        loader.load("assets/obstacle.glb", (gltf) => {
            let obs = gltf.scene;
            obs.position.set((Math.random() - 0.5) * 4, 0, -30);
            scene.add(obs);
            obstacles.push(obs);
        });
    }, 1500);

    // Спавн монет
    setInterval(() => {
        if (!gameStarted) return;
        loader.load("assets/coin.glb", (gltf) => {
            let coin = gltf.scene;
            coin.position.set((Math.random() - 0.5) * 4, 1, -30);
            scene.add(coin);
            coins.push(coin);
        });
    }, 1200);
}

function animate() {
    requestAnimationFrame(animate);

    if (gameStarted) {
        // Движение объектов
        obstacles.forEach(o => o.position.z += speed);
        coins.forEach(c => c.position.z += speed);

        // Удаление ушедших объектов
        obstacles = obstacles.filter(o => {
            if (o.position.z > 10) {
                scene.remove(o);
                return false;
            }
            return true;
        });

        coins = coins.filter(c => {
            if (c.position.z > 10) {
                scene.remove(c);
                return false;
            }
            return true;
        });

        if (player) {
            player.position.z -= speed * 0.5;
        }
    }

    renderer.render(scene, camera);
}

function startGame() {
    document.getElementById("menu").style.display = "none";
    gameStarted = true;
}

// Управление клавишами (для теста)
document.addEventListener("keydown", (e) => {
    if (!player) return;
    if (e.key === "ArrowLeft") player.position.x -= 0.5;
    if (e.key === "ArrowRight") player.position.x += 0.5;
    if (e.key === " ") {
        player.position.y = 2;
        setTimeout(() => player.position.y = 0, 400);
    }
});

init();
