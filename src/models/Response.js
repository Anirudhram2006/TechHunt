const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true, index: true },
    testId: { type: String, required: true, index: true },
    questionIndex: Number,
    selectedIndex: Number,
    isCorrect: Boolean
  },
  { timestamps: true }
);

module.exports = mongoose.model('Response', responseSchema);
