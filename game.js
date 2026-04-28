// ---------------- SCENE ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------------- LIGHT ----------------
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// ---------------- PLAYER ----------------
const player = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffd700 })
);

player.position.y = 0.5;
scene.add(player);

// ---------------- CAMERA ----------------
camera.position.set(0, 8, 8);
camera.lookAt(0, 0, 0);

// ---------------- GAME STATE ----------------
let score = 0;
let enemies = [];
let bombs = [];

// ---------------- MOVE PLAYER ----------------
document.addEventListener("keydown", (e) => {
    if (e.key === "a") player.position.x -= 0.5;
    if (e.key === "d") player.position.x += 0.5;
    if (e.key === "w") player.position.z -= 0.5;
    if (e.key === "s") player.position.z += 0.5;
});

// ---------------- ATTACK ----------------
document.getElementById("attackBtn").onclick = () => {
    const bomb = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x00ffff })
    );

    bomb.position.copy(player.position);
    scene.add(bomb);

    bombs.push(bomb);
};

// ---------------- ENEMIES ----------------
function spawnEnemy() {
    const enemy = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );

    enemy.position.x = (Math.random() - 0.5) * 10;
    enemy.position.z = -10;

    scene.add(enemy);
    enemies.push(enemy);
}

setInterval(spawnEnemy, 1200);

// ---------------- LOOP ----------------
function animate() {
    requestAnimationFrame(animate);

    // enemies move
    enemies.forEach((e, i) => {
        e.position.z += 0.03;

        if (e.position.distanceTo(player.position) < 1) {
            alert("💀 GAME OVER");
            location.reload();
        }
    });

    // bombs logic
    bombs.forEach((b, bi) => {
        b.position.z -= 0.2;

        enemies.forEach((e, ei) => {
            if (b.position.distanceTo(e.position) < 1) {

                // kill enemy
                scene.remove(e);
                enemies.splice(ei, 1);

                // remove bomb
                scene.remove(b);
                bombs.splice(bi, 1);

                // reward
                score += 10;
                document.getElementById("score").innerText = score;

                // ice effect
                const ice = new THREE.Mesh(
                    new THREE.SphereGeometry(0.2, 8, 8),
                    new THREE.MeshStandardMaterial({ color: 0xffffff })
                );

                ice.position.copy(e.position);
                scene.add(ice);

                setTimeout(() => scene.remove(ice), 500);
            }
        });
    });

    renderer.render(scene, camera);
}

animate();