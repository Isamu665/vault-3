import React from 'react';

export default function Section({ title, action = undefined, children, className = '' }) {
  return (
    <section className={`rounded-2xl border bg-card p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}