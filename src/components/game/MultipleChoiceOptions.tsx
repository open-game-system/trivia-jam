export const MultipleChoiceOptions = ({
  options,
  correctAnswer,
}: {
  options: string[];
  correctAnswer?: string | number;
}) => (
  <div className={correctAnswer !== undefined ? "space-y-4 mb-6" : "mt-8 space-y-4 max-w-2xl mx-auto"}>
    {options.map((option, index) => (
      <div
        key={option}
        className={`p-4 rounded-xl ${
          correctAnswer !== undefined && option === correctAnswer
            ? "bg-green-500/10 border border-green-500/30"
            : "bg-gray-800/30 border border-gray-700/30"
        }`}
      >
        <div className="flex items-start gap-4">
          <span className="text-indigo-400 font-bold">
            {String.fromCharCode(65 + index)}
          </span>
          <span className="text-xl">{option}</span>
        </div>
      </div>
    ))}
  </div>
);
