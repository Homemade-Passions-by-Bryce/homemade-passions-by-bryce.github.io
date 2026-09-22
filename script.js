const menuButton = document.getElementById("menuButton");
const mainNav = document.getElementById("mainNav");

menuButton.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

document.getElementById("year").textContent =
  new Date().getFullYear();
