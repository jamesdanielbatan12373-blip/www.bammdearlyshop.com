
// ===================================
// CUSTOMIZE YOUR CONFESSION HERE
// ===================================

let savedDraft = {};
try {
    savedDraft = JSON.parse(localStorage.getItem("dearlyDraft") || "{}");
} catch (_) {
    savedDraft = {};
}
const cfg = window.DEARLY_CONFIG || savedDraft;
const crushName = cfg.crushName || "My Favorite Person";
const yourName = cfg.yourName || "Your Secret Admirer";

// You can write as LONG a message as you want!
const confession = cfg.confession || `
I don't really know where to start,
but I have something I've wanted to tell you.

You are someone who makes ordinary days
feel a little more special.

I love the way you smile, the way you laugh,
and even the little things you probably
don't notice about yourself.

I don't know exactly when I started feeling
this way, but I know that every time I see you,
my day somehow becomes better.

Sometimes I catch myself smiling just by
thinking about you.

I don't expect you to feel the same way.
I just wanted to be honest because I believe
some feelings are too beautiful to keep hidden.

I would love to know you more,
spend time with you, make memories,
and hopefully become someone who
can make you smile too.

You don't have to give me an answer right away.

I just hope this little surprise
makes you smile.

You deserve all the beautiful flowers
in this world. 🌷

And if I could give you one thing,
it would be the ability to see yourself
through my eyes.

Because you are special.
More than you probably know.

Thank you for being you. ❤️`;


// ===================================
// DISPLAY CUSTOM MESSAGE
// ===================================

document.getElementById("loveMessage").innerText = confession;

document.getElementById("senderName").innerText = yourName;

document.querySelector("#home h1").textContent = `Hey, ${crushName}! ♡`;
if (cfg.opening) document.querySelector("#home .description").innerText = cfg.opening;
if (cfg.question) document.querySelector("#question .question-text").innerText = cfg.question;
if (cfg.yesText) document.querySelector(".yes-button").innerText = cfg.yesText;
if (cfg.noText) document.querySelector(".no-button").innerText = cfg.noText;
if (cfg.startButton) document.querySelector("#home [data-page=\"garden\"]").innerText = cfg.startButton;
if (cfg.flowerAfter) window.DEARLY_FLOWER_MESSAGE = cfg.flowerAfter;
if (cfg.yesTitle) document.querySelector("#yes h1").innerText = cfg.yesTitle;
if (cfg.yesMessage) document.querySelector("#yes .description").innerText = cfg.yesMessage;
if (cfg.noTitle) document.querySelector("#no h1").innerText = cfg.noTitle;
if (cfg.noMessage) document.querySelector("#no .description").innerText = cfg.noMessage;
if (cfg.theme) document.body.dataset.theme = cfg.theme;
if (cfg.musicData) document.querySelector("#bgMusic source").src = cfg.musicData;


// ===================================
// PAGE NAVIGATION
// ===================================

function showPage(id) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    const selectedPage = document.getElementById(id);

    if (selectedPage) {
        selectedPage.classList.add("active");
        history.pushState({ page: id }, "", "#" + id);
        window.scrollTo(0, 0);
    }

    if (id === "yes") {
        heartExplosion();
    }
}

document.querySelectorAll("[data-page]").forEach(button => {

    button.addEventListener("click", function() {

        showPage(this.dataset.page);

    });

});

// Browser back and forward buttons

window.addEventListener("popstate", () => {

    const id = location.hash.substring(1) || "home";

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.getElementById(id)?.classList.add("active");

});


// ===================================
// FLOWER GROWING ANIMATION
// ===================================

const flower = document.getElementById("flower");

const growButton = document.getElementById("growButton");

const flowerMessage = document.getElementById("flowerMessage");

let flowerGrown = false;

growButton.addEventListener("click", function() {

    if (flowerGrown) {

        flower.classList.remove("grow");

        flowerGrown = false;

        growButton.innerHTML = "🌱 GROW AGAIN";

        flowerMessage.innerHTML =
            "Let's grow another beautiful flower.";

        return;
    }

    flowerGrown = true;

    growButton.disabled = true;

    growButton.innerHTML = "🌷 GROWING...";

    flowerMessage.innerHTML =
        "Something beautiful is growing for you...";

    flower.classList.remove("grow");

    setTimeout(() => {

        flower.classList.add("grow");

        flowerMessage.innerHTML =
            window.DEARLY_FLOWER_MESSAGE || "Just like this flower, you make the world more beautiful. 💗";

        heartExplosion();

        growButton.disabled = false;

        growButton.innerHTML = "🌸 BLOOM AGAIN";

    }, 300);

});


// ===================================
// FLOATING HEARTS AND FLOWERS
// ===================================

const particleContainer = document.getElementById("particles");

const decorations = [
    "💗", "💕", "🌸", "🌷", "♡", "✨", "🦋"
];

function createParticle() {

    const particle = document.createElement("div");

    particle.className = "particle";

    particle.innerHTML =
        decorations[Math.floor(Math.random() * decorations.length)];

    particle.style.left = Math.random() * 100 + "vw";

    particle.style.fontSize =
        (15 + Math.random() * 20) + "px";

    particle.style.animationDuration =
        (6 + Math.random() * 6) + "s";

    particleContainer.appendChild(particle);

    setTimeout(() => {
        particle.remove();
    }, 12000);

}

setInterval(createParticle, 650);


// ===================================
// HEART EXPLOSION
// ===================================

function heartExplosion() {

    for (let i = 0; i < 45; i++) {

        setTimeout(() => {

            createParticle();

        }, i * 60);

    }

}


// ===================================
// CELEBRATION BUTTON
// ===================================

document.getElementById("celebrate").addEventListener("click", function() {

    heartExplosion();

    this.innerHTML = "SENDING YOU ALL MY LOVE! 💗";

});
const bgMusic = document.getElementById("bgMusic");
bgMusic.load();

// Try to play music automatically
window.addEventListener("load", function () {
    bgMusic.volume = 0.5;

    bgMusic.play().catch(function () {
        // Browser may require user interaction
        document.addEventListener("click", function startMusic() {
            bgMusic.play();
            document.removeEventListener("click", startMusic);
        }, { once: true });
    });
});