require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
let MongoMemoryServer;
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { customAlphabet } = require('nanoid');
const Admin = require('./src/models/Admin');
const Test = require('./src/models/Test');
const Participant = require('./src/models/Participant');
const Result = require('./src/models/Result');
const Response = require('./src/models/Response');
const ViolationLog = require('./src/models/ViolationLog');
const { verifyAdmin, verifyParticipant, unauthorized } = require('./src/middleware/auth');
const { defaultQuestions, randomizeQuestionAndOptions } = require('./src/utils/exam');

const app = express();
const port = process.env.PORT || 3000;
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

async function setupDefaultAdmin() {
  const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@techhunt.local';
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';
  const existing = await Admin.findOne({ email: defaultEmail });
  if (!existing) {
    await Admin.create({ email: defaultEmail, passwordHash: await bcrypt.hash(defaultPassword, 12) });
  }
}

async function setupDefaultTest() {
  const existing = await Test.findOne({ testId: 'demo-test' });
  if (!existing) {
    await Test.create({
      title: 'Demo Secure MCQ Test',
      testId: 'demo-test',
      durationMinutes: 30,
      numberOfQuestions: 30,
      rules: { maxViolations: 3, fullscreenRequired: true, randomizeQuestions: true, randomizeOptions: true, allowAnswerReview: false },
      questions: defaultQuestions()
    });
  }
}

const calcRemainingSeconds = (participant, test) => {
  if (!participant.startedAt) return test.durationMinutes * 60;
  const endTs = new Date(participant.startedAt).getTime() + (test.durationMinutes * 60 * 1000);
  return Math.max(0, Math.floor((endTs - Date.now()) / 1000));
};

app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin-login', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/admin-dashboard', verifyAdmin, (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html')));
app.get('/test/:testId', verifyParticipant, (req, res) => {
  if (req.participant.testId !== req.params.testId) return unauthorized(res);
  return res.sendFile(path.join(__dirname, 'public', 'test.html'));
});
app.get('/result/:testId', verifyParticipant, (req, res) => {
  if (req.participant.testId !== req.params.testId) return unauthorized(res);
  return res.sendFile(path.join(__dirname, 'public', 'result.html'));
});

app.post('/api/admin/login', async (req, res) => {
  const admin = await Admin.findOne({ email: String(req.body.email).toLowerCase() });
  if (!admin || !(await bcrypt.compare(req.body.password, admin.passwordHash))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ role: 'admin', adminId: admin._id.toString() }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.cookie('admin_token', token, { httpOnly: true, sameSite: 'strict', secure: false });
  return res.json({ message: 'Admin login successful' });
});

app.get('/api/admin/tests', verifyAdmin, async (_, res) => res.json(await Test.find().sort({ createdAt: -1 })));
app.get('/api/admin/tests/:testId', verifyAdmin, async (req, res) => {
  const test = await Test.findOne({ testId: req.params.testId });
  if (!test) return res.status(404).json({ message: 'Test not found' });
  return res.json(test);
});
app.post('/api/admin/tests', verifyAdmin, async (req, res) => {
  const numQuestions = Number(req.body.numberOfQuestions) || 30;
  const test = await Test.create({
    title: req.body.title,
    durationMinutes: Number(req.body.durationMinutes) || 30,
    numberOfQuestions: numQuestions,
    testId: nanoid(),
    rules: {
      maxViolations: Number(req.body.maxViolations) || 3,
      fullscreenRequired: true,
      randomizeQuestions: req.body.randomizeQuestions !== false,
      randomizeOptions: req.body.randomizeOptions !== false,
      allowAnswerReview: req.body.allowAnswerReview === true
    },
    questions: defaultQuestions().slice(0, numQuestions)
  });
  return res.status(201).json({ message: 'Test created', test, testLink: `/test/${test.testId}` });
});
app.put('/api/admin/tests/:testId', verifyAdmin, async (req, res) => {
  const test = await Test.findOne({ testId: req.params.testId });
  if (!test) return res.status(404).json({ message: 'Test not found' });
  if (req.body.title) test.title = req.body.title;
  if (req.body.durationMinutes) test.durationMinutes = Number(req.body.durationMinutes);
  if (req.body.numberOfQuestions) test.numberOfQuestions = Number(req.body.numberOfQuestions);
  if (typeof req.body.allowAnswerReview === 'boolean') test.rules.allowAnswerReview = req.body.allowAnswerReview;
  if (typeof req.body.randomizeQuestions === 'boolean') test.rules.randomizeQuestions = req.body.randomizeQuestions;
  if (typeof req.body.randomizeOptions === 'boolean') test.rules.randomizeOptions = req.body.randomizeOptions;
  await test.save();
  return res.json({ message: 'Test updated' });
});
app.delete('/api/admin/tests/:testId', verifyAdmin, async (req, res) => {
  await Test.deleteOne({ testId: req.params.testId });
  return res.json({ message: 'Test deleted' });
});

app.post('/api/admin/tests/:testId/questions', verifyAdmin, async (req, res) => {
  const test = await Test.findOne({ testId: req.params.testId });
  if (!test) return res.status(404).json({ message: 'Test not found' });
  if (test.questions.length >= test.numberOfQuestions) {
    return res.status(400).json({ message: 'Question limit reached' });
  }
  test.questions.push(req.body);
  await test.save();
  return res.json({ message: 'Question added' });
});

app.patch('/api/admin/tests/:testId/settings', verifyAdmin, async (req, res) => {
  const test = await Test.findOne({ testId: req.params.testId });
  if (!test) return res.status(404).json({ message: 'Test not found' });
  if (req.body.durationMinutes) test.durationMinutes = Number(req.body.durationMinutes);
  if (req.body.maxViolations) test.rules.maxViolations = Number(req.body.maxViolations);
  if (typeof req.body.allowAnswerReview === 'boolean') test.rules.allowAnswerReview = req.body.allowAnswerReview;
  await test.save();
  return res.json({ message: 'Settings updated' });
});

app.get('/api/admin/tests/:testId/participants', verifyAdmin, async (req, res) => {
  const list = await Participant.find({ testId: req.params.testId }).sort({ createdAt: -1 });
  return res.json(list);
});
app.get('/api/admin/tests/:testId/results', verifyAdmin, async (req, res) => {
  const results = await Result.find({ testId: req.params.testId }).sort({ score: -1, percentage: -1 });
  return res.json(results);
});
app.get('/api/admin/tests/:testId/leaderboard', verifyAdmin, async (req, res) => {
  const top = await Result.find({ testId: req.params.testId }).sort({ score: -1, percentage: -1 }).limit(10);
  return res.json(top);
});
app.get('/api/admin/tests/:testId/results/download', verifyAdmin, async (req, res) => {
  const results = await Result.find({ testId: req.params.testId }).sort({ score: -1 });
  const header = 'Name,Email,Score,Total,Wrong,Percentage,SubmittedAt\n';
  const rows = results.map((r) => `${r.name},${r.email},${r.score},${r.totalQuestions},${r.wrongAnswers},${r.percentage},${r.submissionTime?.toISOString() || ''}`).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.testId}-results.csv"`);
  return res.send(header + rows);
});

app.post('/api/participant/register', async (req, res) => {
  const { name, email, testId } = req.body;
  const test = await Test.findOne({ testId, isActive: true });
  if (!test) return res.status(404).json({ message: 'Invalid test link' });

  const existing = await Participant.findOne({ email: String(email).toLowerCase(), testId });
  if (existing) return res.status(409).json({ message: 'Multiple attempts are not allowed for this test.' });

  const participant = await Participant.create({ name, email, testId, attemptToken: nanoid() });
  const token = jwt.sign({ role: 'participant', participantId: participant._id.toString(), testId }, process.env.JWT_SECRET, { expiresIn: '4h' });
  res.cookie('participant_token', token, { httpOnly: true, sameSite: 'strict', secure: false });
  return res.json({ message: 'Registered', testLink: `/test/${testId}` });
});

app.get('/api/participant/tests/:testId/start', verifyParticipant, async (req, res) => {
  if (req.participant.testId !== req.params.testId) return unauthorized(res);
  const participant = await Participant.findById(req.participant.participantId);
  const test = await Test.findOne({ testId: req.params.testId });
  if (!participant || !test) return res.status(404).json({ message: 'Attempt not found' });
  if (participant.hasSubmitted) return res.status(400).json({ message: 'Already submitted' });
  if (participant.blocked) return res.status(403).json({ message: 'Blocked due to violations' });

  if (!participant.startedAt) participant.startedAt = new Date();
  if (!participant.examSnapshot?.length) {
    let exam = test.questions.slice(0, test.numberOfQuestions);
    if (test.rules.randomizeQuestions || test.rules.randomizeOptions) {
      exam = randomizeQuestionAndOptions(exam, test.rules);
    }
    participant.examSnapshot = exam;
  }
  await participant.save();

  return res.json({
    title: test.title,
    durationMinutes: test.durationMinutes,
    maxViolations: test.rules.maxViolations,
    allowAnswerReview: test.rules.allowAnswerReview,
    totalQuestions: participant.examSnapshot.length,
    remainingSeconds: calcRemainingSeconds(participant, test),
    savedAnswers: participant.answers.reduce((acc, a) => ({ ...acc, [a.questionIndex]: a.selectedIndex }), {}),
    questions: participant.examSnapshot.map((q, index) => ({ index, prompt: q.prompt, options: q.options }))
  });
});

app.post('/api/participant/tests/:testId/answer', verifyParticipant, async (req, res) => {
  if (req.participant.testId !== req.params.testId) return unauthorized(res);
  const participant = await Participant.findById(req.participant.participantId);
  if (!participant) return res.status(404).json({ message: 'Attempt not found' });
  const questionIndex = Number(req.body.questionIndex);
  const selectedIndex = Number(req.body.selectedIndex);
  const existing = participant.answers.find((a) => a.questionIndex === questionIndex);
  if (existing) {
    existing.selectedIndex = selectedIndex;
  } else {
    participant.answers.push({ questionIndex, selectedIndex, isCorrect: false });
  }
  await participant.save();
  return res.json({ message: 'Answer saved' });
});

app.post('/api/participant/tests/:testId/violations', verifyParticipant, async (req, res) => {
  if (req.participant.testId !== req.params.testId) return unauthorized(res);
  const participant = await Participant.findById(req.participant.participantId);
  const test = await Test.findOne({ testId: req.params.testId });
  if (!participant || !test) return res.status(404).json({ message: 'Not found' });

  const type = req.body.type || 'unknown';
  participant.violations.push({ type });
  await ViolationLog.create({ participantId: participant._id, testId: req.params.testId, type });
  if (participant.violations.length >= test.rules.maxViolations) participant.blocked = true;
  await participant.save();

  return res.json({
    violations: participant.violations.length,
    blocked: participant.blocked,
    maxViolations: test.rules.maxViolations
  });
});

app.post('/api/participant/tests/:testId/submit', verifyParticipant, async (req, res) => {
  if (req.participant.testId !== req.params.testId) return unauthorized(res);
  const participant = await Participant.findById(req.participant.participantId);
  if (!participant || !participant.examSnapshot?.length) return res.status(404).json({ message: 'Attempt not found' });
  if (participant.hasSubmitted) return res.status(400).json({ message: 'Duplicate submission blocked' });

  let score = 0;
  participant.answers = participant.examSnapshot.map((question, i) => {
    const selectedIndex = Number(req.body.answers?.[i] ?? participant.answers.find((a) => a.questionIndex === i)?.selectedIndex);
    const isCorrect = selectedIndex === question.correctAnswerIndex;
    if (isCorrect) score += 1;
    return { questionIndex: i, selectedIndex, isCorrect };
  });

  const total = participant.examSnapshot.length;
  participant.score = score;
  participant.wrongAnswers = total - score;
  participant.percentage = Number(((score / total) * 100).toFixed(2));
  participant.submittedAt = new Date();
  participant.hasSubmitted = true;
  await participant.save();

  await Response.deleteMany({ participantId: participant._id });
  await Response.insertMany(participant.answers.map((a) => ({
    participantId: participant._id,
    testId: participant.testId,
    questionIndex: a.questionIndex,
    selectedIndex: a.selectedIndex,
    isCorrect: a.isCorrect
  })));

  await Result.findOneAndUpdate(
    { participantId: participant._id },
    {
      participantId: participant._id,
      testId: participant.testId,
      name: participant.name,
      email: participant.email,
      score: participant.score,
      totalQuestions: total,
      wrongAnswers: participant.wrongAnswers,
      percentage: participant.percentage,
      submissionTime: participant.submittedAt
    },
    { upsert: true, new: true }
  );

  return res.json({
    message: 'Submitted',
    score,
    total,
    wrongAnswers: participant.wrongAnswers,
    percentage: participant.percentage,
    blocked: participant.blocked,
    resultPath: `/result/${participant.testId}`
  });
});

app.get('/api/participant/tests/:testId/result', verifyParticipant, async (req, res) => {
  if (req.participant.testId !== req.params.testId) return unauthorized(res);
  const participant = await Participant.findById(req.participant.participantId);
  if (!participant || !participant.hasSubmitted) return res.status(404).json({ message: 'Result not available' });

  const test = await Test.findOne({ testId: req.params.testId });
  return res.json({
    name: participant.name,
    email: participant.email,
    score: participant.score,
    totalQuestions: participant.examSnapshot.length,
    wrongAnswers: participant.wrongAnswers,
    percentage: participant.percentage,
    allowAnswerReview: Boolean(test?.rules.allowAnswerReview),
    answers: participant.answers
  });
});

app.use((_, res) => res.status(404).send('Not Found'));

async function connectDatabase() {
  const mode = (process.env.DB_MODE || 'mongo').toLowerCase();
  if (mode === 'memory') {
    if (!MongoMemoryServer) {
      ({ MongoMemoryServer } = require('mongodb-memory-server'));
    }
    const memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri('techhunt_exam');
    await mongoose.connect(uri);
    console.log('Connected to in-memory MongoDB (mongodb-memory-server).');
    return memoryServer;
  }

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techhunt_exam';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${uri}`);
  return null;
}

async function start() {
  const memoryServer = await connectDatabase();
  await setupDefaultAdmin();
  await setupDefaultTest();
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    if (memoryServer) await memoryServer.stop();
    process.exit(0);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
