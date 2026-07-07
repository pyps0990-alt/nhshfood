"use client";

export function MenuLoader({ color = "#E23D28" }: { color?: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fade-in">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card-premium overflow-hidden" style={{ animationDelay: `${i * 0.04}s` }}>
          <div className="p-3 sm:p-4 space-y-3">
            <div className="h-4 w-3/4 rounded-md skeleton" />
            <div className="h-3 w-1/2 rounded-md skeleton" />
            <div className="flex items-center justify-between pt-2">
              <div className="h-6 w-12 rounded-md skeleton" />
              <div className="h-9 w-16 rounded-xl skeleton" />
            </div>
          </div>
        </div>
      ))}
      <style>{`
        .skeleton {
          background: linear-gradient(90deg,
            hsl(20, 10%, 90%) 25%,
            hsl(20, 10%, 95%) 50%,
            hsl(20, 10%, 90%) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        .dark .skeleton {
          background: linear-gradient(90deg,
            hsl(20, 6%, 18%) 25%,
            hsl(20, 6%, 24%) 50%,
            hsl(20, 6%, 18%) 75%
          );
          background-size: 200% 100%;
        }
      `}</style>
    </div>
  );
}
