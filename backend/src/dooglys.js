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
  const { data } = await client.get('/warehouse/stock/list', { params: { 'per-page': 999 } });
  return data;
}

async function getSales({ from, to } = {}) {
  const { data } = await client.get('/sales/document/list', { params: { from, to, 'per-page': 100 } });
  return data;
}

async function getRecipe(productId) {
  const { data } = await client.get(`/nomenclature/recipe/${productId}`);
  return data;
}

module.exports = { getProducts, getStock, getSales, getRecipe };
