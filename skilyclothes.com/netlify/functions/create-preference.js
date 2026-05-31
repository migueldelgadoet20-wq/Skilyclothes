// ============================================================
//  Netlify Function: create-preference.js
//  Crea una preferencia de pago dinámica en Mercado Pago
//  y devuelve el init_point (URL de pago) + external_reference
// ============================================================

exports.handler = async (event) => {
  // Solo POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Leer Access Token desde variable de entorno de Netlify
  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_ACCESS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "MP_ACCESS_TOKEN no configurado en Netlify." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Body inválido." }) };
  }

  const { cart, customer } = body;
  if (!cart?.length || !customer) {
    return { statusCode: 400, body: JSON.stringify({ error: "Faltan datos." }) };
  }

  // Referencia única para este pedido
  const externalRef = `skily_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Armar items para MP
  const items = cart.map((item) => ({
    id:          String(item.id),
    title:       `${item.name} — Talle ${item.size}`,
    quantity:    item.quantity,
    unit_price:  item.price,
    currency_id: "ARS",
  }));

  // URL base del sitio (configurada como variable de entorno en Netlify)
  const SITE_URL = process.env.SITE_URL || "https://TU-SITIO.netlify.app";

  const preference = {
    items,
    payer: {
      name:  customer.name,
      email: customer.email,
      phone: { number: customer.phone },
      address: {
        street_name:   customer.address,
        zip_code:      customer.zip,
      },
    },
    back_urls: {
      success: `${SITE_URL}/confirmacion.html?status=approved&ref=${externalRef}`,
      failure: `${SITE_URL}/checkout.html?status=failure`,
      pending: `${SITE_URL}/confirmacion.html?status=pending&ref=${externalRef}`,
    },
    auto_return:        "approved",   // redirige solo si el pago fue aprobado
    external_reference: externalRef,
    statement_descriptor: "SKILY CLOTHES",
    notification_url: `${SITE_URL}/.netlify/functions/mp-webhook`, // opcional
  };

  try {
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP error:", data);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Error al crear preferencia en MP.", detail: data }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        init_point:         data.init_point,          // URL de pago real (producción)
        sandbox_init_point: data.sandbox_init_point,  // URL para pruebas
        external_ref:       externalRef,
      }),
    };

  } catch (err) {
    console.error("Fetch error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno.", detail: err.message }),
    };
  }
};