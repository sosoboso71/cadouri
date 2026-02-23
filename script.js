const ws = new WebSocket("ws://localhost:62024");
const emojiContainer = document.getElementById("emoji-container");

const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;

// Elimină cifrele romane / simboluri false
function filterRealEmojis(list) {
    return list.filter(e =>
        !/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅬⅭⅮⅯ]+$/.test(e)
    );
}

// -----------------------------
// SISTEM FIZIC GLOBAL
// -----------------------------
let objects = [];

function spawnPhysicsObject(el) {
    const w = emojiContainer.clientWidth;
    const h = emojiContainer.clientHeight;

    const obj = {
        el,
        x: Math.random() * (w - 100),
        y: Math.random() * (h - 100),
        vx: (Math.random() * 2 - 1) * 6,
        vy: (Math.random() * 2 - 1) * 6,
        size: el.offsetWidth,
        born: Date.now()
    };
    objects.push(obj);
}

// -----------------------------
// EXPLOZIE MEDIE
// -----------------------------
function explode(obj) {
    const rect = obj.el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 6; i++) {
        const p = document.createElement("div");
        p.classList.add("particle");
        p.style.left = centerX + "px";
        p.style.top = centerY + "px";
        emojiContainer.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const speed = 10 + Math.random() * 10;

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        animateParticle(p, vx, vy);
    }
}

function animateParticle(p, vx, vy) {
    let x = parseFloat(p.style.left);
    let y = parseFloat(p.style.top);
    let life = 0;

    function frame() {
        life += 1;
        x += vx;
        y += vy;
        p.style.left = x + "px";
        p.style.top = y + "px";
        p.style.opacity = 1 - life / 60;

        if (life < 60) requestAnimationFrame(frame);
        else p.remove();
    }
    frame();
}

// -----------------------------
// LOOP FIZIC
// -----------------------------
function physicsLoop() {
    const now = Date.now();
    const w = emojiContainer.clientWidth;
    const h = emojiContainer.clientHeight;

    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const el = obj.el;

        const cx = w / 2;
        const cy = h / 2;

        const dx = cx - obj.x;
        const dy = cy - obj.y;

        obj.vx += dx * 0.0004;
        obj.vy += dy * 0.0004;

        obj.vx *= 1.015;
        obj.vy *= 1.015;

        obj.x += obj.vx;
        obj.y += obj.vy;

        if (obj.x < 0 || obj.x > w - obj.size) obj.vx *= -1;
        if (obj.y < 0 || obj.y > h - obj.size) obj.vy *= -1;

        el.style.left = obj.x + "px";
        el.style.top = obj.y + "px";

        if (now - obj.born > 8000) {
            explode(obj);
            el.remove();
            objects.splice(i, 1);
        }
    }

    requestAnimationFrame(physicsLoop);
}
physicsLoop();

// -----------------------------
// MULTIPLICARE EMOJI
// -----------------------------
function spawnEmoji(emoji) {
    for (let i = 0; i < 3; i++) createEmojiInstance(emoji);

    setTimeout(() => {
        for (let i = 0; i < 3; i++) createEmojiInstance(emoji);
    }, 300);
}

function createEmojiInstance(emoji) {
    const el = document.createElement("div");
    el.classList.add("emoji");
    el.textContent = emoji;

    el.style.position = "absolute";
    el.style.fontSize = (40 + Math.random() * 40) + "px";

    emojiContainer.appendChild(el);

    spawnPhysicsObject(el);
}

// -----------------------------
// STICKERE
// -----------------------------
function spawnSticker(url) {
    const img = document.createElement("img");
    img.src = url;
    img.classList.add("sticker");

    img.style.position = "absolute";
    img.style.width = (80 + Math.random() * 40) + "px";

    emojiContainer.appendChild(img);

    spawnPhysicsObject(img);
}

// -----------------------------
// WEBSOCKET
// -----------------------------
ws.onopen = () => {
    console.log("🔌 Conectat la Indofinity");
};

ws.onmessage = (event) => {
    try {
        const packet = JSON.parse(event.data);

        // -----------------------------
        // CHAT
        // -----------------------------
        if (packet.event === "chat") {
            const data = packet.data;

            const msg = data.comment || "";
            const user = data.nickname || "";

            let msgEmojis = msg.match(emojiRegex) || [];
            let nameEmojis = user.match(emojiRegex) || [];

            msgEmojis = filterRealEmojis(msgEmojis);
            nameEmojis = filterRealEmojis(nameEmojis);

            [...msgEmojis, ...nameEmojis].forEach(spawnEmoji);

            if (data.emotes) {
                data.emotes.forEach(e => {
                    if (e.emoteImageUrl) spawnSticker(e.emoteImageUrl);
                });
            }

            if (data.userBadges && Array.isArray(data.userBadges)) {
                data.userBadges.forEach(badge => {
                    if (badge.badgeSceneType === 10 && badge.image) {
                        spawnSticker(badge.image);
                    }
                });
            }

            // -----------------------------
            // CUVINTE CHEIE
            // -----------------------------
            const lower = msg.toLowerCase();

            if (lower.includes("boom")) spawnEmoji("💥");
            if (lower.includes("party")) spawnEmoji("🎉");
            if (lower.includes("rain")) spawnEmoji("🌧️");
            if (lower.includes("spin")) spawnEmoji("🌀");
        }

        // -----------------------------
        // CADOURI
        // -----------------------------
        if (packet.event === "gift") {
            const g = packet.data;

            console.log("🎁 Cadou primit:", g.giftName, g.diamondCount);

            if (g.diamondCount <= 1) {
                spawnEmoji("🎉"); // confetti
            } 
            else if (g.diamondCount <= 20) {
                spawnEmoji("💥"); // explosion
            } 
            else {
                spawnEmoji("🤯"); // vortex
            }
        }

    } catch (err) {
        console.error("Eroare:", err);
    }
};