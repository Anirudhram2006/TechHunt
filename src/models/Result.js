const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true, unique: true },
    testId: { type: String, required: true, index: true },
    name: String,
    email: String,
    score: Number,
    totalQuestions: Number,
    wrongAnswers: Number,
    percentage: Number,
    submissionTime: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('Result', resultSchema);
