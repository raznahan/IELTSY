import mongoose from 'mongoose';

const essaySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  essayText: { type: String, required: true },
  feedback: { type: String },
  score: { type: Number },
  submittedAt: { type: Date, default: Date.now }
});

const Essay = mongoose.model('Essay', essaySchema);

export default Essay;
