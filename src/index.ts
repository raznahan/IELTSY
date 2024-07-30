import express from 'express';
import mongoose from 'mongoose';
import config from './config';
import bot from './bot';

const app = express();
app.use(express.json());

// Connect to MongoDB
if (!config.mongoURI) {
  console.error('MongoDB connection string is not defined.');
  process.exit(1); // Exit the process with an error code
}

mongoose.connect(config.mongoURI).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit the process with an error code
});

// Define a basic route
app.get('/', (req, res) => {
  res.send('Hello, IELTS Bot!');
});

// Start the Telegram bot (already started by requiring './bot')

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
