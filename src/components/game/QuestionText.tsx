export const QuestionText = ({
  text,
  className = "text-2xl sm:text-4xl",
}: {
  text: string;
  className?: string;
}) => (
  <h1
    className={`${className} font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400`}
  >
    {text}
  </h1>
);
