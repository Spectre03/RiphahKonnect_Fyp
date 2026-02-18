import { cn } from '../../utils/cn';

export default function PageLayout({ title, subtitle, children, className, rightPanel }) {
  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className={cn('flex-1 min-w-0 p-4 md:p-6 lg:p-8', className)}>
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h1 className="text-2xl font-bold text-slate-900">{title}</h1>}
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
        )}
        <div className="max-w-3xl mx-auto lg:mx-0">
          {children}
        </div>
      </div>

      {/* Optional Right Panel */}
      {rightPanel && (
        <aside className="hidden xl:block w-80 flex-shrink-0 p-6 border-l border-slate-100">
          {rightPanel}
        </aside>
      )}
    </div>
  );
}
