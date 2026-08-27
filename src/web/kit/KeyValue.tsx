import type { ReactNode } from 'react';

/** 键值对列表(dl 网格) */
export function KeyValue({ pairs }: { pairs: ReadonlyArray<{ k: ReactNode; v: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm" data-slot="key-value">
      {pairs.map((p, i) => (
        <div key={i} className="col-span-2 grid grid-cols-subgrid">
          <dt className="text-muted-foreground">{p.k}</dt>
          <dd className="text-foreground break-all">{p.v}</dd>
        </div>
      ))}
    </dl>
  );
}
