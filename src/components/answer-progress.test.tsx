/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnswerProgress } from "./answer-progress";

describe("AnswerProgress", () => {
  it("shows answer count as fraction of total players", () => {
    render(<AnswerProgress answersCount={3} playersCount={5} />);
    expect(screen.getByText("Answers Submitted: 3 / 5")).toBeInTheDocument();
  });

  it("shows 'All players answered!' when all players have answered", () => {
    render(<AnswerProgress answersCount={4} playersCount={4} />);
    expect(screen.getByText("All players answered!")).toBeInTheDocument();
  });

  it("does not show 'All players answered!' when not all players have answered", () => {
    render(<AnswerProgress answersCount={2} playersCount={5} />);
    expect(
      screen.queryByText("All players answered!")
    ).not.toBeInTheDocument();
  });

  it("does not show 'All players answered!' when there are zero players", () => {
    render(<AnswerProgress answersCount={0} playersCount={0} />);
    expect(
      screen.queryByText("All players answered!")
    ).not.toBeInTheDocument();
  });
});
