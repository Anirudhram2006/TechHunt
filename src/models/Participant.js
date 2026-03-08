const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionIndex: Number,
    selectedIndex: Number,
    isCorrect: Boolean
  },
  { _id: false }
);

const violationSchema = new mongoose.Schema(
  {
    type: String,
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const examQuestionSnapshotSchema = new mongoose.Schema(
  {
    prompt: String,
    options: [String],
    correctAnswerIndex: Number
  },
  { _id: false }
);

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    testId: { type: String, required: true, index: true },
    startedAt: Date,
    submittedAt: Date,
    answers: [answerSchema],
    score: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    violations: [violationSchema],
    blocked: { type: Boolean, default: false },
    attemptToken: { type: String, required: true, unique: true },
    examSnapshot: [examQuestionSnapshotSchema],
    hasSubmitted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

participantSchema.index({ email: 1, testId: 1 }, { unique: true });

module.exports = mongoose.model('Participant', participantSchema);
