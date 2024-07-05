import express from 'express';
import { getProducts, getProductById } from '../controllers/topProductsController.js';

const router = express.Router();

// Route to get top products by category
router.get('/categories/:categoryname/products', getProducts);

// Route to get product details by ID
router.get('/categories/:categoryname/products/:productid', getProductById);

export default router;
