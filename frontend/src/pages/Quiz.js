import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { APP } from '@/constants/testIds';
import { CheckCircle, X } from '@phosphor-icons/react';

export default function Quiz() {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get('topic') || '';
  const [topic, setTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate if topic is supplied via URL (e.g. from LearnModal)
  useEffect(() => {
    if (initialTopic && !quiz) {
      // trigger generate on mount with the URL topic
      generateTopic(initialTopic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateTopic = async (t) => {
    if (!t.trim()) return;
    setError(''); setResult(null); setQuiz(null); setLoading(true);
    try {
      const { data } = await api.post('/quiz/generate', { topic: t.trim(), difficulty });
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(-1));
    } catch (e) {
      setError(e?.response?.data?.detail || 'Quiz generation failed');
    } finally { setLoading(false); }
  };

  const generate = () => generateTopic(topic);

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
                  background: difficulty === d ? 'var(--brand)' : 'var(--surface-2)',
                  color: difficulty === d ? 'white' : 'var(--text)',
                  border: '1px solid var(--line)',
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
            <div key={q.question} className="card">
              <div className="label">Question {i + 1}</div>
              <h3 className="text-lg font-medium mb-4" style={{ fontFamily: 'Outfit' }}>{q.question}</h3>
              <div className="grid gap-2">
                {q.options.map((opt, j) => {
                  const selected = answers[i] === j;
                  return (
                    <button
                      key={`${q.question}-${opt}`}
                      data-testid={`${APP.quizOption}-${i}-${j}`}
                      onClick={() => {
                        const next = [...answers]; next[i] = j; setAnswers(next);
                      }}
                      className="text-left px-4 py-3 rounded-lg transition-colors"
                      style={{
                        background: selected ? 'var(--brand)' : 'var(--surface-2)',
                        color: selected ? 'white' : 'var(--text)',
                        border: '1px solid ' + (selected ? 'var(--brand)' : 'var(--line)'),
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
                 style={{ fontFamily: 'Outfit', color: 'var(--brand)' }}>
              {result.score}%
            </div>
            <p style={{ color: 'var(--text-muted)' }}>{result.correct} of {result.total} correct</p>
          </div>
          <div className="grid gap-4">
            {result.results.map((r) => (
              <div key={r.question} className="card">
                <div className="flex items-start gap-2 mb-2">
                  {r.is_correct
                    ? <CheckCircle size={20} color="var(--brand)" weight="fill" />
                    : <X size={20} color="var(--terracotta)" weight="bold" />}
                  <h3 className="font-medium flex-1" style={{ fontFamily: 'Outfit' }}>{r.question}</h3>
                </div>
                <div className="ml-7 grid gap-1 text-sm">
                  {r.options.map((opt, j) => {
                    const isCorrect = j === r.correct_index;
                    const isWrongPick = j === r.your_index && !r.is_correct;
                    let color = 'var(--text-muted)';
                    if (isCorrect) color = 'var(--brand)';
                    else if (isWrongPick) color = 'var(--terracotta)';
                    let prefix = '   ';
                    if (isCorrect) prefix = '✓ ';
                    else if (isWrongPick) prefix = '✗ ';
                    return (
                      <div key={`${r.question}-${opt}`} style={{
                        color,
                        fontWeight: isCorrect ? 600 : 400,
                      }}>
                        {prefix}{opt}
                      </div>
                    );
                  })}
                  {r.explanation && (
                    <div className="mt-2 italic" style={{ color: 'var(--text-muted)' }}>
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
