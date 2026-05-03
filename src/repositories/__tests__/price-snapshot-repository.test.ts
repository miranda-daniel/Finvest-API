import { db } from '@config/db';
import { PriceSnapshotRepository } from '../price-snapshot-repository';

describe('PriceSnapshotRepository', () => {
  let instrumentId: number;

  beforeAll(async () => {
    const cls = await db.instrumentClass.upsert({
      where: { name: 'Stock' },
      update: {},
      create: { name: 'Stock' },
    });
    const instrument = await db.instrument.create({
      data: {
        symbol: '__TEST_SNAP__',
        name: 'Test Snapshot Instrument',
        exchange: 'NYSE',
        country: 'US',
        instrumentClassId: cls.id,
      },
    });
    instrumentId = instrument.id;
  });

  afterAll(async () => {
    await db.priceSnapshot.deleteMany({ where: { instrumentId } });
    await db.instrument.delete({ where: { id: instrumentId } });
  });

  it('returns null when no snapshots exist', async () => {
    const result = await PriceSnapshotRepository.findLatestDateByInstrumentId(instrumentId);
    expect(result).toBeNull();
  });

  it('upsertMany inserts snapshots and findLatestDate returns newest', async () => {
    await PriceSnapshotRepository.upsertMany([
      { instrumentId, date: new Date('2026-01-01'), closePrice: 100 },
      { instrumentId, date: new Date('2026-01-03'), closePrice: 105 },
      { instrumentId, date: new Date('2026-01-02'), closePrice: 102 },
    ]);

    const latest = await PriceSnapshotRepository.findLatestDateByInstrumentId(instrumentId);
    expect(latest?.date.toISOString().slice(0, 10)).toBe('2026-01-03');
  });

  it('upsertMany updates existing rows without creating duplicates', async () => {
    await PriceSnapshotRepository.upsertMany([
      { instrumentId, date: new Date('2026-01-01'), closePrice: 999 },
    ]);

    const rows = await db.priceSnapshot.findMany({
      where: { instrumentId, date: new Date('2026-01-01') },
    });
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].closePrice)).toBe(999);
  });

  it('findByInstrumentIdsAndDateRange returns snapshots within range', async () => {
    const results = await PriceSnapshotRepository.findByInstrumentIdsAndDateRange(
      [instrumentId],
      new Date('2026-01-01'),
      new Date('2026-01-02'),
    );
    expect(results).toHaveLength(2);
    expect(results[0].date.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(results[1].date.toISOString().slice(0, 10)).toBe('2026-01-02');
  });
});
