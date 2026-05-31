// ============================================================
//  SKILY CLOTHES — CARRITO CON REDIRECCIÓN A CHECKOUT
// ============================================================

const CART_KEY = "skily_cart";

let cart = [];

function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    cart = [];
  }
  _updateUI();
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  _updateUI();
}

function addToCart(productId, size) {
  // Obtener producto actualizado con stock dinámico
  const product = getProductsWithDynamicStock().find(p => p.id === productId);
  if (!product) return false;

  if (!size) {
    showToast("Seleccioná un talle primero.", "error");
    return false;
  }

  const existing = cart.find(i => i.id === productId && i.size === size);
  const currentQty = existing ? existing.quantity : 0;

  if (currentQty + 1 > product.stock) {
    showToast(`Solo queda ${product.stock} unidad disponible en talle ${size}.`, "error");
    return false;
  }

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      size,
      quantity: 1,
      image: product.image,
    });
  }

  saveCart();
  showToast(`${product.name} agregado al carrito ✓`);

  const icon = document.getElementById("cartIcon");
  if (icon) {
    icon.classList.add("cart-icon--bump");
    icon.addEventListener("animationend", () => icon.classList.remove("cart-icon--bump"), { once: true });
  }

  return true;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
}

function changeQty(index, delta) {
  const item = cart[index];
  const product = getProductsWithDynamicStock().find(p => p.id === item.id);
  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    removeFromCart(index);
    return;
  }
  if (product && newQty > product.stock) {
    showToast(`Solo hay ${product.stock} unidades de ${product.name} en talle ${item.size}.`, "error");
    return;
  }
  item.quantity = newQty;
  saveCart();
}

// ✅ CAMBIO AQUÍ: Ahora redirige a checkout.html
// Reemplazar la función finalizarCompra (dentro de cart.js)
function finalizarCompra() {
  if (cart.length === 0) {
    showToast("El carrito está vacío.", "error");
    return;
  }
  window.location.href = "checkout.html";
}
// Asegurar que el botón del carrito tenga ese evento

function _updateUI() {
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
  _renderPanel();
}

function _renderPanel() {
  const container = document.getElementById("cartItemsList");
  const totalSpan = document.getElementById("cartTotal");
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">El carrito está vacío</p>';
    if (totalSpan) totalSpan.textContent = "$0";
    return;
  }

  let total = 0;
  container.innerHTML = cart.map((item, idx) => {
    const sub = item.price * item.quantity;
    total += sub;
    return `
      <div class="cart-item">
        <img class="cart-item__img" src="${item.image}" alt="${item.name}" onerror="this.src='imagenes/placeholder.png'">
        <div class="cart-item__details">
          <p class="cart-item__name">${item.name}</p>
          <p class="cart-item__meta">Talle: ${item.size} &nbsp;·&nbsp; ${formatPrice(item.price)} c/u</p>
          <div class="cart-item__qty">
            <button aria-label="Restar" data-action="minus" data-idx="${idx}">−</button>
            <span>${item.quantity}</span>
            <button aria-label="Sumar"  data-action="plus"  data-idx="${idx}">+</button>
          </div>
          <button class="cart-item__remove" data-action="remove" data-idx="${idx}">Eliminar</button>
        </div>
      </div>`;
  }).join("");

  if (totalSpan) totalSpan.textContent = formatPrice(total);

  container.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      const action = btn.dataset.action;
      if (action === "minus") changeQty(idx, -1);
      if (action === "plus") changeQty(idx, +1);
      if (action === "remove") removeFromCart(idx);
    });
  });
}

function openCart() {
  document.getElementById("cartPanel")?.classList.add("open");
  document.getElementById("cartOverlay")?.classList.add("active");
  _renderPanel();
}
function closeCart() {
  document.getElementById("cartPanel")?.classList.remove("open");
  document.getElementById("cartOverlay")?.classList.remove("active");
}

function initCart() {
  loadCart();
  document.getElementById("cartIcon")?.addEventListener("click", openCart);
  document.getElementById("closeCartPanel")?.addEventListener("click", closeCart);
  document.getElementById("cartOverlay")?.addEventListener("click", closeCart);
  // Cambio: botón ahora llama a finalizarCompra
  const checkoutBtn = document.getElementById("cartCheckoutBtn");
  if (checkoutBtn) {
    checkoutBtn.textContent = "FINALIZAR COMPRA";
    checkoutBtn.removeEventListener("click", finalizarCompra);
    checkoutBtn.addEventListener("click", finalizarCompra);
  }
}

function formatPrice(n) {
  return "$" + n.toLocaleString("es-AR");
}

function showToast(msg, type = "success") {
  let wrap = document.getElementById("toastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toastWrap";
    document.body.appendChild(wrap);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = msg;
  wrap.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("toast--show"));
  });
  setTimeout(() => {
    toast.classList.remove("toast--show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 2800);
}