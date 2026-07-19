import { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000';
const DEMO_MODE = true;
const TRANSCRIPT_LINE_MS = 2000;

const DEFAULT_MOVE = {
  from_address: 'Mannheim',
  to_address: 'Berlin',
  home_size: '2BR apartment',
  move_date: '2026-08-15',
  special_items: 'Upright piano',
  distance_km: 630,
};

const R1_UMZUGS = {
  mover_id: 'mover_1',
  mover_name: 'UmzugsProfis Berlin',
  price: 2400,
  round_number: 1,
  notes: 'All-inclusive with packing, insurance and stairs. No flexibility on price.',
  audio: '/conv1.mp3',
  transcript: [
    { speaker: 'Agent', text: "Hi there, I'm calling to get a quote for a residential move — do you have a couple of minutes?" },
    { speaker: 'Mover', text: "Yeah, I'll help you." },
    { speaker: 'Agent', text: "Mannheim to Berlin, two-bedroom apartment, August 15th 2026, with an upright piano. Could you give me a price?" },
    { speaker: 'Mover', text: "Yeah, everything included. It'll be 2,400 euros." },
    { speaker: 'Agent', text: "So 2,400 all-inclusive — packing, insurance, stairs, piano?" },
    { speaker: 'Mover', text: "Yes." },
    { speaker: 'Agent', text: "Any flexibility on that price?" },
    { speaker: 'Mover', text: "No." },
    { speaker: 'Agent', text: "Understood. Thanks so much for the quote." },
  ],
};

const R1_SCHNELL = {
  mover_id: 'mover_2',
  mover_name: 'SchnellMove GmbH',
  price: 1900,
  round_number: 1,
  notes: 'If booked today — €1,900 all-in, packing and insurance included.',
  audio: '/conv2.mp3',
  transcript: [
    { speaker: 'Agent', text: "Hi, I'm calling to get a quote for a residential move." },
    { speaker: 'Mover', text: "Yes." },
    { speaker: 'Agent', text: "Mannheim to Berlin, two-bedroom, August 15th, upright piano. What can you offer?" },
    { speaker: 'Mover', text: "2,100 with everything. If you book today, 1,900." },
    { speaker: 'Agent', text: "So 1,900 all-in if I book today?" },
    { speaker: 'Mover', text: "Yes. Everything included." },
    { speaker: 'Agent', text: "Any further flexibility on 1,900?" },
    { speaker: 'Mover', text: "That's the absolute best." },
    { speaker: 'Agent', text: "Understood. Thank you." },
  ],
};

const R2_UMZUGS = {
  mover_id: 'mover_1',
  mover_name: 'UmzugsProfis Berlin',
  price: 2100,
  round_number: 2,
  notes: 'Matched down after hearing competitor quote. 2,100 euros all-inclusive.',
  audio: '/conv3.mp3',
  transcript: [
    { speaker: 'Agent', text: "Hi, calling back. I've got a competing quote at 2,400 euros — could you beat it?" },
    { speaker: 'Mover', text: "2,400? Hmm." },
    { speaker: 'Agent', text: "I'd really like to go with your company if we can make the numbers work." },
    { speaker: 'Mover', text: "Okay, I can do 2,100." },
    { speaker: 'Agent', text: "2,100 all-inclusive, no hidden fees?" },
    { speaker: 'Mover', text: "Yes." },
    { speaker: 'Agent', text: "Could you do 2,050?" },
    { speaker: 'Mover', text: "No." },
    { speaker: 'Agent', text: "Okay, still a great price. Thank you." },
  ],
};

const R2_SCHNELL = {
  mover_id: 'mover_2',
  mover_name: 'SchnellMove GmbH',
  price: 1800,
  round_number: 2,
  notes: 'Final undercut to €1,800 to beat competitor. Book today.',
  audio: '/conv4.mp3',
  transcript: [
    { speaker: 'Agent', text: "Hi, calling back. UmzugsProfis matched at 2,100 euros. Could you beat that?" },
    { speaker: 'Mover', text: "The best we can do is 1,800 euros." },
    { speaker: 'Agent', text: "Is that really the best you can do?" },
    { speaker: 'Mover', text: "Yeah." },
    { speaker: 'Agent', text: "1,800 final, all-inclusive, no hidden fees?" },
    { speaker: 'Mover', text: "Yes." },
    { speaker: 'Agent', text: "Thanks so much. Have a great day." },
  ],
};

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [move, setMove] = useState(DEFAULT_MOVE);
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const pollRef = useRef(null);
  const demoTimers = useRef([]);

  const startNegotiation = async () => {
    if (DEMO_MODE) {
      runScriptedFlow();
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(move),
      });
      const data = await r.json();
      setJobId(data.job_id);
      setScreen('live');
    } catch (e) {
      alert('Backend not reachable at ' + API_BASE);
      console.error(e);
    }
  };

  const runScriptedFlow = () => {
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    setScreen('live');
    setJob({ status: 'round_1', quotes: [] });

    const push = (ms, fn) => demoTimers.current.push(setTimeout(fn, ms));

    push(2000, () => setJob({ status: 'round_1', quotes: [R1_UMZUGS] }));
    push(18000, () => setJob({ status: 'round_1', quotes: [R1_UMZUGS, R1_SCHNELL] }));
    push(34000, () => setJob({ status: 'round_2', quotes: [R1_UMZUGS, R1_SCHNELL] }));
    push(38000, () => setJob({ status: 'round_2', quotes: [R1_UMZUGS, R1_SCHNELL, R2_UMZUGS] }));
    push(60000, () => {
      const allQuotes = [R1_UMZUGS, R1_SCHNELL, R2_UMZUGS, R2_SCHNELL];
      setJob({
        status: 'completed',
        quotes: allQuotes,
        winner: R2_SCHNELL,
        total_saved: 600,
      });
      setScreen('done');
    });
  };

  useEffect(() => {
    if (!jobId || DEMO_MODE) return;
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/status/${jobId}`);
        const data = await r.json();
        setJob(data);
        if (data.status === 'completed') {
          setScreen('done');
          clearInterval(pollRef.current);
        }
      } catch (e) {
        console.error('poll error', e);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  useEffect(() => {
    return () => demoTimers.current.forEach(clearTimeout);
  }, []);

  const reset = () => {
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    setScreen('landing');
    setJob(null);
    setJobId(null);
  };

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto text-slate-900">
      <Header />
      {screen === 'landing' && (
        <Landing move={move} setMove={setMove} onStart={startNegotiation} />
      )}
      {screen === 'live' && <LiveDashboard job={job} move={move} />}
      {screen === 'done' && <Results job={job} move={move} onReset={reset} />}
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between mb-12">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-blue-600 bg-clip-text text-transparent">
        haggle.
      </h1>
      <div className="text-sm text-slate-500">hack-nation 2026</div>
    </div>
  );
}

function Landing({ move, setMove, onStart }) {
  return (
    <div className="text-center">
      <h2 className="text-5xl font-bold mb-4 leading-tight text-slate-900">
        AI that calls moving companies
        <br />
        and{' '}
        <span className="bg-gradient-to-r from-amber-500 to-blue-600 bg-clip-text text-transparent">
          negotiates for you
        </span>
        .
      </h2>
      <p className="text-slate-600 text-lg mb-12">
        Real calls. Real recordings. Real savings.
      </p>

      <div className="max-w-xl mx-auto bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-8 text-left">
        <Field label="Moving from" value={move.from_address} onChange={(v) => setMove({ ...move, from_address: v })} />
        <Field label="To" value={move.to_address} onChange={(v) => setMove({ ...move, to_address: v })} />
        <Field label="Home size" value={move.home_size} onChange={(v) => setMove({ ...move, home_size: v })} />
        <Field label="Move date" value={move.move_date} onChange={(v) => setMove({ ...move, move_date: v })} />
        <Field label="Special items" value={move.special_items} onChange={(v) => setMove({ ...move, special_items: v })} />
      </div>

      <button
        onClick={onStart}
        className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-blue-600 text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg"
      >
        Start haggling →
      </button>

      <div className="mt-12 text-sm text-slate-500">
        2 movers · 2 rounds · real Twilio calls
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
      <span className="text-slate-500 text-sm w-32">{label}</span>
      <input
        className="flex-1 bg-transparent text-right text-slate-900 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function LiveDashboard({ job, move }) {
  const quotes = job?.quotes || [];
  const round1 = quotes.filter((q) => q.round_number === 1);
  const round2 = quotes.filter((q) => q.round_number === 2);
  const status = job?.status || 'starting';

  return (
    <div>
      <MoveStripe move={move} />
      <div className="flex items-center gap-3 mb-8">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span className="text-slate-700 uppercase tracking-widest text-xs font-semibold">
          {status === 'round_1' && 'Round 1 · getting initial quotes'}
          {status === 'round_2' && 'Round 2 · playing them against each other'}
          {status === 'starting' && 'starting…'}
        </span>
      </div>

      <RoundSection title="Round 1 · initial quotes" quotes={round1} activeIf={status === 'round_1'} liveMode />
      <RoundSection title="Round 2 · competitive pressure" quotes={round2} activeIf={status === 'round_2'} liveMode />
    </div>
  );
}

function MoveStripe({ move }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-slate-700">
      {move.from_address} → {move.to_address} · {move.home_size} · {move.special_items}
    </div>
  );
}

function RoundSection({ title, quotes, activeIf, liveMode }) {
  return (
    <div className="mb-8">
      <div className="text-slate-500 uppercase tracking-widest text-xs mb-3 font-semibold">{title}</div>
      <div className="space-y-4">
        {quotes.length === 0 && activeIf && (
          <div className="text-slate-400 italic text-sm px-4 py-3">waiting for quote…</div>
        )}
        {quotes.length === 0 && !activeIf && (
          <div className="text-slate-300 italic text-sm px-4 py-3">not started</div>
        )}
        {quotes.map((q, i) => (
          <QuoteRow key={`${q.mover_id}-${q.round_number}-${i}`} quote={q} liveMode={liveMode} />
        ))}
      </div>
    </div>
  );
}

function QuoteRow({ quote, liveMode }) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [linesShown, setLinesShown] = useState(liveMode ? 0 : (quote.transcript?.length || 0));
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    if (!liveMode || !quote.transcript || quote.transcript.length === 0) return;

    let currentLine = 0;
    setLinesShown(0);

    const interval = setInterval(() => {
      currentLine += 1;
      setLinesShown(currentLine);
      if (currentLine >= quote.transcript.length) {
        clearInterval(interval);
      }
    }, TRANSCRIPT_LINE_MS);

    return () => clearInterval(interval);
  }, [liveMode, quote.transcript]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [linesShown]);

  const visibleTranscript = quote.transcript?.slice(0, linesShown) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 h-fit">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🚚</span>
              <span className="font-semibold text-slate-900">{quote.mover_name}</span>
            </div>
            {quote.notes && (
              <p className="text-sm text-slate-500 italic mt-2">"{quote.notes}"</p>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="text-2xl font-bold text-blue-700">€{Math.round(quote.price).toLocaleString()}</div>
            {quote.audio && (
              <button
                onClick={() => setShowPlayer((s) => !s)}
                className="mt-2 text-xs px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold"
              >
                {showPlayer ? '× close audio' : '▶ play recording'}
              </button>
            )}
          </div>
        </div>
        {showPlayer && quote.audio && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <audio controls autoPlay src={quote.audio} className="w-full" />
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-72 overflow-y-auto">
        <div className="text-slate-500 uppercase tracking-widest text-[10px] mb-2 font-semibold">Live transcript</div>
        {visibleTranscript.length === 0 && (
          <div className="text-slate-400 italic text-sm">connecting…</div>
        )}
        <div className="space-y-2 text-sm">
          {visibleTranscript.map((line, i) => (
            <div key={i} className="flex gap-2">
              <span className={`font-semibold min-w-14 ${line.speaker === 'Agent' ? 'text-blue-700' : 'text-amber-700'}`}>
                {line.speaker}:
              </span>
              <span className="text-slate-800">{line.text}</span>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}

function Results({ job, move, onReset }) {
  const saved = job?.total_saved || 0;
  const winner = job?.winner;
  const quotes = job?.quotes || [];
  const round1 = quotes.filter((q) => q.round_number === 1);
  const round2 = quotes.filter((q) => q.round_number === 2);
  const baseline = round1.length ? Math.max(...round1.map((q) => q.price)) : 0;

  return (
    <div>
      <div className="text-center mb-12">
        <div className="text-slate-500 text-sm mb-2 uppercase tracking-widest font-semibold">Total saved</div>
        <div className="text-8xl font-bold bg-gradient-to-r from-amber-500 to-blue-600 bg-clip-text text-transparent">
          €{Math.round(saved).toLocaleString()}
        </div>
        {winner && (
          <div className="mt-6 text-slate-700">
            Winner:{' '}
            <span className="text-slate-900 font-semibold">{winner.mover_name}</span>{' '}
            @ <span className="text-blue-700 font-semibold">€{Math.round(winner.price).toLocaleString()}</span>
          </div>
        )}
        {baseline > 0 && (
          <div className="text-slate-500 text-sm mt-1">
            Started at €{Math.round(baseline).toLocaleString()}
          </div>
        )}
      </div>

      <MoveStripe move={move} />
      <RoundSection title="Round 1 · initial quotes" quotes={round1} activeIf={false} liveMode={false} />
      <RoundSection title="Round 2 · competitive pressure" quotes={round2} activeIf={false} liveMode={false} />

      <div className="text-center mt-8">
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-full border border-slate-300 hover:bg-slate-100 text-slate-700"
        >
          Try another move
        </button>
      </div>
    </div>
  );
}