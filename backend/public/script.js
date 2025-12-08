const header = document.querySelector("header"); 

  window.addEventListener("scroll", () => {
    const maxScroll = 300;
    let opacity = Math.min(window.scrollY / maxScroll, 1); 
    const rgb = getComputedStyle(document.documentElement)
                  .getPropertyValue('--color-primario-rgb')
                  .trim();
    header.style.backgroundColor = `rgba(${rgb}, ${opacity})`;
  });

  const hamburger = document.getElementById("hamburger"); 
  const navLinks = document.getElementById("nav-links"); 
  hamburger.addEventListener("click", () => { 
    navLinks.classList.toggle("show"); 
  }); 

  const hero = document.getElementById("hero");
  const imagenes = [
    "https://i.ibb.co/Kc1q9Xpn/IMG-20250813-175111.jpg",
    "https://i.ibb.co/jv42w7Ns/veronica.jpg",
    "https://i.ibb.co/dw0LNktw/IMG-20250701-144825-15.jpg"
      
  ]; 
  let index = 0; 

  function cambiarFondo() {
    hero.style.backgroundImage = `url(${imagenes[index]})`; 
    index = (index + 1) % imagenes.length; 
  } 

  // inicial
  cambiarFondo();
  // cambia cada 5s
  setInterval(cambiarFondo, 5000);

  function sendToWhatsApp(event) {
    event.preventDefault(); // evita que recargue la página
    
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;

    const phoneNumber = "51913445021"; // 👉 tu número con código de país
    const url = `https://wa.me/${phoneNumber}?text=Hola, soy ${name}. Mi correo es ${email}. Mensaje: ${message}`;

    window.open(url, "_blank"); // abre WhatsApp en nueva pestaña
  }
