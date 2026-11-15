# Dynamic rule system

The recommendation engine does not use hardcoded business rules in the core application flow. Instead, it reads from a versioned rule set and applies weights in a predictable, testable way.

## Stored configuration
- colors
- events
- seasons
- lower-type compatibility
- weight values for matching logic

## Rule lifecycle
1. Draft configuration
2. Validate rules
3. Publish configuration
4. Apply to active recommendation engine
5. Track version history

## Why this matters
- no code release required for a new color or occasion tag;
- content managers can update recommendation rules with lower risk;
- the app remains flexible as the product evolves.
