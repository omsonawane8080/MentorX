import { APP } from '@/constants/testIds';
import { ArrowRight, Brain, Compass, ListChecks, Microphone, Leaf } from '@phosphor-icons/react';

export default function Landing() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const features = [
    { icon: Compass, title: 'Personal Roadmap', text: 'A month-by-month plan tailored to your background and timeline.' },
    { icon: ListChecks, title: 'Daily Tasks', text: '3-4 small, concrete tasks each day that compound into real skills.' },
    { icon: Brain, title: 'Adaptive Quizzes', text: 'Topic-wise MCQs with explanations to lock in what you learn.' },
    { icon: Microphone, title: 'AI Mock Interviews', text: 'Calm, conversational practice with honest, structured feedback.' },
  ];

  return (
    <div className="min-h-screen relative grain" style={{ background: 'var(--bg)' }}>
      <header className="max-w-6xl mx-auto px-6 md:px-10 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'var(--brand)' }}>
            <Leaf size={20} color="white" weight="duotone" />
          </div>
          <span className="font-semibold" style={{ fontFamily: 'Outfit' }}>Mentor</span>
        </div>
        <button
          onClick={handleLogin}
          data-testid={APP.googleLoginBtn}
          className="btn btn-outline"
        >
          Sign in with Google
        </button>
      </header>

      <section
        data-testid={APP.landingHero}
        className="max-w-6xl mx-auto px-6 md:px-10 pt-20 pb-24 grid md:grid-cols-12 gap-12 items-center"
      >
        <div className="md:col-span-7 stagger">
          <div className="chip mb-6">
            <span style={{ color: 'var(--terracotta)' }}>●</span> Adaptive AI Career Coach
          </div>
          <h1 className="text-4xl md:text-6xl leading-[1.05] font-semibold mb-6">
            A mentor that <span className="gradient-text">remembers</span> you —<br />
            not a chatbot that forgets.
          </h1>
          <p className="text-lg max-w-xl mb-8" style={{ color: 'var(--text-muted)' }}>
            Tell us your target role and timeline. We'll generate a roadmap,
            give you daily tasks, quiz you on what matters, and run mock interviews
            with real feedback. Designed for students and career switchers.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLogin}
              className="btn btn-primary"
              data-testid="hero-login-btn"
            >
              Start with Google <ArrowRight size={16} weight="bold" />
            </button>
            <a href="#features" className="btn btn-ghost">See how it works</a>
          </div>
          <div className="flex gap-6 mt-10 text-sm" style={{ color: 'var(--text-muted)' }}>
            <div><strong style={{ color: 'var(--text)' }}>Free</strong> to try</div>
            <div><strong style={{ color: 'var(--text)' }}>1 min</strong> to onboard</div>
            <div><strong style={{ color: 'var(--text)' }}>Adaptive</strong> daily plan</div>
          </div>
        </div>
        <div className="md:col-span-5">
          <div className="card relative overflow-hidden" style={{ padding: 0 }}>
            <img
              src="https://images.unsplash.com/photo-1654356709115-3f68998bead4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwyfHxjYWxtJTIwc3R1ZHklMjBkZXNrJTIwbW9ybmluZyUyMHN1bmxpZ2h0fGVufDB8fHx8MTc4MTkzOTIyM3ww&ixlib=rb-4.1.0&q=85"
              alt="Calm study desk"
              className="w-full h-72 object-cover"
            />
            <div className="p-6">
              <div className="label">Today</div>
              <div className="font-medium mb-3">3 of 4 tasks done</div>
              <div className="flex gap-2">
                <span className="chip">🔥 7-day streak</span>
                <span className="chip">Readiness 64</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 md:px-10 pb-24">
        <h2 className="text-2xl md:text-3xl font-medium mb-10">What you get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card card-hover">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                   style={{ background: 'var(--surface-2)', color: 'var(--brand)' }}>
                <Icon size={20} weight="duotone" />
              </div>
              <div className="font-medium mb-2" style={{ fontFamily: 'Outfit' }}>{title}</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{text}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-6 text-sm flex justify-between"
             style={{ color: 'var(--text-muted)' }}>
          <span>© Mentor — your AI career coach</span>
          <span>Built with calm focus.</span>
        </div>
      </footer>
    </div>
  );
}
