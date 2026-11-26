# Product

> Inferred from the project README and the redesign brief ("clean, fresh, natural"); not from a stakeholder interview. Revise freely.

## What it is

A local review desk for Counter-Strike 2 match integrity. An operator uploads a `.dem` replay or `.parquet` pre-extracted match dataset; the backend parses/loads it, scores every player in 256-tick windows with a calibrated XGBoost model, and stores a report. The UI lets the operator find which players crossed the threshold, see when in the match it happened, and read the supporting evidence.

## Who uses it

Tournament admins, anti-cheat reviewers, and the researchers building the model. They sit at a desk, often for long sessions, comparing numbers across players and matches. They know CS2 and know what a SteamID64 is; they do not need the UI to explain the game.

## What success looks like

- Within seconds of opening a report, the reviewer knows who is flagged, by how much, and where to look next.
- Nothing on screen is invented. Every number comes from the API; model facts come from the project's evaluation docs.
- The tool reads as decision support, not a ban hammer. Flags invite review; they are not verdicts.

## Surface mode

Operate (dashboard / review tool). Clarity, density, and consistency outrank expression.

## Tone

Plain, specific, calm. Name things the way a reviewer would ("Flagged windows", "Threshold 0.61"), not marketing or "tactical" jargon.
