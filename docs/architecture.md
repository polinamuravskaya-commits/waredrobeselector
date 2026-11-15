# Architecture overview

## Goals
- create a mobile-first outfit recommendation app for a teen audience;
- keep personalization configurable through data rather than code;
- support future AI enhancement without rewriting the core product.

## Core layers
1. Frontend client: mobile-first experience, quiz flow, outfit cards, and paper-doll composition.
2. API layer: user auth, catalog CRUD, recommendation requests, and admin APIs.
3. Rule engine: dynamic tag and recommendation config with rule versioning.
4. Media service: upload, crop, normalization, and image metadata extraction.
5. Data layer: user records, item catalog, accessory catalog, outfits, and config tables.

## Recommendation flow
- user answers the onboarding questionnaire;
- backend loads active rule set and filters item catalog;
- rule engine scores all candidate outfit combinations;
- API returns top outfits with justification metadata;
- client renders card view and paper-doll composition.

## AI readiness
- image processing is separated into an async service;
- AI classification output is stored as metadata, not as a critical dependency;
- if AI is unavailable, the app continues with manual tagging and threshold-based recommendation rules.
