// === Клиент для Dooglys API ===
// Токен и домен берутся только из переменных окружения.

const axios = require('axios');

const DOOGLYS_API_BASE = process.env.DOOGLYS_API_BASE || 'https://cheremukha.dooglys.com/api/v1';
const DOOGLYS_ACCESS_TOKEN = process.env.DOOGLYS_ACCESS_TOKEN;
const DOOGLYS_DOMAIN = process.env.DOOGLYS_DOMAIN || 'cheremukha';

const client = axios.create({
  baseURL: DOOGLYS_API_BASE,
  headers: {
    'Tenant-Domain': DOOGLYS_DOMAIN,
    'Access-Token': DOOGLYS_ACCESS_TOKEN,
  },
  timeout: 10000,
});

async function getProducts() {
  const { data } = await client.get('/nomenclature/product/list', { params: { 'per-page': 999 } });
  return data;
}

async function getStock() {
  // Прямого доступа к остаткам нет (403 у этого токена).
  // Единственный доступный складской раздел — документы склада (движения).
  const { data } = await client.get('/warehouse/document/list', { params: { 'per-page': 999 } });
  return data;
}

async function getSales({ from, to } = {}) {
  const { data } = await client.get('/sales/order/list', { params: { from, to, 'per-page': 100 } });
  return data;
}

async function getRecipe(productId) {
  const { data } = await client.get(`/nomenclature/recipe/${productId}`);
  return data;
}

// Проверка доступа сразу ко многим разделам API — для диагностики прав токена
async function probeEndpoints() {
  const candidates = [
    '/nomenclature/product/list',
    '/nomenclature/category/list',
    '/nomenclature/product-category/list',
    '/nomenclature/recipe/list',
    '/nomenclature/ingredient/list',
    '/warehouse/stock/list',
    '/warehouse/document/list',
    '/warehouse/balance/list',
    '/warehouse/remains/list',
    '/sales/document/list',
    '/sales/order/list',
    '/sales/list',
    '/report/sales/list',
    '/report/stock/list',
    '/structure/sale-point/list',
    '/structure/user/list',
    '/structure/tenant/settings',
    '/special/item/list',
    '/loyalty/settings/view',
  ];

  const results = [];
  for (const path of candidates) {
    try {
      const { status, data } = await client.get(path, { params: { 'per-page': 1 } });
      const count = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 0);
      results.push({ path, status, ok: true, sample_size: count });
    } catch (err) {
      results.push({
        path,
        status: err.response?.status || 'ERR',
        ok: false,
        message: err.response?.data?.message || err.message,
      });
    }
  }
  return results;
}

module.exports = { getProducts, getStock, getSales, getRecipe, probeEndpoints };
