import { Loader } from '@/components/UI';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-white space-y-4">
      <Loader size="lg" />
      <p className="text-text-muted text-sm">Loading data...</p>
    </div>
  );
}
