import React from 'react';

export default function PageHeader({ title, subtitle = undefined, children = undefined }) {
  return (
    <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}