interface ComponentProgressProps {
  totalTasks: number;
  completedTasks: number;
}

export default function ComponentProgress({ totalTasks, completedTasks }: ComponentProgressProps) {
  if (totalTasks === 0) return null;

  const progress = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
      <div
        className="bg-purple-500 h-2 rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}