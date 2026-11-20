import { describe, expect, it } from 'vitest';
import { dropStaticFeesForDynamicIgp } from './warpCoreConfig';

describe('dropStaticFeesForDynamicIgp', () => {
  it('drops static interchain fees for Terra Classic origin and keeps the rest', () => {
    const options = {
      interchainFeeConstants: [
        { origin: 'terraclassic', destination: 'ethereum', amount: 1400000000, addressOrDenom: 'uluna' },
        { origin: 'terraclassic', destination: 'solanamainnet', amount: 2330000000, addressOrDenom: 'uluna' },
        { origin: 'stride', destination: 'eclipsemainnet', amount: 1, addressOrDenom: 'ustrd' },
      ],
      localFeeConstants: [
        { origin: 'terraclassic', destination: 'ethereum', amount: 283215, addressOrDenom: 'uluna' },
      ],
    };
    const result = dropStaticFeesForDynamicIgp(options as any)!;
    expect(result.interchainFeeConstants).toEqual([options.interchainFeeConstants[2]]);
    expect(result.localFeeConstants).toEqual(options.localFeeConstants);
  });

  it('returns options untouched when there are no interchain constants', () => {
    expect(dropStaticFeesForDynamicIgp({})).toEqual({});
    expect(dropStaticFeesForDynamicIgp(undefined)).toBeUndefined();
  });
});
