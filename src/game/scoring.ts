import type { Answer, Question, QuestionResult } from "../game.types";

export function calculateScores(
  answers: Answer[],
  question: Question,
  startTime: number
): QuestionResult["scores"] {
  if (question.questionType === "multiple-choice") {
    return calculateMultipleChoiceScores(answers, question, startTime);
  }
  return calculateNumericScores(answers, question, startTime);
}

function calculateMultipleChoiceScores(
  answers: Answer[],
  question: Question,
  startTime: number
): QuestionResult["scores"] {
  const correctAnswers = answers.filter(
    (answer) => answer.value === question.correctAnswer
  );

  // Sort by time taken
  const sortedAnswers = correctAnswers.sort(
    (a, b) => a.timestamp - startTime - (b.timestamp - startTime)
  );

  // Award points based on position
  return answers.map((answer) => {
    const isCorrect = answer.value === question.correctAnswer;
    const position =
      sortedAnswers.findIndex((a) => a.playerId === answer.playerId) + 1;
    let points = 0;

    if (isCorrect) {
      // If correct, get at least 1 point, more for being faster
      points = position <= 3 ? 5 - position : 1;
    }

    return {
      playerId: answer.playerId,
      playerName: answer.playerName,
      points,
      position: position > 0 ? position : sortedAnswers.length + 1,
      timeTaken: (answer.timestamp - startTime) / 1000,
    };
  });
}

interface NumericAnswer extends Answer {
  numericValue: number;
  difference: number;
  timeTaken: number;
  isValid: boolean;
  isExactMatch: boolean;
}

function parseNumericAnswer(
  answer: Answer,
  correctValue: number,
  startTime: number
): NumericAnswer {
  const numericValue = Number(answer.value);
  const isValid = !isNaN(numericValue) && isFinite(numericValue);
  return {
    ...answer,
    numericValue: isValid ? numericValue : NaN,
    difference: isValid ? Math.abs(numericValue - correctValue) : Infinity,
    timeTaken: (answer.timestamp - startTime) / 1000,
    isValid,
    isExactMatch: isValid && numericValue === correctValue,
  };
}

function compareNumericAnswers(a: NumericAnswer, b: NumericAnswer): number {
  if (a.isExactMatch && b.isExactMatch) {
    return a.timeTaken - b.timeTaken;
  }
  if (a.isExactMatch) return -1;
  if (b.isExactMatch) return 1;
  if (a.difference !== b.difference) {
    return a.difference - b.difference;
  }
  return a.timeTaken - b.timeTaken;
}

function isTied(a: NumericAnswer, b: NumericAnswer): boolean {
  if (a.isExactMatch && b.isExactMatch) {
    return Math.abs(a.timeTaken - b.timeTaken) < 0.1;
  }
  return (
    a.difference === b.difference &&
    Math.abs(a.timeTaken - b.timeTaken) < 0.1
  );
}

function groupByPosition(sortedAnswers: NumericAnswer[]): NumericAnswer[][] {
  return sortedAnswers.reduce<NumericAnswer[][]>((acc, answer) => {
    const lastGroup = acc[acc.length - 1];
    if (!lastGroup) {
      acc.push([answer]);
    } else if (isTied(lastGroup[0], answer)) {
      lastGroup.push(answer);
    } else {
      acc.push([answer]);
    }
    return acc;
  }, []);
}

function assignPositionPoints(
  numericAnswers: NumericAnswer[],
  positions: NumericAnswer[][]
): Map<string, number> {
  const pointsMap = new Map<string, number>();

  for (const answer of numericAnswers) {
    if (!answer.isValid) {
      pointsMap.set(answer.playerId, 0);
    }
  }

  positions.forEach((group, groupIndex) => {
    const points = groupIndex >= 3 ? 0 : 4 - groupIndex;
    group.forEach(answer => pointsMap.set(answer.playerId, points));
  });

  return pointsMap;
}

function calculateNumericScores(
  answers: Answer[],
  question: Question,
  startTime: number
): QuestionResult["scores"] {
  const correctValue = Number(question.correctAnswer);
  const numericAnswers = answers.map(a => parseNumericAnswer(a, correctValue, startTime));
  const validAnswers = numericAnswers.filter(a => a.isValid).sort(compareNumericAnswers);
  const positions = groupByPosition(validAnswers);
  const pointsMap = assignPositionPoints(numericAnswers, positions);

  return answers.map(answer => {
    const scored = numericAnswers.find(sa => sa.playerId === answer.playerId);
    const position = scored?.isValid
      ? positions.findIndex(group => group.some(a => a.playerId === answer.playerId)) + 1
      : positions.length + 1;

    return {
      playerId: answer.playerId,
      playerName: answer.playerName,
      points: pointsMap.get(answer.playerId) || 0,
      position,
      timeTaken: (answer.timestamp - startTime) / 1000,
    };
  });
} 