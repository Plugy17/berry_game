let gameStarted = false;

let player = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    speed: 4,
    level: 1,
    exp: 0,
    hp: 10,
    damage: 1
};

let score = 0;

let keys = {};
let mouse = {x:0, y:0};

let pet = {
    active: false,
    x: player.x,
    y: player.y
};

const game = document.getElementById("game");
const p = document.getElementById("player");

/* START */
document.getElementById("startBtn").onclick = () => {
    document.getElementById("startScreen").style.display = "none";
    game.style.display = "block";
    gameStarted = true;
};

/* CONTROL */
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

document.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

/* LOOP */
function loop(){
    if(!gameStarted) return requestAnimationFrame(loop);

    if(keys["w"]) player.y -= player.speed;
    if(keys["s"]) player.y += player.speed;
    if(keys["a"]) player.x -= player.speed;
    if(keys["d"]) player.x += player.speed;

    p.style.left = player.x + "px";
    p.style.top = player.y + "px";

    if(pet.active){
        pet.x += (player.x - pet.x) * 0.1;
        pet.y += (player.y - pet.y) * 0.1;
        drawPet();
    }

    requestAnimationFrame(loop);
}

/* PET */
function spawnPet(){
    pet.active = true;
}

function drawPet(){
    let el = document.getElementById("pet");

    if(!el){
        el = document.createElement("div");
        el.id = "pet";
        el.innerText = "🐉";
        game.appendChild(el);
    }

    el.style.left = pet.x + "px";
    el.style.top = pet.y + "px";
}

/* SHOOT */
document.addEventListener("click", () => {
    if(!gameStarted) return;

    let b = document.createElement("div");
    b.className = "bomb";

    let dx = mouse.x - player.x;
    let dy = mouse.y - player.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    let vx = dx / dist * 8;
    let vy = dy / dist * 8;

    let x = player.x;
    let y = player.y;

    b.style.left = x + "px";
    b.style.top = y + "px";

    game.appendChild(b);

    let move = setInterval(() => {
        x += vx;
        y += vy;

        b.style.left = x + "px";
        b.style.top = y + "px";

        document.querySelectorAll(".enemy").forEach(en => {
            let ex = en.offsetLeft;
            let ey = en.offsetTop;

            if(Math.abs(x-ex)<40 && Math.abs(y-ey)<40){

                en.hp -= player.damage;

                if(en.hp <= 0){
                    en.remove();
                    score += player.level;
                    player.exp++;

                    if(player.exp >= 5){
                        player.level++;
                        player.damage++;
                        player.exp = 0;
                    }

                    updateUI();
                }
            }
        });

    },20);

    setTimeout(()=>{
        clearInterval(move);
        b.remove();
    },2000);
});

/* ENEMIES */
function spawnEnemy(){
    let e = document.createElement("div");
    e.className = "enemy";

    e.x = Math.random()*window.innerWidth;
    e.y = Math.random()*window.innerHeight;

    e.hp = 2 + Math.floor(player.level);

    e.style.left = e.x + "px";
    e.style.top = e.y + "px";

    game.appendChild(e);

    setInterval(()=>{
        let dx = player.x - e.x;
        let dy = player.y - e.y;

        e.x += dx * 0.01;
        e.y += dy * 0.01;

        e.style.left = e.x + "px";
        e.style.top = e.y + "px";

        if(Math.abs(player.x - e.x) < 40 && Math.abs(player.y - e.y) < 40){
            player.hp--;

            if(player.hp <= 0){
                alert("💀 GAME OVER");
                location.reload();
            }

            updateUI();
        }

    },30);
}

setInterval(spawnEnemy,2000);

/* UI */
function updateUI(){
    document.getElementById("score").innerText = score;
    document.getElementById("lvl").innerText = player.level;
    document.getElementById("hp").innerText = player.hp;
}

/* START LOOP */
loop();