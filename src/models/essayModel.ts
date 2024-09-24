import mongoose from 'mongoose';

// Define the schema for individual errors within an essay
const errorSchema = new mongoose.Schema({
  criterion: String,     // The specific criterion the error relates to (e.g., grammar, vocabulary)
  error_type: String,    // The type of error (e.g., spelling, punctuation)
  original_text: String, // The text containing the error
  suggested_correction: String, // The proposed correction for the error
  explanation: String    // An explanation of why this is an error and how to fix it
});

// Define the main schema for an essay submission
const essaySchema = new mongoose.Schema({
  userId: { type: String, required: true },  // Unique identifier for the user who submitted the essay
  essayText: { type: String, required: true }, // The full text of the submitted essay
  feedback: { type: String },  // Overall feedback on the essay
  submittedAt: { type: Date, default: Date.now }, // Timestamp of when the essay was submitted
  essayType: { type: String, required: true }, // The type or category of the essay (e.g., argumentative, narrative)
  
  // IELTS-specific scoring fields
  overallBandScore: { type: Number }, // The overall band score for the essay
  TR: { type: Number },  // Task Response score
  CC: { type: Number },  // Coherence and Cohesion score
  LR: { type: Number },  // Lexical Resource score
  GRA: { type: Number }, // Grammatical Range and Accuracy score
  
  errors: [errorSchema]  // An array of specific errors found in the essay, using the errorSchema
});

// Create a Mongoose model for the Essay schema
const Essay = mongoose.model('Essay', essaySchema);

export default Essay;
