let scene, camera, renderer;
let player, speed = 0.1;
let score = 0;
let obstacles = [];

function startGame() {
    document.getElementById("lobby").style.display = "none";
    document.getElementById("game").style.display = "block";

    init();
    animate();
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth/window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvas") });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // LIGHT
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    // PLAYER (Berry Unicorn simplified)
    player = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshStandardMaterial({ color: 0xff66cc })
    );

    player.position.y = 0.5;
    scene.add(player);

    camera.position.set(0, 5, 10);
}

// TAP = JUMP
document.addEventListener("click", () => {
    player.position.y += 2;
    setTimeout(() => player.position.y = 0.5, 300);
});

// OBSTACLES
function spawnObstacle() {
    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );

    obs.position.set((Math.random()-0.5)*5,0.5,-20);
    scene.add(obs);
    obstacles.push(obs);
}

setInterval(spawnObstacle, 1500);

// LOOP
function animate() {
    requestAnimationFrame(animate);

    player.position.z -= speed;

    obstacles.forEach((o, i) => {
        o.position.z += 0.1;

        // collision
        if (o.position.distanceTo(player.position) < 1) {
            alert("💀 GAME OVER");
            location.reload();
        }

        // collect logic (fake BERRY system)
        if (o.position.z > 10) {
            scene.remove(o);
            obstacles.splice(i,1);
            score += 1;
            document.getElementById("score").innerText = score;
        }
    });

    renderer.render(scene, camera);
}