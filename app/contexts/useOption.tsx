import React, {createContext, memo, useCallback, useContext, useState} from 'react';
import {VEYFI_DYFI_ABI} from 'app/abi/veYFIdYFI.abi';
import {VEYFI_OPTIONS_ABI} from 'app/abi/veYFIOptions.abi';
import {useYearnTokenPrice} from 'app/hooks/useYearnTokenPrice';
import {VEYFI_CHAIN_ID, VEYFI_DYFI_ADDRESS, VEYFI_OPTIONS_ADDRESS} from 'app/utils';
import {useWeb3} from '@builtbymom/web3/contexts/useWeb3';
import {useAsyncTrigger} from '@builtbymom/web3/hooks/useAsyncTrigger';
import {toNormalizedBN, zeroNormalizedBN} from '@builtbymom/web3/utils';
import {BIG_ZERO, YFI_ADDRESS} from '@builtbymom/web3/utils/constants';
import {retrieveConfig} from '@builtbymom/web3/utils/wagmi';
import {useDeepCompareMemo, useLocalStorageValue} from '@react-hookz/web';
import {readContract} from '@wagmi/core';

import type {ReactElement} from 'react';
import type {TNormalizedBN} from '@builtbymom/web3/types';

export type TOptionContext = {
	getRequiredEth: (amount: bigint) => Promise<bigint>;
	dYFIPrice: number;
	position: TNormalizedBN;
	discount: TNormalizedBN;
	refresh: () => void;
	isOverLockingAllowed: boolean;
	set_isOverLockingAllowed: (v: boolean) => void;
};

const defaultProps: TOptionContext = {
	getRequiredEth: async (): Promise<bigint> => BIG_ZERO,
	dYFIPrice: 0,
	discount: zeroNormalizedBN,
	position: zeroNormalizedBN,
	refresh: (): void => undefined,
	isOverLockingAllowed: false,
	set_isOverLockingAllowed: (): void => undefined
};

const OptionContext = createContext<TOptionContext>(defaultProps);
export const OptionContextApp = memo(function OptionContextApp({children}: {children: ReactElement}): ReactElement {
	const {address: userAddress} = useWeb3();
	const [dYFIPrice, set_dYFIPrice] = useState<number>(0);
	const [position, set_position] = useState<TNormalizedBN>(zeroNormalizedBN);
	const [discount, set_discount] = useState<TNormalizedBN>(zeroNormalizedBN);
	const yfiPrice = useYearnTokenPrice({address: YFI_ADDRESS, chainID: VEYFI_CHAIN_ID});
	const {value: isOverLockingAllowed, set: set_isOverLockingAllowedStorage} = useLocalStorageValue<boolean>(
		'yearn.fi/allow-overlock',
		{defaultValue: false}
	);
	const set_isOverLockingAllowed = useCallback(
		(v: boolean): void => {
			if (typeof set_isOverLockingAllowedStorage === 'function') {
				set_isOverLockingAllowedStorage(v);
			}
		},
		[set_isOverLockingAllowedStorage]
	);

	const getRequiredEth = useCallback(async (amount: bigint): Promise<bigint> => {
		try {
			const result = await readContract(retrieveConfig(), {
				address: VEYFI_OPTIONS_ADDRESS,
				abi: VEYFI_OPTIONS_ABI,
				functionName: 'eth_required',
				args: [amount],
				chainId: VEYFI_CHAIN_ID
			});
			return result;
		} catch (error) {
			return BIG_ZERO;
		}
	}, []);

	const refreshPrice = useAsyncTrigger(async (): Promise<void> => {
		const discountRaw = await readContract(retrieveConfig(), {
			address: VEYFI_OPTIONS_ADDRESS,
			abi: VEYFI_OPTIONS_ABI,
			functionName: 'discount',
			chainId: VEYFI_CHAIN_ID
		});
		const discount = toNormalizedBN(discountRaw, 18);
		const dYFIPrice = yfiPrice * Number(discount?.normalized || 0);
		set_dYFIPrice(dYFIPrice);
		set_discount(discount);
	}, [yfiPrice]);

	const refreshPositions = useAsyncTrigger(async (): Promise<void> => {
		if (!userAddress) {
			return;
		}

		const dYFIBalance = await readContract(retrieveConfig(), {
			address: VEYFI_DYFI_ADDRESS,
			abi: VEYFI_DYFI_ABI,
			functionName: 'balanceOf',
			args: [userAddress],
			chainId: VEYFI_CHAIN_ID
		});
		set_position(toNormalizedBN(dYFIBalance, 18));
	}, [userAddress]);

	const refresh = useCallback(async (): Promise<void> => {
		refreshPrice();
		refreshPositions();
	}, [refreshPrice, refreshPositions]);

	const contextValue = useDeepCompareMemo(
		(): TOptionContext => ({
			getRequiredEth,
			dYFIPrice,
			position,
			discount,
			refresh,
			isOverLockingAllowed: isOverLockingAllowed ?? false,
			set_isOverLockingAllowed
		}),
		[getRequiredEth, dYFIPrice, position, discount, refresh, isOverLockingAllowed, set_isOverLockingAllowed]
	);

	return <OptionContext.Provider value={contextValue}>{children}</OptionContext.Provider>;
});

export const useOption = (): TOptionContext => useContext(OptionContext);
