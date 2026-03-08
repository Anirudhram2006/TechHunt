function shuffleArray(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function defaultQuestions() {
  return Array.from({ length: 30 }).map((_, i) => ({
    prompt: `Question ${i + 1}: What is ${i + 2} + ${i + 3}?`,
    options: [`${i + 5}`, `${i + 4}`, `${i + 6}`, `${i + 7}`],
    correctAnswerIndex: 1
  }));
}

function randomizeQuestionAndOptions(questions, rules = { randomizeQuestions: true, randomizeOptions: true }) {
  const orderedQuestions = rules.randomizeQuestions ? shuffleArray(questions) : [...questions];

  return orderedQuestions.map((question) => {
    if (!rules.randomizeOptions) return question;
    const taggedOptions = question.options.map((option, index) => ({ option, index }));
    const shuffledOptions = shuffleArray(taggedOptions);
    const newCorrectIndex = shuffledOptions.findIndex((item) => item.index === question.correctAnswerIndex);

    return {
      prompt: question.prompt,
      options: shuffledOptions.map((item) => item.option),
      correctAnswerIndex: newCorrectIndex
    };
  });
}

module.exports = { shuffleArray, defaultQuestions, randomizeQuestionAndOptions };
