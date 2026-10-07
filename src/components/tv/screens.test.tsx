/// <reference types="@testing-library/jest-dom/vitest" />
import { act, render, screen } from "@testing-library/react";
import { motion } from "framer-motion";
import { describe, expect, it } from "vitest";
import { TvQuestion } from "./question";
import { TvScreens } from "./screens";

const players = [
  { id: "p-ada", name: "Ada" },
  { id: "p-ben", name: "Ben" },
];

const question = (id: string, text: string, answered: string[]) => (
  <TvQuestion
    key={`q-${id}`}
    text={text}
    number={1}
    total={2}
    players={players}
    answeredIds={new Set(answered)}
    remaining={20}
    timeWindow={25}
  />
);

// A results screen that takes its time to leave, like the TV's reveal.
const results = (
  <motion.div key="results-1" exit={{ opacity: 0, transition: { duration: 2 } }}>
    The answer is 4
  </motion.div>
);

const answersLabels = () => screen.queryAllByText(/^Answers Submitted:/);

describe("TvScreens", () => {
  it("a new question arriving mid-reveal mounts exactly one question screen", () => {
    const { rerender } = render(
      <TvScreens questionKey="q1" question={question("q1", "What is 2 + 2?", ["p-ada"])} between={null} />,
    );
    expect(answersLabels()).toHaveLength(1);

    // Ben's answer closes question 1: its screen starts leaving as the results come in.
    act(() => rerender(<TvScreens questionKey="q1" question={null} between={results} />));
    // The host starts question 2 at once, before question 1's screen (or the reveal) has finished leaving.
    act(() =>
      rerender(<TvScreens questionKey="q2" question={question("q2", "What color is the sky?", ["p-ada"])} between={null} />),
    );

    expect(answersLabels()).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "What is 2 + 2?" })).toBeNull();
    expect(screen.getByRole("heading", { name: "What color is the sky?" })).toBeInTheDocument();
  });

  it("question 1 still leaves under the results (the hand-off), and the results under question 2", () => {
    const { rerender } = render(
      <TvScreens questionKey="q1" question={question("q1", "What is 2 + 2?", [])} between={null} />,
    );
    act(() => rerender(<TvScreens questionKey="q1" question={null} between={results} />));
    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    expect(screen.getByText("The answer is 4")).toBeInTheDocument();

    act(() =>
      rerender(<TvScreens questionKey="q2" question={question("q2", "What color is the sky?", [])} between={null} />),
    );
    expect(screen.getByText("The answer is 4")).toBeInTheDocument();
  });
});
