import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import config from './config';
import './bot'; // Initialize the bot

import userRoutes from './routes/userRoutes';
import paymentRoutes from './routes/paymentRoutes';

const app = express();
app.use(express.json());

if (!config.mongoURI) {
  throw new Error('MongoDB connection string is not defined.');
}

mongoose.connect(config.mongoURI).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/', (req, res) => {
  res.send('Hello, IELTS Bot!');
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
