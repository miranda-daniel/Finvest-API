# Instrument `country` field — Design

**Date:** 2026-04-26

## Goal

Persist the country of origin for each instrument so the frontend can group holdings by geography (US stocks vs ADRs vs other).

## Context

- `country String?` already exists in the Prisma schema — no migration needed.
- TwelveData search results already return `country` as ISO 3166-1 alpha-2 (e.g. `"US"`, `"DK"`). The `InstrumentClient` already converts full country names to ISO2.
- The frontend sends instrument metadata (symbol, name, instrumentClass) when calling `addTransaction`. `country` will be added to that same payload — no extra API call needed.

## Changes

### 1. `InstrumentRepository.findOrCreate`

Add `country?: string` to the data parameter. Pass it in `create`; keep `update: {}` unchanged so existing instruments are not overwritten.

### 2. `OperationService.addTransaction`

- Add `country?: string` to the params interface.
- Pass `country` to `InstrumentRepository.findOrCreate`.
- Add `'American Depositary Receipt': 'Stock'` to `INSTRUMENT_CLASS_MAP` — currently unmapped, which would create an unknown instrument class in the DB.

### 3. GraphQL schema

- Add `country: String` (optional) to the `addTransaction` mutation input.
- Add `country: String` to the `Instrument` type so queries can return it.

### 4. GraphQL resolver (`Mutation.addTransaction`)

Pass `args.country` through to `OperationService.addTransaction`.

### 5. `InstrumentDTO` + service response mappers

- Add `country?: string` to `InstrumentDTO` in `src/types/portfolio.ts`.
- Include `country` in the mapped response objects in `operation-service.ts` and `portfolio-services.ts`.

## Decision: `country` is optional everywhere

`country` is `String?` in the schema and optional in every layer. If TwelveData doesn't return it or the frontend omits it, it stores as `null`. No hard failure.

## Out of scope

- Backfilling `country` for instruments already in the DB — can be done manually or via a future migration script if needed.
- Displaying country in the frontend — separate task.
