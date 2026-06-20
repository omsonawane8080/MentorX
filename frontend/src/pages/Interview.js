import { useState, useRef, useEffect } from 'react';
import api, { API_BASE } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { APP } from '@/constants/testIds';
import {
  Sparkle, Clock, Microphone, Stop, SpeakerHigh, SpeakerSlash, Waveform,
} from '@phosphor-icons/react';

function formatMMSS(s) {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

export default function Interview() {
  const [focus, setFocus] = useState('General fundamentals');
  const [iv, setIv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [transcribing, setTranscribing] = useState(false);

  const scrollRef = useRef(null);
  const tickRef = useRef(null);
  const autoSentRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const spokenIndexRef = useRef(-1); // index of last interviewer message we already spoke

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [iv, evaluation]);

  // Countdown timer
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

  // We previously used an effect to auto-speak — but browsers block audio
  // playback that isn't tightly tied to a user gesture. Instead we now
  // call speakText() directly from `start` and `sendText` (both triggered
  // by user clicks), and expose a manual "Play question" button as a
  // fallback so the user can always trigger playback.

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const speakText = async (text) => {
    if (!audioOn) return;
    try {
      setSpeaking(true);
      // Stop any currently playing audio first
      if (audioRef.current) { try { audioRef.current.pause(); } catch (_) {} }
      const res = await fetch(`${API_BASE}/interview/speak`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS request failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      try {
        await audio.play();
      } catch (err) {
        // Browser blocked autoplay — user can hit the "Play question" button
        console.warn('Audio autoplay blocked:', err?.message);
        setSpeaking(false);
        setError('Tap the 🔊 button to hear the question (your browser blocked autoplay).');
      }
    } catch (e) {
      console.error('TTS failed:', e);
      setSpeaking(false);
    }
  };

  const replayLastQuestion = () => {
    if (!iv?.messages?.length) return;
    const lastInterviewer = [...iv.messages].reverse().find((m) => m.role === 'interviewer');
    if (lastInterviewer) {
      setError('');
      speakText(lastInterviewer.content);
    }
  };

  const start = async () => {
    setError(''); setBusy(true); setEvaluation(null); autoSentRef.current = false;
    spokenIndexRef.current = -1;
    try {
      const { data } = await api.post('/interview/start', { focus });
      setIv(data);
      setRemainingSec(data.time_limit_seconds || 480);
      // Speak the opener immediately — still within the same click-driven flow
      const opener = data.messages?.[data.messages.length - 1];
      if (opener && opener.role === 'interviewer') {
        spokenIndexRef.current = data.messages.length - 1;
        speakText(opener.content);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not start interview');
    } finally { setBusy(false); }
  };

  const sendText = async (text) => {
    if (!text.trim() || !iv) return;
    setBusy(true);
    try {
      const { data } = await api.post('/interview/reply', { interview_id: iv.interview_id, message: text.trim() });
      setIv({ ...iv, ...data });
      // Speak the latest interviewer reply (also user-gesture driven via stop-recording)
      const last = data.messages?.[data.messages.length - 1];
      if (last && last.role === 'interviewer' && data.messages.length - 1 > spokenIndexRef.current) {
        spokenIndexRef.current = data.messages.length - 1;
        speakText(last.content);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || 'Send failed');
    } finally { setBusy(false); }
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: mime || 'audio/webm' });
        await transcribeAndSend(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      // Stop the AI voice if it was speaking
      if (audioRef.current) { audioRef.current.pause(); setSpeaking(false); }
    } catch (e) {
      setError('Could not access microphone. Please allow mic permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const transcribeAndSend = async (blob) => {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'answer.webm');
      const res = await fetch(`${API_BASE}/interview/transcribe`, {
        method: 'POST', credentials: 'include', body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || 'Transcription failed');
      }
      const { text } = await res.json();
      const finalText = text?.trim();
      if (!finalText) { setError('I couldn\'t hear anything. Please try again, a bit louder.'); return; }
      await sendText(finalText);
    } catch (e) {
      setError(e.message || 'Transcription failed');
    } finally {
      setTranscribing(false);
    }
  };

  const autoSendOnTimeout = async () => {
    if (!iv || iv.status !== 'ongoing') return;
    if (recording) stopRecording();
    try {
      const { data } = await api.post('/interview/reply', {
        interview_id: iv.interview_id,
        message: "(Time ran out — I didn't get to finish my answer)",
      });
      setIv({ ...iv, ...data, status: 'completed' });
    } catch (_) { /* ignore */ }
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
          <div className="label">Mock interview · voice</div>
          <h1 className="text-4xl font-semibold mt-1">A calm, spoken conversation.</h1>
        </div>
        {iv?.status === 'ongoing' && (
          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                setAudioOn((v) => !v);
                if (audioRef.current) { audioRef.current.pause(); setSpeaking(false); }
              }}
              data-testid="interview-toggle-audio"
              className="card"
              style={{ padding: 10, cursor: 'pointer', border: '1px solid var(--line)' }}
              title={audioOn ? 'Mute interviewer voice' : 'Unmute interviewer voice'}
            >
              {audioOn
                ? <SpeakerHigh size={20} color="var(--brand)" weight="fill" />
                : <SpeakerSlash size={20} color="var(--text-muted)" />}
            </button>
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
                  Q {Math.min(candidateTurns + 1, iv.expected_turns || 4)} of {iv.expected_turns || 4}
                </div>
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
          <div className="p-3 rounded-lg mb-3 text-sm flex items-start gap-2"
               style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <Microphone size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span><strong>Voice-based interview.</strong> The AI mentor speaks the questions; you speak your answers via your microphone (we use Whisper to transcribe).</span>
          </div>
          <div className="p-3 rounded-lg mb-4 text-sm flex items-start gap-2"
               style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <Clock size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span><strong>8-minute</strong> session · 4 questions · ~2 min per answer. Auto-completes at timeout.</span>
          </div>
          {error && <div className="text-sm mb-3" style={{ color: 'var(--terracotta)' }}>{error}</div>}
          <button
            className="btn btn-terracotta" onClick={start} disabled={busy}
            data-testid={APP.interviewStartBtn}
          >
            <Microphone size={16} weight="fill" /> {busy ? 'Setting up…' : 'Start voice interview'}
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
              <div key={`${m.role}-${m.ts}`} className="fade-in" style={{
                display: 'flex',
                alignSelf: m.role === 'candidate' ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                flexDirection: 'column',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 4 }}>
                  {m.role === 'candidate' ? 'You' : 'Interviewer'}
                </div>
                <div className={`bubble ${m.role === 'candidate' ? 'bubble-user' : 'bubble-bot'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {(busy || transcribing) && (
              <div className="bubble bubble-bot fade-in" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Waveform size={16} weight="duotone" />
                {transcribing ? 'transcribing your answer…' : 'thinking…'}
              </div>
            )}
            {speaking && !busy && (
              <div className="bubble bubble-bot fade-in" style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)' }}>
                <SpeakerHigh size={16} weight="fill" /> playing question…
              </div>
            )}
          </div>

          {iv.status === 'ongoing' && (
            <div className="flex flex-col items-center gap-3 py-4">
              {/* Replay-question fallback — visible when audio is blocked */}
              <button
                onClick={replayLastQuestion}
                data-testid="interview-replay-question"
                className="btn btn-outline"
                style={{ fontSize: 13 }}
              >
                <SpeakerHigh size={14} weight="fill" /> Play question aloud
              </button>

              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={busy || transcribing || speaking}
                data-testid="interview-record-btn"
                style={{
                  width: 96, height: 96, borderRadius: 999,
                  border: 'none', cursor: (busy || transcribing) ? 'wait' : 'pointer',
                  background: recording ? 'var(--terracotta)' : 'var(--brand)',
                  color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: recording ? '0 0 0 12px rgba(200,107,83,0.18)' : '0 8px 24px rgba(44,85,69,0.2)',
                  transition: 'all 0.2s ease',
                  animation: recording ? 'pulse-rec 1.4s ease-in-out infinite' : 'none',
                }}
              >
                {recording ? <Stop size={36} weight="fill" /> : <Microphone size={36} weight="fill" />}
              </button>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                {transcribing ? 'Transcribing your answer…'
                  : recording ? 'Recording — tap to stop'
                  : speaking ? 'Wait for the interviewer to finish speaking…'
                  : 'Tap to speak your answer'}
              </div>
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

          {error && <div className="card" style={{ color: 'var(--terracotta)', borderColor: 'var(--terracotta)' }}>{error}</div>}

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

      <style>{`
        @keyframes pulse-rec {
          0%, 100% { box-shadow: 0 0 0 12px rgba(200,107,83,0.18); }
          50% { box-shadow: 0 0 0 20px rgba(200,107,83,0.06); }
        }
      `}</style>
    </AppLayout>
  );
}
