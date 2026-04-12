import { Progress } from "@/components/ui/progress";

export function ImportProgress({ percent }: { percent: number }) {
  return (
    <div className="space-y-2 w-full max-w-md mx-auto p-6 bg-slate-50 rounded-lg">
      <div className="flex justify-between text-sm font-medium">
        <span>Processing Dental Records...</span>
        <span>{percent}%</span>
      </div>
      <Progress value={percent} className="h-2" />
      <p className="text-xs text-muted-foreground italic">
        Please do not close your browser until the import is complete.
      </p>
    </div>
  );
}