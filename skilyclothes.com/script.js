// ============================================================
//  SKILY CLOTHES — LÓGICA DE INICIO.HTML
//  Requiere: products.js y cart.js cargados antes
// ============================================================

// ── Navbar ────────────────────────────────────────────────────
function initNavbar() {
  const navbar    = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navMenu   = document.getElementById("navMenu");

  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    navbar.classList.toggle("navbar--scrolled", y > 50);
    navbar.classList.toggle("navbar--hidden",   y > lastScroll && y > 200);
    lastScroll = y;
  }, { passive: true });

  hamburger?.addEventListener("click", () => {
    hamburger.classList.toggle("hamburger--open");
    navMenu.classList.toggle("navbar__menu--open");
  });

  navMenu?.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("hamburger--open");
      navMenu.classList.remove("navbar__menu--open");
    });
  });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const items = data.items.map(item => ({
    title: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    currency_id: "ARS"
  }));
  const external_ref = Date.now() + "_" + Math.random().toString(36);

  // Guardar orden en una hoja de cálculo
  const sheet = SpreadsheetApp.openById("TU_SHEET_ID").getSheetByName("Pedidos");
  sheet.appendRow([external_ref, JSON.stringify(data), new Date().toISOString(), "pendiente"]);

  // Crear preferencia en MP
  const preference = {
    items: items,
    back_urls: {
      success: "https://TUDOMINIO.com/confirmacion.html",
      failure: "https://TUDOMINIO.com/checkout.html"
    },
    auto_return: "approved",
    external_reference: external_ref
  };
  const mpResponse = UrlFetchApp.fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Authorization": "Bearer TU_ACCESS_TOKEN", "Content-Type": "application/json" },
    payload: JSON.stringify(preference)
  });
  const pref = JSON.parse(mpResponse);
  return ContentService.createTextOutput(JSON.stringify({ init_point: pref.init_point, external_ref }));
}
if (typeof refreshProducts === 'function') refreshProducts();

// Reemplazar la función renderProducts para usar stock actualizado
const originalRenderProducts = renderProducts;
window.renderProducts = function() {
  // Forzar refresco de productos
  if (typeof refreshProducts === 'function') refreshProducts();
  originalRenderProducts();
};
// ── Grilla de productos en stock ──────────────────────────────
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const inStock = PRODUCTS.filter(p => p.stock > 0).slice(0, 4);

  if (inStock.length === 0) {
    grid.innerHTML = `<p class="no-products">No hay productos disponibles</p>`;
    return;
  }

  grid.innerHTML = inStock.map(p => productCard(p)).join("");
  attachCardEvents(grid);
}

// ── Sección "Busca tu estilo" ──────────────────────────────────
function renderEstiloProducto() {
  const container = document.getElementById("estiloProducto");
  if (!container) return;

  const product = PRODUCTS.find(p => p.id === 1);
  if (!product) return;

  container.innerHTML = productCard(product);
  attachCardEvents(container);
}

// ── Plantilla de tarjeta ──────────────────────────────────────
function productCard(p) {
  // Talles disponibles
  const availableSizes = p.sizes.filter(s => s.available);
  const singleSize     = availableSizes.length === 1 ? availableSizes[0].size : null;

  // Si tiene un solo talle disponible → el botón agrega directo
  // Si tiene varios → abre el selector de talles (modal inline en la card)
  const btnId = `btn-add-${p.id}`;

  return `
    <article class="product-card" data-id="${p.id}">
      <div class="product-card__img-wrap">
        <a href="producto.html?id=${p.id}">
          <img class="product-card__img"
               src="${p.image}"
               alt="${p.name}"
               loading="lazy"
               onerror="this.src='imagenes/placeholder.png'">
        </a>
      </div>
      <div class="product-card__body">
        <a href="producto.html?id=${p.id}" class="product-card__link">
          <h3 class="product-card__name">${p.name}</h3>
        </a>
        <p class="product-card__price">${formatPrice(p.price)}</p>

        ${availableSizes.length > 1 ? `
          <!-- Selector de talle inline -->
          <div class="card-size-picker" id="picker-${p.id}" style="display:none;">
            <span class="card-size-label">Elegí un talle:</span>
            <div class="card-size-grid">
              ${availableSizes.map(s => `
                <button class="card-size-btn"
                        data-product-id="${p.id}"
                        data-size="${s.size}">
                  ${s.size}
                </button>`).join("")}
            </div>
          </div>
        ` : ""}

        <button class="btn btn--primary product-card__cta" id="${btnId}"
                data-product-id="${p.id}"
                data-single-size="${singleSize || ""}"
                data-has-picker="${availableSizes.length > 1}">
          AÑADIR AL CARRITO
        </button>
      </div>
    </article>`;
}

function soldoutCard(p) {
  return `
    <article class="product-card product-card--soldout">
      <div class="product-card__img-wrap">
        <img class="product-card__img"
             src="${p.image}"
             alt="${p.name}"
             loading="lazy"
             onerror="this.src='imagenes/placeholder.png'">
        <div class="product-card__soldout-overlay"><span>SIN STOCK</span></div>
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${p.name}</h3>
        <button class="btn btn--disabled" disabled>NO DISPONIBLE</button>
      </div>
    </article>`;
}

// ── Eventos de tarjetas ───────────────────────────────────────
function attachCardEvents(container) {
  // Delegación: botón principal "AÑADIR AL CARRITO"
  container.addEventListener("click", e => {
    const btn = e.target.closest(".product-card__cta");
    if (!btn) return;

    const productId = parseInt(btn.dataset.productId);
    const singleSize = btn.dataset.singleSize;
    const hasPicker  = btn.dataset.hasPicker === "true";

    if (singleSize) {
      // Un solo talle → agregar directo
      addToCart(productId, singleSize);
    } else if (hasPicker) {
      // Varios talles → mostrar/ocultar el selector
      const picker = document.getElementById(`picker-${productId}`);
      if (picker) {
        const visible = picker.style.display !== "none";
        picker.style.display = visible ? "none" : "block";
        btn.textContent = visible ? "AÑADIR AL CARRITO" : "ELEGIR TALLE ↑";
      }
    }
  });

  // Delegación: botones de talle dentro del picker
  container.addEventListener("click", e => {
    const sizeBtn = e.target.closest(".card-size-btn");
    if (!sizeBtn) return;

    const productId = parseInt(sizeBtn.dataset.productId);
    const size      = sizeBtn.dataset.size;

    addToCart(productId, size);

    // Cerrar el picker después de agregar
    const picker = document.getElementById(`picker-${productId}`);
    const mainBtn = document.getElementById(`btn-add-${productId}`);
    if (picker)  picker.style.display  = "none";
    if (mainBtn) mainBtn.textContent   = "AÑADIR AL CARRITO";
  });
}

// ── Animaciones scroll (fade-up) ──────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll(
    ".product-card, .conocenos__img-box, .busca-estilo__imagen, .busca-estilo__producto .product-card"
  ).forEach(el => {
    el.classList.add("fade-up");
    observer.observe(el);
  });
}

// ── Cuenta de usuario (placeholder) ──────────────────────────
function initUserIcon() {
  document.getElementById("userIcon")?.addEventListener("click", () => {
    showToast("Próximamente podrás gestionar tu cuenta.", "info");
  });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  renderProducts();
  renderEstiloProducto();
  initScrollAnimations();
  initCart();
  initUserIcon();
});