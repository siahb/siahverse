const konamiCode = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a"
];

let konamiInput = [];

window.addEventListener("keydown", (e) => {
  konamiInput.push(e.key);
  konamiInput.splice(
    -konamiCode.length - 1,
    konamiInput.length - konamiCode.length
  );

  if (konamiCode.every((v, i) => v === konamiInput[i])) {
    // 🔥 TRIGGER ACTION HERE
    window.location.href = "/secret.html"; // or trigger animation/sound
  }
});
