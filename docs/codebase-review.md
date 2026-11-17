# Codebase review

Reviewed on 2026-11-16. This note records the repository state observed during the review; no code was changed as part of that review.

## Repository map

- `backend/`: FastAPI API, CS2 demo parser wrapper, and a health endpoint test.
- `ml/`: CS2CD dataset download and window extraction, feature engineering, training, evaluation, and inference helpers.
- `frontend/`: React/Vite dashboard shell and API client.
- `docs/`, `README.md`, and `project_proposal.pdf`: project and architecture documentation.
- `.github/workflows/ci.yml`: backend test and frontend build jobs.

## Findings to revisit

1. **End-to-end flow is incomplete.** Upload stores a demo and returns `uploaded`; it does not parse the demo or start analysis. Match listing and analysis return fixed empty results. The frontend file input has no upload handler, and the dashboard has no match/evidence view.
2. **CS2CD labels need validation.** The proposal describes labels as imperfect and principally match-level, while `ml/dataset.py` labels individual players from metadata Steam IDs. Confirm those annotations support player-level ground truth before interpreting model results.
3. **Feature extraction can bridge gaps.** Alive ticks are filtered before computing adjacent differences, so gaps caused by death or missing ticks may be treated as consecutive observations. Windows are over the remaining alive-tick sequence and do not require contiguous ticks.
4. **Documented features/models exceed implementation.** The documentation mentions acceleration, jerk, path entropy, and anomaly detection. The current feature set contains only mean/max/std angular velocity and movement speed, and training only implements Random Forest and XGBoost classifiers.
5. **Upload handling needs hardening.** The endpoint trusts the client filename, has no size limit, can overwrite a same-named file, and does not validate the demo by parsing it before reporting success.
6. **Frontend API base URL is inconsistent.** `.env.example` specifies `http://localhost:8000/api/v1`, but backend routes use `/api/...` and `/health`; the client appends `/health`, so that example configuration points to a missing route.
7. **ML small-data edge cases.** Training does not ensure both classes are present. The split fallback can leave an empty training set on very small datasets. Single-class evaluation returns a placeholder ROC-AUC value that is not a meaningful AUC.
8. **Documentation/dependency drift.** README lists components and notebooks that are absent and implies more complete behavior than exists. Root requirements include database packages, but there is no database implementation.

## Review limits

- No files were edited and no tests/builds were run during the review.
- Git status could not be inspected because Git reported a dubious-ownership mismatch. This note does not establish whether there were pre-existing working-tree changes.
