// ============================================================
//  SKILY CLOTHES — BASE DE DATOS DE PRODUCTOS CON PERSISTENCIA
// ============================================================

const BASE_PRODUCTS = [
  {
    id: 1,
    name: "FUR GREY JACKET",
    category: "lifestyle",
    price: 16000,
    stock: 1,
    image: "imagenes/skily1.png",
    images: [
      "imagenes/greyjacket1.jpg",
      "imagenes/greyjacket2.jpg",
      "imagenes/greyjacket3.jpg",
    ],
    description: "Campera oversized de piel sintética gris. Corte estructurado, ideal para look urbano. Forro interior y cierre metálico.",
    sizes: [
      { size: "S",  available: false },
      { size: "M",  available: true  },
      { size: "L",  available: false },
      { size: "XL", available: false },
    ],
    mpLink: "https://mpago.li/2sBCtt6",
  },
  {
    id: 2,
    name: "RAW DOUBLE SLEEVE",
    category: "lifestyle",
    price: 10000,
    stock: 1,
    image: "imagenes/skily2.png",
    images: [
      "imagenes/rawdouble1.jpg",
      "imagenes/rawdouble2.jpg",
      "imagenes/rawdouble3.jpg",
    ],
    description: "Buzo con capucha oversized, algodón y poliéster. Bolsillo canguro frontal y capucha doble forro. Corte relajado, perfecto para invierno.",
    sizes: [
      { size: "S",  available: false },
      { size: "M",  available: true  },
      { size: "L",  available: false },
      { size: "XL", available: false },
    ],
    mpLink: "https://mpago.li/1reupbZ",
  },
];

// Clave para stock persistente
const STORAGE_STOCK_KEY = "skily_stock";

// Inicializar stock en localStorage (solo si no existe)
function initStock() {
  const existingStock = localStorage.getItem(STORAGE_STOCK_KEY);
  if (!existingStock) {
    const stockMap = {};
    BASE_PRODUCTS.forEach(p => {
      stockMap[p.id] = p.stock;
    });
    localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify(stockMap));
  }
}

// Obtener stock actual de un producto (desde localStorage)
function getProductStock(productId) {
  const stockMap = JSON.parse(localStorage.getItem(STORAGE_STOCK_KEY) || "{}");
  return stockMap[productId] !== undefined ? stockMap[productId] : BASE_PRODUCTS.find(p => p.id === productId)?.stock || 0;
}

// Actualizar stock de un producto
function updateProductStock(productId, newStock) {
  const stockMap = JSON.parse(localStorage.getItem(STORAGE_STOCK_KEY) || "{}");
  stockMap[productId] = Math.max(0, newStock);
  localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify(stockMap));
}

// Reducir stock después de una compra (por cada item del carrito)
function reduceStockFromCart(cart) {
  for (const item of cart) {
    const currentStock = getProductStock(item.id);
    const newStock = currentStock - item.quantity;
    updateProductStock(item.id, newStock);
  }
}

// Obtener la lista de productos con stock actualizado dinámicamente
function getProductsWithDynamicStock() {
  return BASE_PRODUCTS.map(p => ({
    ...p,
    stock: getProductStock(p.id),
    // Actualizar disponibilidad de talles según stock general (opcional)
    sizes: p.sizes.map(s => ({
      ...s,
      available: s.available && getProductStock(p.id) > 0
    }))
  }));
}

// Exportar para uso global
const PRODUCTS = getProductsWithDynamicStock();

// Refrescar PRODUCTS después de cambios (para uso en tiempo real)
function refreshProducts() {
  const newProducts = getProductsWithDynamicStock();
  // Reemplazar el array PRODUCTS en window
  window.PRODUCTS = newProducts;
  // También actualizar la variable global si está definida
  if (typeof globalThis !== 'undefined') globalThis.PRODUCTS = newProducts;
}

// Inicializar al cargar
initStock();

// Nota: Para mantener compatibilidad, también exponemos las funciones útiles
window.getProductStock = getProductStock;
window.updateProductStock = updateProductStock;
window.reduceStockFromCart = reduceStockFromCart;
window.refreshProducts = refreshProducts;