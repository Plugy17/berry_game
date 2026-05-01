// Ждем полной загрузки DOM и скриптов
window.addEventListener('load', () => {
    // Проверяем наличие объекта Telegram
    const tg = window.Telegram?.WebApp;

    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        // Мы ВНУТРИ Telegram
        tg.expand(); // Раскрыть на весь экран
        tg.ready();  // Сказать ТГ, что мы готовы
        
        player.uid = tg.initDataUnsafe.user.id.toString();
        player.nick = tg.initDataUnsafe.user.first_name || "Hero";
        
        console.log("Успешный вход через ТГ:", player.nick);
    } else {
        // Мы В ОБЫЧНОМ БРАУЗЕРЕ (для отладки)
        console.log("Запуск вне ТГ. Включен режим гостя.");
        player.uid = "dev_user_777"; 
        player.nick = "Разработчик"; // Напиши тут любое имя для тестов
    }

    // Обновляем текст на экране сразу после определения имени
    ui.update();
    
    // Скрываем загрузчик (если он есть) и показываем меню
    setTimeout(() => ui.show('screen-menu'), 500);
});

// --- СИСТЕМА ЭКРАНОВ ---
const ui = {
    show(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        this.update();
    },
    update() {
        document.getElementById('ui-nick').innerText = `ГЕРОЙ: ${player.nick}`;
        document.getElementById('ui-balance').innerText = `${player.coins} 🍦 | ${player.diamonds} 💎`;
        document.getElementById('inv-shield').innerText = player.inv.shield;
        document.getElementById('inv-magnet').innerText = player.inv.magnet;
    }
};

// --- БАЗОВАЯ ИГРОВАЯ ЛОГИКА ---
const game = {
    running: false,
    score: 0,
    speed: 7,
    lanes: [12.5, 37.5, 62.5, 87.5],
    currentLane: 1,

    start() {
        this.running = true;
        this.score = 0;
        ui.show('screen-game');
        this.resetObstacle();
        this.loop();
    },

    resetObstacle() {
        const obs = document.getElementById('obstacle');
        this.obsX = this.lanes[Math.floor(Math.random() * 4)];
        this.obsY = -100;
        obs.style.left = this.obsX + "%";
    },

    loop() {
        if (!this.running) return;
        this.obsY += this.speed;
        const obs = document.getElementById('obstacle');
        obs.style.top = this.obsY + "px";

        if (this.obsY > window.innerHeight) this.resetObstacle();
        
        requestAnimationFrame(() => this.loop());
    }
};

// --- ЗАГРУЗКА ---
window.onload = () => {
    // Авторизация из старого кода
    if (tg?.initDataUnsafe?.user) {
        player.uid = tg.initDataUnsafe.user.id.toString();
        player.nick = tg.initDataUnsafe.user.first_name;
    }

    // Здесь будет вызов Firebase (GetDoc)
    // loadFromFirebase(player.uid); 

    ui.update = function() {
    const nickElem = document.getElementById('ui-nick');
    const balanceElem = document.getElementById('ui-balance');
    
    if (nickElem) nickElem.innerText = `ГЕРОЙ: ${player.nick}`;
    if (balanceElem) balanceElem.innerText = `${player.coins} 🍦 | ${player.diamonds} 💎`;
};
