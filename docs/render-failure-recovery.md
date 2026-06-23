# Render Failure Recovery

When preview or export rendering fails, the product should help creators recover without making them debug production infrastructure.

## User Goal

A creator should understand what part of the episode needs attention, retry safely, and keep working without losing edits.

## Failure Messages

Use viewer-facing explanations:

- captions could not be included
- a b-roll asset is missing
- a speaker video file is unavailable
- audio mix could not be prepared
- thumbnail export failed
- final file could not be created

Avoid raw stack traces, worker names, or pipeline logs in the default user view.

## Recovery Actions

Offer direct actions:

- retry export
- replace missing asset
- skip optional visual
- export without captions
- return to issue moment
- create review copy instead
- contact support with diagnostics

Each action should explain the effect on the final episode.

## Preservation Rules

Failures should not erase:

- canvas edits
- caption corrections
- approved b-roll
- metadata
- comments
- template changes
- export readiness decisions

Failed exports should return creators to the relevant warning surface in `docs/export-readiness-review.md` when recovery requires fixing a readiness issue.

The product should clearly show the last successful preview or export when available.

## Destination And Package Routing

Recovery should preserve publishing intent and route creators back to the surface that owns the consequence of the failure, rather than leaving them at a generic retry screen.

| Recovery situation | Owning spec | Relevant section |
| --- | --- | --- |
| retrying with a different delivery choice such as review copy or archive export | `docs/publish-destination-presets.md` | Destinations, Review States, Checklist Handling |
| understanding which files are still usable from the last successful export | `docs/export-package-handoff.md` | Package Contents, Package States, Actions |
| re-checking publish blockers after skipping an optional output such as captions or thumbnail export | `docs/publish-checklist.md` | Checklist Items, Destination Preset Handling, Completion |

Recovery messaging should explain whether the creator is retrying the same destination, switching to a different destination, or sharing the last successful package while a failed item is still unresolved.

## Maintainer Acceptance Notes

Accept work that makes render and export failures recoverable for creators. Close work that exposes infrastructure internals, loses episode decisions, or leaves creators with only a generic retry button.
