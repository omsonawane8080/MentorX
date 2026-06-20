import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { APP } from '@/constants/testIds';
import { PaperPlaneTilt, Sparkle, Clock } from '@phosphor-icons/react';

function formatMMSS(s) {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

export default function Interview() {
  const [focus, setFocus] = useState('General fundamentals');
  const [iv, setIv] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const scrollRef = useRef(null);
  const tickRef = useRef(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [iv, evaluation]);

  // Countdown timer — runs while interview is ongoing
  useEffect(() => {
    if (!iv || iv.status !== 'ongoing') return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setRemainingSec((s) => {
        if (s <= 1) {
          clearInterval(tickRef.current);
          if (!autoSentRef.current) {
            autoSentRef.current = true;
            autoSendOnTimeout();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iv?.status]);

  const start = async () => {
    setError(''); setBusy(true); setEvaluation(null); autoSentRef.current = false;
    try {
      const { data } = await api.post('/interview/start', { focus });
      setIv(data);
      setRemainingSec(data.time_limit_seconds || 480); // default 8 min
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
      setIv({ ...iv, ...data });
    } catch (e) {
      setError(e?.response?.data?.detail || 'Send failed');
    } finally { setBusy(false); }
  };

  const autoSendOnTimeout = async () => {
    if (!iv || iv.status !== 'ongoing') return;
    try {
      const placeholder = draft.trim() || "(Time ran out — I didn't get to finish my answer)";
      const { data } = await api.post('/interview/reply', {
        interview_id: iv.interview_id, message: placeholder,
      });
      // After timeout, set status to completed regardless
      setIv({ ...iv, ...data, status: 'completed' });
      setDraft('');
    } catch (e) {
      // ignore
    }
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

  const timeLow = iv?.status === 'ongoing' && remainingSec <= 60;
  const candidateTurns = iv?.messages?.filter((m) => m.role === 'candidate').length || 0;

  return (
    <AppLayout>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="label">Mock interview</div>
          <h1 className="text-4xl font-semibold mt-1">A calm, 4-question conversation.</h1>
        </div>
        {iv?.status === 'ongoing' && (
          <div
            data-testid="interview-timer"
            className="card"
            style={{
              padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10,
              background: timeLow ? '#FCEFEA' : 'var(--surface)',
              borderColor: timeLow ? 'var(--terracotta)' : 'var(--line)',
            }}
          >
            <Clock size={18} color={timeLow ? 'var(--terracotta)' : 'var(--brand)'} weight="fill" />
            <div>
              <div style={{
                fontFamily: 'Outfit', fontSize: 22, fontWeight: 600,
                color: timeLow ? 'var(--terracotta)' : 'var(--brand)',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>{formatMMSS(remainingSec)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Q {candidateTurns + (busy ? 0 : 1)} of {iv.expected_turns || 4}
              </div>
            </div>
          </div>
        )}
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
          <div className="p-3 rounded-lg mb-4 text-sm flex items-start gap-2"
               style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <Clock size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span><strong>8-minute</strong> interview · 4 questions · ~2 minutes per answer. The interview auto-completes when time runs out.</span>
          </div>
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
                  <ul className="list-disc pl-5 text-sm">{evaluation.strengths?.map((s, i) => <li key={`str-${i}`}>{s}</li>)}</ul>
                </div>
                <div>
                  <div className="label">Areas to improve</div>
                  <ul className="list-disc pl-5 text-sm">{evaluation.weaknesses?.map((s, i) => <li key={`wk-${i}`}>{s}</li>)}</ul>
                </div>
              </div>

              <div className="label">Per-answer feedback</div>
              <div className="grid gap-3">
                {evaluation.per_answer?.map((p, i) => (
                  <div key={`pa-${i}`} className="p-4 rounded-lg" style={{ background: 'var(--surface-2)' }}>
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
                {evaluation.next_steps?.map((s, i) => <li key={`ns-${i}`}>{s}</li>)}
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
