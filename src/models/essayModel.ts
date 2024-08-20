import mongoose from 'mongoose';

const essaySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  essay: { type: String, required: true },
  feedback: { type: String },
  score: { type: Number },
  date: { type: Date, default: Date.now }
});

const Essay = mongoose.model('Essay', essaySchema);

export default Essay;
