 // -----------------------------
// CANVAS SETUP (cu scalare corectă DPI)
// -----------------------------
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resize() {
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    ctx.scale(dpr, dpr);
}
resize();
window.onresize = resize;

// -----------------------------
// OBIECTE (emoji + stickere)
// -----------------------------
let objects = [];
let confetti = [];

const MAX_OBJECTS = 150;

// -----------------------------
// SPAWN EMOJI
// -----------------------------
function spawnEmoji(emoji) {
    if (objects.length > MAX_OBJECTS) return;

    objects.push({
        type: "emoji",
        emoji: emoji,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() * 2 - 1) * 6,   // viteza marita
        vy: (Math.random() * 2 - 1) * 6,
        size: 60 + Math.random() * 40,     // emoji mai mari
        born: Date.now()
    });
}

// -----------------------------
// SPAWN STICKER (PNG/JPG)
// -----------------------------
function spawnSticker(url) {
    if (objects.length > MAX_OBJECTS) return;

    const img = new Image();
    img.src = url;

    objects.push({
        type: "sticker",
        img: img,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() * 2 - 1) * 6,   // viteza marita
        vy: (Math.random() * 2 - 1) * 6,
        size: 120 + Math.random() * 80,    // stickere mult mai mari
        born: Date.now()
    });
}

// -----------------------------
// CONFETTI REAL
// -----------------------------
function startConfetti() {
    for (let i = 0; i < 150; i++) {
        confetti.push({
            x: Math.random() * window.innerWidth,
            y: -20,
            vx: (Math.random() - 0.5) * 3,
            vy: 3 + Math.random() * 4,
            size: 6 + Math.random() * 6,
            color: `hsl(${Math.random() * 360}, 90%, 60%)`,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.25
        });
    }
}

// -----------------------------
// LOOP DE RANDAT
// -----------------------------
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();

    // -----------------------------
    // RANDAT EMOJI + STICKERE
    // -----------------------------
    for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];

        o.x += o.vx;
        o.y += o.vy;

        o.vx *= 0.99;
        o.vy *= 0.99;

        if (o.x < 0 || o.x > window.innerWidth) o.vx *= -1;
        if (o.y < 0 || o.y > window.innerHeight) o.vy *= -1;

        if (o.type === "emoji") {
            ctx.font = o.size + "px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(o.emoji, o.x, o.y);
        }

        if (o.type === "sticker" && o.img.complete) {
            ctx.drawImage(o.img, o.x - o.size/2, o.y - o.size/2, o.size, o.size);
        }

        if (now - o.born > 6000) {
            objects.splice(i, 1);
        }
    }

    // -----------------------------
    // RANDAT CONFETTI
    // -----------------------------
    for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];

        c.x += c.vx;
        c.y += c.vy;
        c.angle += c.spin;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size/2, -c.size/2, c.size, c.size);
        ctx.restore();

        if (c.y > window.innerHeight + 50) {
            confetti.splice(i, 1);
        }
    }

    requestAnimationFrame(loop);
}
loop();

// -----------------------------
// WEBSOCKET INDofinity
// -----------------------------
const ws = new WebSocket("ws://localhost:62024");

ws.onopen = () => console.log("Conectat la Indofinity");

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

            const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
            let msgEmojis = msg.match(emojiRegex) || [];
            let nameEmojis = user.match(emojiRegex) || [];

            [...msgEmojis, ...nameEmojis].forEach(spawnEmoji);

            if (data.emotes) {
                data.emotes.forEach(e => {
                    if (e.emoteImageUrl) spawnSticker(e.emoteImageUrl);
                });
            }

            if (data.userBadges) {
                data.userBadges.forEach(b => {
                    if (b.badgeSceneType === 10 && b.image) {
                        spawnSticker(b.image);
                    }
                });
            }

            const lower = msg.toLowerCase();
            if (lower.includes("boom")) spawnEmoji("💥");
            if (lower.includes("party")) startConfetti();
            if (lower.includes("rain")) spawnEmoji("🌧️");
            if (lower.includes("spin")) spawnEmoji("🌀");
        }

        // -----------------------------
        // CADOURI
        // -----------------------------
        if (packet.event === "gift") {
            const g = packet.data;

            if (g.diamondCount <= 1) startConfetti();
            else if (g.diamondCount <= 20) spawnEmoji("💥");
            else spawnEmoji("🤯");
        }

    } catch (err) {
        console.error(err);
    }
};
