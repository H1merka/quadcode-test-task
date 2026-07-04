import NotificationCenter from './NotificationCenter';

export default function App() {
  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-hidden">
      {/* Decorative backdrop so the fixed top-right panel has something to sit over */}
      <div className="absolute inset-0 flex items-center justify-center text-slate-700 select-none pointer-events-none">
        <div className="text-center px-8">
          <p className="text-sm uppercase tracking-widest mb-2">Baseline build — no skill used</p>
          <h1 className="text-3xl font-bold text-slate-500">App content placeholder</h1>
          <p className="mt-2 text-slate-600 max-w-md mx-auto">
            The Notification Center panel is anchored top-right per interaction-spec.md.
          </p>
        </div>
      </div>

      <NotificationCenter />
    </div>
  );
}
