import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import cacheManager from 'cache-manager';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const memoryCache = cacheManager.caching({ store: 'memory', max: 100, ttl: 60 });

const BASE_URL = 'http://20.244.56.144/test';
const ALLOWED_COMPANIES = ["AMZ", "FLP", "SNP", "MYN", "AZO"];

const fetchProducts = async (company, category, minPrice, maxPrice, topN) => {
  const url = `${BASE_URL}/companies/${company}/categories/${category}/products/top=${topN}&minPrice=${minPrice}&maxPrice=${maxPrice}`;
  try {
    console.log(url);
    const response = await axios.get(url);
    console.log(response);
    return response.data;
  } catch (error) {
    console.error(`Error fetching products from ${company}:`, error.message);
    throw new ApiError(500, `Failed to fetch products from ${company}`, [], error.stack);
  }
};

export const getProducts = asyncHandler(async (req, res) => {
  const { categoryname } = req.params;
  const { n = 10, page = 1, sort_by, order = 'asc', minPrice = 0, maxPrice = Infinity, companies } = req.query;

  const topN = parseInt(n);
  if (topN > 10 && !req.query.page) {
    throw new ApiError(400, 'Pagination required for requests with n > 10');
  }

  const companyList = companies ? companies.split(',').filter(company => ALLOWED_COMPANIES.includes(company)) : ALLOWED_COMPANIES;
  if (companyList.length === 0) {
    throw new ApiError(400, 'No valid companies specified');
  }

  const fetchPromises = companyList.map(company => fetchProducts(company, categoryname, minPrice, maxPrice, topN));
  let products = (await Promise.all(fetchPromises)).flat();

  products = products.map(product => ({
    ...product,
    id: uuidv4(),
    company: product.company
  }));

  if (sort_by) {
    products.sort((a, b) => {
      const fieldA = a[sort_by];
      const fieldB = b[sort_by];
      return order === 'asc' ? (fieldA > fieldB ? 1 : -1) : (fieldA < fieldB ? 1 : -1);
    });
  }

  const startIndex = (page - 1) * topN;
  const paginatedProducts = products.slice(startIndex, startIndex + topN);

  res.json(new ApiResponse(200, paginatedProducts, 'Products fetched successfully'));
});

export const getProductById = asyncHandler(async (req, res) => {
  const { categoryname, productid } = req.params;
  const cachedProduct = await memoryCache.get(productid);
  if (cachedProduct) {
    return res.json(new ApiResponse(200, cachedProduct, 'Product found in cache'));
  }

  const { companies } = req.query;
  const companyList = companies ? companies.split(',').filter(company => ALLOWED_COMPANIES.includes(company)) : ALLOWED_COMPANIES;
  if (companyList.length === 0) {
    throw new ApiError(400, 'No valid companies specified');
  }

  const fetchPromises = companyList.map(company => fetchProducts(company, categoryname, 0, Infinity, 100));
  const products = (await Promise.all(fetchPromises)).flat();

  const product = products.find(p => p.id === productid);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  await memoryCache.set(productid, product);
  res.json(new ApiResponse(200, product, 'Product fetched successfully'));
});
