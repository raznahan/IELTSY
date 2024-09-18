import mongoose from 'mongoose';

const errorSchema = new mongoose.Schema({
  criterion: String,
  error_type: String,
  original_text: String,
  suggested_correction: String,
  explanation: String
});

const essaySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  essayText: { type: String, required: true },
  feedback: { type: String },
  submittedAt: { type: Date, default: Date.now },
  essayType: { type: String, required: true },
  overallBandScore: { type: Number },
  TR: { type: Number },
  CC: { type: Number },
  LR: { type: Number },
  GRA: { type: Number },
  errors: [errorSchema]
});

const Essay = mongoose.model('Essay', essaySchema);

export default Essay;
