import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'artifactQuizState:v1';

const sampleQuestions = [
  {
    id: crypto.randomUUID(),
    question: 'Which app feature keeps quiz progress available after a browser refresh?',
    options: ['localStorage', 'A backend database', 'A PDF parser', 'Server sessions'],
    answerIndex: 0,
    rationale: 'localStorage saves progress directly in the browser, which is enough for a no-backend single-page app.',
  },
  {
    id: crypto.randomUUID(),
    question: 'What should appear after a learner answers a multiple choice question?',
    options: ['A rationale', 'A hidden login screen', 'A blank page', 'A file download'],
    answerIndex: 0,
    rationale: 'Showing the rationale immediately helps learners understand why an answer is correct or incorrect.',
  },
];

const exampleInput = `[
  {
    "question": "What is the main purpose of randomizing questions?",
    "options": ["Reduce memorization by order", "Delete rationales", "Disable scoring", "Upload PDFs"],
    "answer": "Reduce memorization by order",
    "rationale": "Random order makes each attempt feel fresh and encourages learning the content rather than positions."
  }
]`;

function normalizeQuestion(raw, index) {
  const options = Array.isArray(raw.options)
    ? raw.options.map((option) => String(option).trim()).filter(Boolean)
    : [raw.a, raw.b, raw.c, raw.d].filter(Boolean).map((option) => String(option).trim());

  let answerIndex = Number.isInteger(raw.answerIndex) ? raw.answerIndex : -1;
  if (answerIndex < 0 && typeof raw.answer === 'string') {
    const answer = raw.answer.trim().toLowerCase();
    answerIndex = options.findIndex((option) => option.toLowerCase() === answer);
    if (answerIndex < 0 && /^[a-d]$/i.test(answer)) {
      answerIndex = answer.toLowerCase().charCodeAt(0) - 97;
    }
  }

  if (!raw.question || options.length < 2 || answerIndex < 0 || answerIndex >= options.length) {
    throw new Error(`Question ${index + 1} needs a question, at least two options, and a valid answer.`);
  }

  return {
    id: raw.id || crypto.randomUUID(),
    question: String(raw.question).trim(),
    options,
    answerIndex,
    rationale: String(raw.rationale || raw.explanation || 'No rationale provided.').trim(),
  };
}

function parseQuestionText(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Paste JSON questions or upload a .json/.txt export first.');
  }

  const parsed = JSON.parse(trimmed);
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list)) {
    throw new Error('Use an array of questions or an object with a questions array.');
  }

  return list.map(normalizeQuestion);
}

function shuffleQuestions(questions) {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      questions: Array.isArray(saved.questions) && saved.questions.length ? saved.questions : sampleQuestions,
      currentIndex: saved.currentIndex || 0,
      answers: saved.answers || {},
      darkMode: saved.darkMode ?? true,
      randomized: saved.randomized ?? false,
    };
  } catch {
    return {
      questions: sampleQuestions,
      currentIndex: 0,
      answers: {},
      darkMode: true,
      randomized: false,
    };
  }
}

function App() {
  const initialState = useMemo(loadState, []);
  const [questions, setQuestions] = useState(initialState.questions);
  const [currentIndex, setCurrentIndex] = useState(initialState.currentIndex);
  const [answers, setAnswers] = useState(initialState.answers);
  const [darkMode, setDarkMode] = useState(initialState.darkMode);
  const [randomized, setRandomized] = useState(initialState.randomized);
  const [rawInput, setRawInput] = useState('');
  const [message, setMessage] = useState('');

  const safeIndex = Math.min(currentIndex, questions.length - 1);
  const currentQuestion = questions[safeIndex];
  const selectedAnswer = answers[currentQuestion?.id];
  const answeredCount = Object.keys(answers).filter((id) => questions.some((question) => question.id === id)).length;
  const score = questions.reduce((total, question) => total + (answers[question.id] === question.answerIndex ? 1 : 0), 0);
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ questions, currentIndex: safeIndex, answers, darkMode, randomized }),
    );
  }, [questions, safeIndex, answers, darkMode, randomized]);

  function replaceQuestions(nextQuestions) {
    const orderedQuestions = randomized ? shuffleQuestions(nextQuestions) : nextQuestions;
    setQuestions(orderedQuestions);
    setCurrentIndex(0);
    setAnswers({});
    setMessage(`Loaded ${nextQuestions.length} question${nextQuestions.length === 1 ? '' : 's'}.`);
  }

  function handleImport() {
    try {
      replaceQuestions(parseQuestionText(rawInput));
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('PDF binary parsing is not included yet. Export questions from your PDF tool as JSON/text, then paste or upload that file.');
      return;
    }

    const text = await file.text();
    setRawInput(text);
    try {
      replaceQuestions(parseQuestionText(text));
    } catch (error) {
      setMessage(error.message);
    }
  }

  function toggleRandomize() {
    const shouldRandomize = !randomized;
    setRandomized(shouldRandomize);
    setQuestions((existing) => (shouldRandomize ? shuffleQuestions(existing) : existing));
    setCurrentIndex(0);
  }

  function resetProgress() {
    setAnswers({});
    setCurrentIndex(0);
    setMessage('Progress reset.');
  }

  function selectAnswer(answerIndex) {
    if (selectedAnswer !== undefined) return;
    setAnswers((existing) => ({ ...existing, [currentQuestion.id]: answerIndex }));
  }

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Claude Artifact-style study tool</p>
          <h1>Interactive PDF Question Quiz</h1>
          <p className="hero-copy">
            Paste or upload questions extracted from PDFs, quiz yourself with randomized multiple choice cards, and keep your progress locally in this browser.
          </p>
        </div>
        <div className="hero-actions">
          <button className="ghost-button" onClick={() => setDarkMode((value) => !value)}>
            {darkMode ? '☀️ Light' : '🌙 Dark'} mode
          </button>
          <button className="ghost-button" onClick={toggleRandomize}>
            {randomized ? '🔀 Randomized' : '➡️ Ordered'}
          </button>
        </div>
      </section>

      <section className="grid-layout">
        <aside className="panel import-panel">
          <div className="section-heading">
            <span>1</span>
            <div>
              <h2>Add questions</h2>
              <p>Use JSON from a PDF extraction workflow.</p>
            </div>
          </div>

          <label className="file-drop">
            <input accept=".json,.txt,.md,.pdf,application/json,text/plain" type="file" onChange={handleFileUpload} />
            <strong>Upload PDF-derived file</strong>
            <span>JSON/TXT works now. PDF files show guidance.</span>
          </label>

          <textarea
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            placeholder={exampleInput}
            aria-label="Paste questions as JSON"
          />

          <div className="button-row">
            <button onClick={handleImport}>Load questions</button>
            <button className="secondary-button" onClick={() => setRawInput(exampleInput)}>Use example</button>
          </div>
          {message && <p className="message">{message}</p>}
        </aside>

        <section className="panel quiz-panel">
          <div className="quiz-topbar">
            <div>
              <p className="eyebrow">Question {safeIndex + 1} of {questions.length}</p>
              <h2>{currentQuestion.question}</h2>
            </div>
            <div className="score-card">
              <strong>{score}/{questions.length}</strong>
              <span>score</span>
            </div>
          </div>

          <div className="progress-track" aria-label={`${progress}% complete`}>
            <div style={{ width: `${progress}%` }} />
          </div>

          <div className="options-list">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = currentQuestion.answerIndex === index;
              const reveal = selectedAnswer !== undefined;
              let className = 'option-button';
              if (reveal && isCorrect) className += ' correct';
              if (reveal && isSelected && !isCorrect) className += ' incorrect';

              return (
                <button
                  className={className}
                  disabled={reveal}
                  key={option}
                  onClick={() => selectAnswer(index)}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {option}
                </button>
              );
            })}
          </div>

          {selectedAnswer !== undefined && (
            <div className="rationale-card">
              <strong>{selectedAnswer === currentQuestion.answerIndex ? 'Correct!' : 'Not quite.'}</strong>
              <p>{currentQuestion.rationale}</p>
            </div>
          )}

          <div className="quiz-controls">
            <button className="secondary-button" onClick={() => setCurrentIndex(Math.max(0, safeIndex - 1))} disabled={safeIndex === 0}>
              Previous
            </button>
            <button onClick={() => setCurrentIndex(Math.min(questions.length - 1, safeIndex + 1))} disabled={safeIndex === questions.length - 1}>
              Next
            </button>
            <button className="danger-button" onClick={resetProgress}>Reset</button>
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
