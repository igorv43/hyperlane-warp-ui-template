import { WarpCoreFeeEstimate } from '@hyperlane-xyz/sdk';
import { ChevronIcon, FuelPumpIcon, Skeleton, useModal } from '@hyperlane-xyz/widgets';
import { Color } from '../../styles/Color';
import { TransferFeeModal } from './TransferFeeModal';

export function FeeSectionButton({
  isLoading,
  fees,
  visible,
}: {
  isLoading: boolean;
  fees: (WarpCoreFeeEstimate & { totalFees: string }) | null;
  visible: boolean;
}) {
  const { close, isOpen, open } = useModal();

  if (!visible) return null;

  return (
    <>
      <div className="mb-2 mt-2 h-2">
        {isLoading ? (
          <Skeleton className="h-4 w-72" />
        ) : fees ? (
          <button
            className="flex w-fit items-center text-xxs text-gray-400 hover:text-gray-300 [&_path]:fill-gray-400 [&_path]:hover:fill-gray-300"
            type="button"
            onClick={open}
          >
            <FuelPumpIcon width={14} height={14} color={Color.gray[400]} className="mr-1" />
            Fees: {fees.totalFees}
            <ChevronIcon direction="e" width="0.6rem" height="0.6rem" />
          </button>
        ) : null}
      </div>
      <TransferFeeModal close={close} isOpen={isOpen} isLoading={isLoading} fees={fees} />
    </>
  );
}
