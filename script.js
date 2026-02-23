  // -----------------------------
// CANVAS SETUP
// -----------------------------
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.onresize = resize;

// -----------------------------
// OBIECTE (emoji + profile pics)
// -----------------------------
let objects = [];
const MAX_OBJECTS = 150;

// -----------------------------
// SPAWN EMOJI + PROFILE PIC
// -----------------------------
function spawnProfileEmoji(emoji, profileUrl) {
    if (objects.length > MAX_OBJECTS) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = profileUrl;

    img.onload = () => {
        const animations = ["bounce", "float", "explode", "spin"];

        objects.push({
            type: "profileEmoji",
            img: img,
            emoji: emoji,
            x: Math.random() * canvas.width,
            y: canvas.height + 50,
            size: 60,
            alpha: 1,
            vx: (Math.random() - 0.5) * 2,
            vy: -2 - Math.random() * 2,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            animationType: animations[Math.floor(Math.random() * animations.length)],
            born: Date.now()
        });
    };
}

// -----------------------------
// DESENARE POZĂ ÎN CERC
// -----------------------------
function drawCircleImage(ctx, img, x, y, size, rotation) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.arc(0, 0, size/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, -size/2, -size/2, size, size);
    ctx.restore();
}

// -----------------------------
// ANIMAȚII RANDOM
// -----------------------------
function animateBounce(o) {
    o.vy += 0.1;
    o.y += o.vy;
    if (o.y > canvas.height - o.size) {
        o.y = canvas.height - o.size;
        o.vy *= -0.7;
    }
}

function animateFloat(o) {
    o.y -= 1.5;
    o.alpha -= 0.003;
}

function animateExplode(o) {
    o.x += o.vx * 5;
    o.y += o.vy * 5;
    o.alpha -= 0.01;
}

function animateSpin(o) {
    o.y -= 1.2;
    o.rotation += o.rotationSpeed;
    o.alpha -= 0.004;
}

// -----------------------------
// LOOP DE RANDAT
// -----------------------------
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();

    for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];

        // APLICĂ ANIMAȚIA RANDOM
        if (o.animationType === "bounce") animateBounce(o);
        if (o.animationType === "float") animateFloat(o);
        if (o.animationType === "explode") animateExplode(o);
        if (o.animationType === "spin") animateSpin(o);

        ctx.globalAlpha = o.alpha;

        // DESENARE POZĂ DE PROFIL
        drawCircleImage(ctx, o.img, o.x, o.y, o.size, o.rotation);

        // DESENARE EMOJI LÂNGĂ POZĂ
        ctx.font = "40px Arial";
        ctx.fillText(o.emoji, o.x + o.size + 10, o.y + o.size * 0.75);

        ctx.globalAlpha = 1;

        // ȘTERGE DUPĂ 6 SECUNDE
        if (now - o.born > 6000 || o.alpha <= 0) {
            objects.splice(i, 1);
        }
    }

    requestAnimationFrame(loop);
}
loop();

// -----------------------------
// WEBSOCKET INDOfinity
// -----------------------------
const ws = new WebSocket("ws://localhost:62024");

ws.onopen = () => console.log("Conectat la Indofinity");

ws.onmessage = (event) => {
    try {
        const packet = JSON.parse(event.data);

        if (packet.event === "chat") {
            const data = packet.data;

            const msg = data.comment || "";
            const user = data.nickname || "";
            const profile = data.profilePictureUrl || null;

            if (!profile) return;

            const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
            let msgEmojis = msg.match(emojiRegex) || [];
            let nameEmojis = user.match(emojiRegex) || [];

            [...msgEmojis, ...nameEmojis].forEach(e => {
                spawnProfileEmoji(e, profile);
            });
        }

        if (packet.event === "gift") {
            const g = packet.data;
            const profile = g.profilePictureUrl || null;
            if (!profile) return;

            if (g.diamondCount <= 1) spawnProfileEmoji("🎉", profile);
            else if (g.diamondCount <= 20) spawnProfileEmoji("💥", profile);
            else spawnProfileEmoji("🤯", profile);
        }

    } catch (err) {
        console.error(err);
    }
};
