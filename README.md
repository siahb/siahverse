# Interactive PDF Question Quiz

A Claude Artifact-style single-page quiz app built with React + Vite. It is designed for studying questions derived from PDFs without needing a backend.

## Features

- Upload `.json`, `.txt`, or `.md` files containing PDF-derived questions.
- Paste extracted questions directly into the app.
- Multiple choice quiz mode with immediate feedback.
- Score and completion progress tracking.
- Rationales shown after each answer.
- Optional question randomization.
- Dark/light mode toggle.
- Mobile-friendly responsive layout.
- Progress, loaded questions, theme, and randomization preference stored in `localStorage`.
- No backend required.

## Question format

Paste or upload either an array of questions or an object with a `questions` array:

```json
[
  {
    "question": "What is the main purpose of randomizing questions?",
    "options": ["Reduce memorization by order", "Delete rationales", "Disable scoring", "Upload PDFs"],
    "answer": "Reduce memorization by order",
    "rationale": "Random order makes each attempt feel fresh and encourages learning the content rather than positions."
  }
]
```

You can also use `answerIndex` instead of `answer`, or letter answers like `"A"`, `"B"`, `"C"`, and `"D"`.

> Note: Direct binary PDF parsing is intentionally not included yet. Export or extract quiz questions from a PDF tool first, then paste or upload the text/JSON output.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
