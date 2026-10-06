#!/bin/zsh
# Generates one 16:9 TV mock per aesthetic (same moment, same layout) for the owner to choose from.
cd "${0:A:h}/../../.."
S=~/src/skills/ai-art-assets/scripts
SCENE="A 16:9 television screen from an ADULT party trivia game show, the moment the answer is revealed. Layout: small label QUESTION 3 OF 5 top-left; the question text 'How many teeth does an adult have?' across the top; a long horizontal number line across the middle from 18 to 36 with tick labels; four player markers (round tokens with the names Alex, Priya, Jordan, Sam) sitting at their guesses 20, 28, 30 and 32; the correct answer 32 shown huge below the line with a marker on the axis; an EXACT! stamp next to Priya; a small standings strip at the bottom with the four names and scores. Everything readable from a couch. No people, no faces, no characters, no emoji, no logos. Style:"
while IFS=$'\t' read -r name style; do
  [ -f assets/art/aesthetics/$name.png ] && continue
  timeout 400 node $S/codex.mjs run --prompt "$SCENE $style" --out assets/art/aesthetics/$name.png 2>&1 | tail -1
  grep -qi "usage limit" assets/SPEND.jsonl && { echo "USAGE LIMIT"; exit 2; }
done < assets/art/aesthetics/prompts.tsv
