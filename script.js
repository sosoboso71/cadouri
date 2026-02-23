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
// OBIECTE (emoji + stickere + profile)
// -----------------------------
let objects = [];

const MAX_OBJECTS = 150;

// -----------------------------
// SPAWN EMOJI (CA LA TINE ÎNAINTE)
// -----------------------------
function spawnEmoji(emoji) {
    if (objects.length > MAX_OBJECTS) return;

    objects.push({
        type: "emoji",
        emoji: emoji,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() * 2 - 1) * 3,
        vy: (Math.random() * 2 - 1) * 3,
        size: 40 + Math.random() * 40,
        born: Date.now()
    });
}

// -----------------------------
// SPAWN STICKER (PNG/JPG) – CA LA TINE
// -----------------------------
function spawnSticker(url) {
    if (objects.length > MAX_OBJECTS) return;

    const img = new Image();
    img.src = url;

    objects.push({
        type: "sticker",
        img: img,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() * 2 - 1) * 3,
        vy: (Math.random() * 2 - 1) * 3,
        size: 60 + Math.random() * 40,
        born: Date.now()
    });
}

// -----------------------------
// SPAWN PROFILE + EMOJI (NOU, MINIMAL)
// -----------------------------
function spawnProfileEmoji(emoji, profileUrl) {
    if (objects.length > MAX_OBJECTS) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = profileUrl;

    img.onload = () => {
        objects.push({
            type: "profileEmoji",
            img: img,
            emoji: emoji,
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() * 2 - 1) * 3,
            vy: (Math.random() * 2 - 1) * 3,
            size: 60,
            born: Date.now()
        });
    };
}

// -----------------------------
// DESENARE POZĂ ÎN CERC
// -----------------------------
function drawCircleImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    ctx.restore();
}

// -----------------------------
// LOOP DE RANDAT
// -----------------------------
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();

    for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];

        o.x += o.vx;
        o.y += o.vy;

        o.vx *= 0.99;
        o.vy *= 0.99;

        if (o.x < 0 || o.x > canvas.width) o.vx *= -1;
        if (o.y < 0 || o.y > canvas.height) o.vy *= -1;

        if (o.type === "emoji") {
            ctx.font = o.size + "px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(o.emoji, o.x, o.y);
        }

        if (o.type === "sticker" && o.img.complete) {
            ctx.drawImage(o.img, o.x - o.size/2, o.y - o.size/2, o.size, o.size);
        }

        if (o.type === "profileEmoji" && o.img.complete) {
            // poza de profil
            drawCircleImage(ctx, o.img, o.x, o.y, o.size);
            // emoji lângă poză
            ctx.font = "40px Arial";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(o.emoji, o.x + o.size / 2 + 10, o.y);
        }

        if (now - o.born > 6000) {
            objects.splice(i, 1);
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

            // încercăm să luăm poza de profil din câmpurile posibile
            const profileUrl =
                data.profilePictureUrl ||
                (data.userDetails &&
                 Array.isArray(data.userDetails.profilePictureUrls) &&
                 data.userDetails.profilePictureUrls[0]) ||
                null;

            const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
            let msgEmojis = msg.match(emojiRegex) || [];
            let nameEmojis = user.match(emojiRegex) || [];

            [...msgEmojis, ...nameEmojis].forEach(e => {
                if (profileUrl) {
                    spawnProfileEmoji(e, profileUrl);
                } else {
                    spawnEmoji(e);
                }
            });

            // emotes – ca la tine
            if (data.emotes) {
                data.emotes.forEach(e => {
                    if (e.emoteImageUrl) spawnSticker(e.emoteImageUrl);
                });
            }

            // badge-uri – ca la tine
            if (data.userBadges) {
                data.userBadges.forEach(b => {
                    if (b.badgeSceneType === 10 && b.image) {
                        spawnSticker(b.image);
                    }
                });
            }
        }

        // -----------------------------
        // CADOURI
        // -----------------------------
        if (packet.event === "gift") {
            const g = packet.data;

            const profileUrl =
                g.profilePictureUrl ||
                (g.userDetails &&
                 Array.isArray(g.userDetails.profilePictureUrls) &&
                 g.userDetails.profilePictureUrls[0]) ||
                null;

            let emo = "🎉";
            if (g.diamondCount <= 1) emo = "🎉";
            else if (g.diamondCount <= 20) emo = "💥";
            else emo = "🤯";

            if (profileUrl) {
                spawnProfileEmoji(emo, profileUrl);
            } else {
                spawnEmoji(emo);
            }
        }

    } catch (err) {
        console.error(err);
    }
};
