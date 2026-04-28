let scene, camera, renderer;

let player;
let obstacles = [];
let coins = [];

let gameStarted = false;
let speed = 0.15;

let particles; // ✨ частицы

const loader = new THREE.GLTFLoader();

// ---------------- INIT ----------------
function init() {

    scene = new THREE.Scene();

    // 💜 фон
    scene.background = new THREE.Color(0x2b0a3d);

    // 🌫 туман
    scene.fog = new THREE.Fog(0x2b0a3d, 5, 40);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 💡 красивый свет
    const light = new THREE.DirectionalLight(0xffccff, 1.2);
    light.position.set(5, 10, 5);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xaa66ff, 0.6);
    scene.add(ambient);

    // 🌍 дорога
    const roadGeo = new THREE.PlaneGeometry(10, 200);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a0a5f });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -50;
    scene.add(road);

    // ✨ частицы (магия)
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 300;

    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 50;
    }

    particlesGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    const particlesMaterial = new THREE.PointsMaterial({
        color: 0xff66ff,
        size: 0.1
    });

    particles = new THREE.Points(
        particlesGeometry,
        particlesMaterial
    );

    scene.add(particles);

    camera.position.set(0, 3, 6);

    loadModels();
    animate();
}

// ---------------- MODELS ----------------
function loadModels() {

    // ❌ environment.glb больше не нужен (мы сделали фон без него)

    // 🦄 PLAYER
    loader.load("assets/berry.glb", (gltf) => {
        player = gltf.scene;
        player.scale.set(1, 1, 1);
        player.position.set(0, 0, 0);
        scene.add(player);
    });

    // 🧱 OBSTACLE SPAWN
    setInterval(() => {
        if (!gameStarted) return;

        loader.load("assets/obstacle.glb", (gltf) => {
            let obs = gltf.scene;
            obs.position.set((Math.random() - 0.5) * 4, 0, -30);
            obs.scale.set(1, 1, 1);

            scene.add(obs);
            obstacles.push(obs);
        });
    }, 1500);

    // 🪙 COINS
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

// ---------------- GAME LOOP ----------------
function animate() {
    requestAnimationFrame(animate);

    // 💜 анимация фона
    let t = Date.now() * 0.001;

    let r = 80 + Math.sin(t) * 40;
    let g = 20;
    let b = 140 + Math.cos(t) * 60;

    scene.background = new THREE.Color(`rgb(${r},${g},${b})`);

    // ✨ движение частиц
    if (particles) {
        particles.rotation.y += 0.0005;
        particles.position.z += 0.02;

        if (particles.position.z > 10) {
            particles.position.z = -30;
        }
    }

    if (gameStarted) {

        // движение мира
        obstacles.forEach(o => o.position.z += speed);
        coins.forEach(c => c.position.z += speed);

        // очистка
        obstacles = obstacles.filter(o => o.position.z < 10);
        coins = coins.filter(c => c.position.z < 10);

        // камера следует за игроком
        if (player) {
            player.position.z -= speed;
        }
    }

    renderer.render(scene, camera);
}

// ---------------- INPUT ----------------
document.addEventListener("keydown", (e) => {

    if (!player) return;

    if (e.key === "ArrowLeft") {
        player.position.x -= 0.5;
    }

    if (e.key === "ArrowRight") {
        player.position.x += 0.5;
    }

    if (e.key === " ") {
        player.position.y = 1.5;

        setTimeout(() => {
            player.position.y = 0;
        }, 400);
    }
});

// ---------------- START ----------------
function startGame() {
    document.getElementById("menu").style.display = "none";
    gameStarted = true;
}

// ---------------- RESIZE ----------------
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// INIT
init();