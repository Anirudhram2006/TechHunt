const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswerIndex: { type: Number, required: true }
  },
  { _id: false }
);

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    testId: { type: String, required: true, unique: true, index: true },
    durationMinutes: { type: Number, default: 30 },
    numberOfQuestions: { type: Number, default: 30 },
    rules: {
      maxViolations: { type: Number, default: 3 },
      fullscreenRequired: { type: Boolean, default: true },
      randomizeQuestions: { type: Boolean, default: true },
      randomizeOptions: { type: Boolean, default: true },
      allowAnswerReview: { type: Boolean, default: false }
    },
    questions: [questionSchema],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Test', testSchema);
