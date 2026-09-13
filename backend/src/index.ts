import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db/connection';
import router from './router';
import { seedCategories } from './helpers/seedCategories';
import { loadStockMaster } from './helpers/stockMaster';

dotenv.config();

const app = express();

// app.use(cors({
//   credentials: true,
//   origin: process.env.FRONTEND_URL,
// }));

app.use(cors({
  credentials: true,
  origin: true, // Allow all origins (for testing only)
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json());

loadStockMaster();

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`);
});

connectDB().then(() => {
  seedCategories();
});

app.use('/', router());
