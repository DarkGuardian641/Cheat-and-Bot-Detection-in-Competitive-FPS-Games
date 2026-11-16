# System Architecture

## Overview
High-level architecture of the FPS Cheat and Bot Detection platform.

```
[ Game Telemetry / Demos ] -> [ Backend / Demo Parser ]
                                        │
                                        ▼
                             [ Feature Extraction ]
                                        │
                                        ▼
                                [ ML Inference ]
                                        │
                                        ▼
                           [ FastAPI Results & Reports ]
                                        │
                                        ▼
                           [ React + Vite Dashboard ]
```
