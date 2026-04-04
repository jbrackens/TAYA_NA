function toggleItem(){
  /* Toggle between adding and removing the "active" class,
  to highlight the button that controls the panel */
  this.classList.toggle("content-open");
  /* Toggle between hiding and showing the active panel */
  let panel = this.nextElementSibling;
  if (panel.style.display === "block") {
    panel.style.display = "none";
  } else {
    panel.style.display = "block";
  }
}

export function attachToggleFunction(){
 var acc = document.querySelectorAll(".content-toggle");
 for (let i = 0; i < acc.length; i++) {
  acc[i].addEventListener("click", toggleItem, false);
 }
}
