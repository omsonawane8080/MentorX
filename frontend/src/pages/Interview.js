import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { APP } from '@/constants/testIds';
import { PaperPlaneTilt, Sparkle } from '@phosphor-icons/react';

export default function Interview() {
  const [focus, setFocus] = useState('General fundamentals');
  const [iv, setIv] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [iv, evaluation]);

  const start = async () => {
    setError(''); setBusy(true); setEvaluation(null);
    try {
      const { data } = await api.post('/interview/start', { focus });
      setIv(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not start interview');
    } finally { setBusy(false); }
  };

  const send = async () => {
    if (!draft.trim() || !iv) return;
    const msg = draft.trim();
    setDraft(''); setBusy(true);
    try {
      const { data } = await api.post('/interview/reply', { interview_id: iv.interview_id, message: msg });
      setIv(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Send failed');
    } finally { setBusy(false); }
  };

  const evaluate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/interview/evaluate/${iv.interview_id}`);
      setEvaluation(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Evaluation failed');
    } finally { setBusy(false); }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="label">Mock interview</div>
        <h1 className="text-4xl font-semibold mt-1">A calm, 4-question conversation.</h1>
      </div>

      {!iv && (
        <div className="card max-w-2xl">
          <label className="label">What should we focus on?</label>
          <input
            className="input mb-4"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. Python fundamentals, ML concepts, system design basics"
            data-testid={APP.interviewFocusInput}
          />
          {error && <div className="text-sm mb-3" style={{ color: 'var(--terracotta)' }}>{error}</div>}
          <button
            className="btn btn-terracotta" onClick={start} disabled={busy}
            data-testid={APP.interviewStartBtn}
          >
            {busy ? 'Setting up…' : 'Start interview'}
          </button>
        </div>
      )}

      {iv && (
        <div className="grid gap-4">
          <div
            ref={scrollRef}
            className="card flex flex-col gap-3"
            style={{ minHeight: 360, maxHeight: 480, overflowY: 'auto' }}
          >
            {iv.messages.map((m) => (
              <div key={`${m.role}-${m.ts}`} className={`bubble ${m.role === 'candidate' ? 'bubble-user' : 'bubble-bot'} fade-in`}>
                {m.content}
              </div>
            ))}
            {busy && <div className="bubble bubble-bot fade-in" style={{ color: 'var(--text-muted)' }}>typing…</div>}
          </div>

          {iv.status === 'ongoing' && (
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !busy && send()}
                placeholder="Your answer…"
                disabled={busy}
                data-testid={APP.interviewMessageInput}
              />
              <button
                className="btn btn-primary" onClick={send}
                disabled={busy || !draft.trim()}
                data-testid={APP.interviewSendBtn}
              >
                <PaperPlaneTilt size={16} weight="fill" /> Send
              </button>
            </div>
          )}

          {iv.status === 'completed' && !evaluation && (
            <button
              className="btn btn-terracotta self-start" onClick={evaluate} disabled={busy}
              data-testid={APP.interviewEvaluateBtn}
            >
              <Sparkle size={16} weight="fill" /> {busy ? 'Evaluating…' : 'Get evaluation'}
            </button>
          )}

          {evaluation && (
            <div className="card fade-in">
              <div className="label">Evaluation</div>
              <div className="text-5xl font-semibold mb-3"
                   style={{ fontFamily: 'Outfit', color: 'var(--brand)' }}>
                {evaluation.overall_score}<span className="text-xl" style={{ color: 'var(--text-muted)' }}>/100</span>
              </div>
              <p className="mb-4">{evaluation.summary}</p>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="label">Strengths</div>
                  <ul className="list-disc pl-5 text-sm">{evaluation.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
                <div>
                  <div className="label">Areas to improve</div>
                  <ul className="list-disc pl-5 text-sm">{evaluation.weaknesses?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              </div>

              <div className="label">Per-answer feedback</div>
              <div className="grid gap-3">
                {evaluation.per_answer?.map((p, i) => (
                  <div key={i} className="p-4 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                    <div className="text-sm font-medium mb-1">{p.question}</div>
                    <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>"{p.candidate_answer}"</div>
                    <div className="flex gap-2 items-center">
                      <span className="chip">Score: {p.score}/10</span>
                      <span className="text-sm">{p.feedback}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="label mt-6">Next steps</div>
              <ul className="list-disc pl-5 text-sm">
                {evaluation.next_steps?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>

              <button
                className="btn btn-outline mt-6"
                onClick={() => { setIv(null); setEvaluation(null); }}
              >New interview</button>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
