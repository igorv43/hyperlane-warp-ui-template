import { IToken } from '@hyperlane-xyz/sdk';
import { ChainSearchMenuProps, ChevronIcon, PlusIcon } from '@hyperlane-xyz/widgets';
import { useField, useFormikContext } from 'formik';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { ChainLogo } from '../../components/icons/ChainLogo';
import { Color } from '../../styles/Color';
import { logger } from '../../utils/logger';
import { EVENT_NAME } from '../analytics/types';
import { trackEvent } from '../analytics/utils';
import { useAddToken } from '../tokens/hooks';
import { TransferFormValues } from '../transfer/types';
import { ChainSelectListModal } from './ChainSelectModal';
import { useChainDisplayName, useMultiProvider } from './hooks';

const USER_REJECTED_ERROR = 'User rejected';

type Props = {
  name: string;
  label: string;
  onChange?: (id: ChainName, fieldName: string) => void;
  disabled?: boolean;
  customListItemField: ChainSearchMenuProps['customListItemField'];
  token?: IToken;
};

export function ChainSelectField({
  name,
  label,
  onChange,
  disabled,
  customListItemField,
  token,
}: Props) {
  const [field, , helpers] = useField<ChainName>(name);
  const { setFieldValue } = useFormikContext<TransferFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToken, canAddAsset, isLoading } = useAddToken(token);
  const multiProvider = useMultiProvider();

  const displayName = useChainDisplayName(field.value, true);

  const handleChange = (chainName: ChainName) => {
    const chainId = multiProvider.getChainId(chainName);
    const previousChainId = multiProvider.getChainId(field.value);
    trackEvent(EVENT_NAME.CHAIN_SELECTED, {
      chainType: name,
      chainId,
      chainName,
      previousChainId,
      previousChainName: field.value,
    });
    helpers.setValue(chainName);
    // Reset other fields on chain change
    setFieldValue('recipient', '');
    setFieldValue('amount', '');
    if (onChange) onChange(chainName, name);
  };

  const onClick = () => {
    if (!disabled) setIsModalOpen(true);
  };

  const onAddToken = useCallback(async () => {
    try {
      await addToken();
    } catch (error: any) {
      const errorDetails = error.message || error.toString();
      if (!errorDetails.includes(USER_REJECTED_ERROR)) toast.error(errorDetails);
      logger.debug(error);
    }
  }, [addToken]);

  return (
    <div className="h-[4.5rem] flex-[4]">
      <button
        type="button"
        name={field.name}
        className={`${styles.base} ${disabled ? styles.disabled : styles.enabled}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="max-w-[1.4rem] sm:max-w-fit">
            <ChainLogo chainName={field.value} size={32} />
          </div>
          <div className="flex flex-col items-start gap-1">
            <label htmlFor={name} className="text-xs text-gray-400">
              {label}
            </label>
            {displayName}
          </div>
        </div>
        <ChevronIcon width={12} height={8} direction="s" color={Color.gray['400']} />
      </button>
      {canAddAsset && (
        <button
          type="button"
          className={styles.addButton}
          onClick={onAddToken}
          disabled={isLoading}
        >
          <PlusIcon height={16} width={16} /> Import token to wallet
        </button>
      )}

      <ChainSelectListModal
        isOpen={isModalOpen}
        close={() => setIsModalOpen(false)}
        onSelect={handleChange}
        customListItemField={customListItemField}
      />
    </div>
  );
}

const styles = {
  base: 'px-2 py-1.5 w-full flex items-center justify-between text-sm text-white bg-white/5 rounded-lg border border-white/10 outline-none transition-colors duration-500',
  enabled: 'hover:bg-white/10 active:scale-95 focus:border-accent-400',
  disabled: 'bg-white/[0.03] cursor-default text-gray-400',
  addButton:
    'flex text-xxs text-accent-300 hover:text-accent-200 disabled:text-gray-500 [&_path]:fill-accent-300 [&_path]:hover:fill-accent-200 [&_path]:disabled:fill-gray-500',
};
