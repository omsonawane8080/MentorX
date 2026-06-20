import { useState } from 'react';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { APP } from '@/constants/testIds';
import { CheckCircle, X } from '@phosphor-icons/react';

export default function Quiz() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!topic.trim()) return;
    setError(''); setResult(null); setQuiz(null); setLoading(true);
    try {
      const { data } = await api.post('/quiz/generate', { topic: topic.trim(), difficulty });
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(-1));
    } catch (e) {
      setError(e?.response?.data?.detail || 'Quiz generation failed');
    } finally { setLoading(false); }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/quiz/submit', { quiz_id: quiz.quiz_id, answers });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Submit failed');
    } finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="label">Quiz</div>
        <h1 className="text-4xl font-semibold mt-1">Test what you know.</h1>
      </div>

      {!quiz && (
        <div className="card max-w-2xl">
          <label className="label">Topic</label>
          <input
            className="input mb-4"
            placeholder='e.g. "Python list comprehensions" or "Linear regression basics"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            data-testid={APP.quizTopicInput}
          />
          <label className="label">Difficulty</label>
          <div className="flex gap-2 mb-6">
            {['easy', 'medium', 'hard'].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="px-4 py-2 rounded-full text-sm capitalize"
                style={{
                  background: difficulty === d ? 'var(--primary)' : 'var(--surface-2)',
                  color: difficulty === d ? 'white' : 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >{d}</button>
            ))}
          </div>
          {error && <div className="text-sm mb-3" style={{ color: 'var(--terracotta)' }}>{error}</div>}
          <button
            onClick={generate} disabled={loading || !topic.trim()}
            className="btn btn-primary" data-testid={APP.quizGenerateBtn}
          >
            {loading ? 'Generating…' : 'Generate quiz'}
          </button>
        </div>
      )}

      {quiz && !result && (
        <div className="grid gap-6 stagger">
          {quiz.questions.map((q, i) => (
            <div key={i} className="card">
              <div className="label">Question {i + 1}</div>
              <h3 className="text-lg font-medium mb-4" style={{ fontFamily: 'Outfit' }}>{q.question}</h3>
              <div className="grid gap-2">
                {q.options.map((opt, j) => {
                  const selected = answers[i] === j;
                  return (
                    <button
                      key={j}
                      data-testid={`${APP.quizOption}-${i}-${j}`}
                      onClick={() => {
                        const next = [...answers]; next[i] = j; setAnswers(next);
                      }}
                      className="text-left px-4 py-3 rounded-lg transition-colors"
                      style={{
                        background: selected ? 'var(--primary)' : 'var(--surface-2)',
                        color: selected ? 'white' : 'var(--text)',
                        border: '1px solid ' + (selected ? 'var(--primary)' : 'var(--border)'),
                      }}
                    >{opt}</button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            onClick={submit}
            disabled={loading || answers.some((a) => a === -1)}
            className="btn btn-terracotta self-start"
            data-testid={APP.quizSubmitBtn}
          >
            {loading ? 'Scoring…' : 'Submit answers'}
          </button>
        </div>
      )}

      {result && (
        <div className="fade-in">
          <div className="card mb-6">
            <div className="label">Result</div>
            <div className="text-5xl font-semibold mb-2"
                 style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
              {result.score}%
            </div>
            <p style={{ color: 'var(--muted)' }}>{result.correct} of {result.total} correct</p>
          </div>
          <div className="grid gap-4">
            {result.results.map((r, i) => (
              <div key={i} className="card">
                <div className="flex items-start gap-2 mb-2">
                  {r.is_correct
                    ? <CheckCircle size={20} color="var(--primary)" weight="fill" />
                    : <X size={20} color="var(--terracotta)" weight="bold" />}
                  <h3 className="font-medium flex-1" style={{ fontFamily: 'Outfit' }}>{r.question}</h3>
                </div>
                <div className="ml-7 grid gap-1 text-sm">
                  {r.options.map((opt, j) => (
                    <div key={j} style={{
                      color: j === r.correct_index ? 'var(--primary)' :
                             j === r.your_index && !r.is_correct ? 'var(--terracotta)' :
                             'var(--muted)',
                      fontWeight: j === r.correct_index ? 600 : 400,
                    }}>
                      {j === r.correct_index ? '✓ ' : j === r.your_index && !r.is_correct ? '✗ ' : '   '}
                      {opt}
                    </div>
                  ))}
                  {r.explanation && (
                    <div className="mt-2 italic" style={{ color: 'var(--muted)' }}>
                      {r.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-outline mt-6"
            onClick={() => { setQuiz(null); setResult(null); setAnswers([]); setTopic(''); }}
          >
            Try another topic
          </button>
        </div>
      )}
    </AppLayout>
  );
}
