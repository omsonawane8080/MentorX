import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { PaperPlaneTilt, Sparkle, ChatCircle, Trash } from '@phosphor-icons/react';

const STARTERS = [
  'What should I focus on first this week?',
  'Explain the difference between supervised and unsupervised learning.',
  'I\'m stuck on a topic — how do I push through?',
  'What kind of project should I build next for my portfolio?',
  'How do I prepare for behavioral interviews?',
];

export default function AskMentor() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get('/mentor/chat')
      .then(({ data }) => setMessages(data.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const ask = async (q) => {
    const question = (q || '').trim();
    if (!question || sending) return;
    setError(''); setSending(true);
    // Optimistic user bubble
    setMessages((m) => [...m, { role: 'user', content: question, ts: new Date().toISOString() }]);
    setDraft('');
    try {
      const { data } = await api.post('/mentor/ask', { question });
      setMessages(data.messages || []);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not reach your mentor');
      // remove the optimistic bubble on error
      setMessages((m) => m.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    if (!window.confirm('Clear this conversation? Your mentor will start fresh.')) return;
    try {
      await api.post('/mentor/chat/clear');
      setMessages([]);
    } catch (_) { /* ignore */ }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="label">Ask your mentor</div>
          <h1 className="text-4xl font-semibold mt-1">Anything, anytime.</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)', maxWidth: 580 }}>
            A private chat with your AI career mentor. Ask about topics, get unstuck on concepts,
            request project ideas, or talk through interview prep. Each roadmap has its own conversation.
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="btn btn-ghost" data-testid="mentor-clear-chat">
            <Trash size={14} /> Clear chat
          </button>
        )}
      </div>

      {messages.length === 0 && !loading && (
        <div className="card mb-4">
          <div className="label mb-3">Start with…</div>
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="chip"
                style={{ cursor: 'pointer', textAlign: 'left' }}
                data-testid={`mentor-starter-${s.slice(0, 18)}`}
              >
                <Sparkle size={11} weight="fill" color="var(--terracotta)" /> {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ color: 'var(--text-muted)' }}>Loading conversation…</div>
      ) : (
        <div
          ref={scrollRef}
          className="card flex flex-col gap-4"
          style={{ minHeight: 320, maxHeight: 560, overflowY: 'auto' }}
        >
          {messages.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
              <ChatCircle size={36} weight="duotone" />
              <p style={{ marginTop: 8 }}>Your mentor is ready. Ask anything.</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={`${m.role}-${m.ts || i}`}
                className="fade-in"
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}
              >
                <div style={{
                  fontSize: 11, color: 'var(--text-muted)', marginBottom: 4,
                  paddingLeft: 4, textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  {m.role === 'user' ? 'You' : 'Mentor'}
                </div>
                <div className={`bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
                  {m.content}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="bubble bubble-bot fade-in" style={{ color: 'var(--text-muted)', alignSelf: 'flex-start' }}>
              thinking…
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="card mt-3" style={{ color: 'var(--terracotta)', borderColor: 'var(--terracotta)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <input
          className="input flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !sending && ask(draft)}
          placeholder="Ask your mentor anything…"
          disabled={sending}
          data-testid="mentor-ask-input"
        />
        <button
          className="btn btn-primary"
          onClick={() => ask(draft)}
          disabled={sending || !draft.trim()}
          data-testid="mentor-ask-send"
        >
          <PaperPlaneTilt size={16} weight="fill" /> Ask
        </button>
      </div>
    </AppLayout>
  );
}
