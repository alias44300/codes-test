# HORRIVALS V5 audit fixes

- No generated ID/name/stat text on missing-art battle cards.
- Missing art uses a clean graphic placeholder only.
- Menu ILLUSTRATIONS now opens a card-first photo manager.
- User chooses a card, then any PNG/JPG/WebP from Android gallery; filename no longer matters.
- Options and Collection expose the same photo manager.
- Direct per-card replacement still assigns the selected image to that card automatically.
- Android system alert for rejected filenames is removed from the new flow.
- Smoke test covers menu -> illustration manager -> battle -> menu -> options.
