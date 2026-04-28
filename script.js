let scene, camera, renderer;
let player;

let lanes = [-2, 0, 2];
let laneIndex = 1;

let obstacles = [];
let coins = [];

let score = 0;
let gameActive = false;

let speed = 0.15;

// ---------------- INIT ----------------
function init() {

scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b0a3d);
scene.fog = new THREE.Fog(0x2b0a3d, 5, 40);

camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 6);
camera.lookAt(0,0,0);

renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// LIGHT
let light = new THREE.DirectionalLight(0xffccff, 1.2);
light.position.set(5,10,5);
scene.add(light);

scene.add(new THREE.AmbientLight(0xaa66ff,0.5));

// ROAD
let road = new THREE.Mesh(
    new THREE.PlaneGeometry(10,200),
    new THREE.MeshStandardMaterial({color:0x3a0a5f})
);
road.rotation.x = -Math.PI/2;
road.position.z = -50;
scene.add(road);

// PLAYER
player = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0xff66ff})
);
player.position.set(0,0,0);
scene.add(player);

animate();
}

// ---------------- SPAWN ----------------
function spawnObstacle() {
let obs = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0xff0000})
);
obs.position.set(lanes[Math.floor(Math.random()*3)],0,-30);
scene.add(obs);
obstacles.push(obs);
}

function spawnCoin() {
let coin = new THREE.Mesh(
    new THREE.SphereGeometry(0.4),
    new THREE.MeshStandardMaterial({color:0xffff00})
);
coin.position.set(lanes[Math.floor(Math.random()*3)],1,-30);
scene.add(coin);
coins.push(coin);
}

setInterval(()=>{ if(gameActive) spawnObstacle(); },1200);
setInterval(()=>{ if(gameActive) spawnCoin(); },900);

// ---------------- GAME LOOP ----------------
function animate(){
requestAnimationFrame(animate);

if(gameActive){

// move objects
obstacles.forEach(o=>o.position.z+=speed);
coins.forEach(c=>c.position.z+=speed);

// collision
obstacles.forEach(o=>{
if(Math.abs(o.position.x-player.position.x)<1 && Math.abs(o.position.z-player.position.z)<1){
gameOver();
}
});

coins.forEach((c,i)=>{
if(Math.abs(c.position.x-player.position.x)<1 && Math.abs(c.position.z-player.position.z)<1){
score+=1;
document.getElementById("hud").innerText="Score: "+score;
scene.remove(c);
coins.splice(i,1);
}
});

// clean
obstacles=obstacles.filter(o=>o.position.z<10);
coins=coins.filter(c=>c.position.z<10);
}

renderer.render(scene,camera);
}

// ---------------- INPUT (SWIPE + KEY) ----------------
document.addEventListener("keydown",(e)=>{

if(e.key==="ArrowLeft") moveLeft();
if(e.key==="ArrowRight") moveRight();
if(e.key==="ArrowUp") jump();

});

function moveLeft(){
laneIndex=Math.max(0,laneIndex-1);
player.position.x=lanes[laneIndex];
}

function moveRight(){
laneIndex=Math.min(2,laneIndex+1);
player.position.x=lanes[laneIndex];
}

function jump(){
player.position.y=1.5;
setTimeout(()=>player.position.y=0,400);
}

// ---------------- GAME STATE ----------------
function startGame(){
document.getElementById("menu").style.display="none";
gameActive=true;
score=0;
}

function gameOver(){
gameActive=false;
document.getElementById("gameOver").style.display="flex";
document.getElementById("finalScore").innerText="Score: "+score;
}

function restart(){
location.reload();
}

function backMenu(){
location.reload();
}

// ---------------- RESIZE ----------------
window.startGame = startGame;
window.restart = restart;
window.backMenu = backMenu;
init();
