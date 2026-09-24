---
name: Studio and engine boundary
description: Durable architecture decision for the HeyGen-style studio and local LivePortrait renderer.
---

The user-facing studio should not claim that a LivePortrait talking-head video was generated until it has a real bridge to the Python LivePortrait process and can report progress, failure, and a downloadable output. A separate FFmpeg image-to-MP4 fallback may provide a real downloadable preview, but must not be presented as lip-sync or LivePortrait animation.

**Why:** The imported LivePortrait repository is a Gradio application with local model loading, while the HeyGen-style product needs a separate project-oriented web experience. Pretending that the frontend's queue state is a completed render would hide model, CPU, and provider failures.

**How to apply:** Keep draft and queued states explicit in the studio. Renderer integrations must return a real output path or a visible error. Label the current FFmpeg fallback as a local MP4 preview until the missing Python LivePortrait source and its model/runtime bridge are restored.

OpenAI narration may be rate-limited or unavailable even when the secret exists. Multi-scene renders should still complete with the script burned in as captions and report that fallback to the user instead of failing the whole video.