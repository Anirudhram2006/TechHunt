const mongoose = require('mongoose');

const violationLogSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
    testId: { type: String, required: true },
    type: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ViolationLog', violationLogSchema);
