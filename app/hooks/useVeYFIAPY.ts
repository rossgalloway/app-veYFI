import {useEffect, useMemo, useRef, useState} from 'react';
import {VEYFI_ABI} from 'app/abi/veYFI.abi';
import {VEYFI_GAUGE_ABI} from 'app/abi/veYFIGauge.abi';
import {useYearn} from 'app/contexts/useYearn';
import {SECONDS_PER_YEAR, VE_YFI_GAUGESV1, VEYFI_CHAIN_ID} from 'app/utils';
import {useReadContract} from 'wagmi';
import {useAsyncTrigger} from '@builtbymom/web3/hooks/useAsyncTrigger';
import {toAddress, toBigInt, toNormalizedBN, zeroNormalizedBN} from '@builtbymom/web3/utils';
import {decodeAsBigInt} from '@builtbymom/web3/utils/decoder';
import {retrieveConfig} from '@builtbymom/web3/utils/wagmi';
import {getClient} from '@builtbymom/web3/utils/wagmi/utils';
import {readContracts} from '@wagmi/core';
import {VEYFI_ADDRESS, YFI_ADDRESS} from '@yearn-finance/web-lib/utils/constants';

import {useYearnTokenPrice} from './useYearnTokenPrice';

import type {TYDaemonVaults} from '@yearn-finance/web-lib/utils/schemas/yDaemonVaultsSchemas';
import type {TAddress, TNormalizedBN} from '@builtbymom/web3/types';

type TUseVeYFIAPY = {
	dYFIPrice: number;
};
function useVeYFIAPY({dYFIPrice}: TUseVeYFIAPY): number {
	const {vaults} = useYearn();
	const yfiPrice = useYearnTokenPrice({address: YFI_ADDRESS, chainID: VEYFI_CHAIN_ID});
	const {data: veYFISupply} = useReadContract({
		address: VEYFI_ADDRESS,
		abi: VEYFI_ABI,
		functionName: 'totalSupply',
		chainId: VEYFI_CHAIN_ID
	});
	const [rate, set_rate] = useState<number>(0);
	const [vaultsWithGauges, set_vaultsWithGauges] = useState<TYDaemonVaults | undefined>(undefined);
	const isRunning = useRef(false);

	useEffect(() => {
		const _vaultsWithGauges = Object.values(vaults).filter(
			({chainID, staking}) => chainID === 1 && staking.available && staking.source === 'VeYFI'
		);
		set_vaultsWithGauges(_vaultsWithGauges);
	}, [vaults]);

	useAsyncTrigger(async (): Promise<void> => {
		if (!vaultsWithGauges?.length) {
			return;
		}
		if (isRunning.current) {
			return;
		}
		isRunning.current = true;
		const publicClient = getClient(VEYFI_CHAIN_ID);
		const rangeLimit = toBigInt(process.env.RANGE_LIMIT);
		const currentBlockNumber = await publicClient.getBlockNumber();
		const from = 18373500n;

		const depositors: [{address: TAddress; gauge: TAddress; balance: TNormalizedBN}] = [] as any;
		const gaugesAddresses = vaultsWithGauges.map(({staking}) => toAddress(staking.address));
		/* 🔵 - Yearn Finance **********************************************************************
		 ** First we need to retrieve all the depositors in a gauge
		 ******************************************************************************************/
		for (let i = from; i < currentBlockNumber; i += rangeLimit) {
			const logs = await publicClient.getLogs({
				address: gaugesAddresses,
				events: [
					{
						anonymous: false,
						inputs: [
							{indexed: true, internalType: 'address', name: 'caller', type: 'address'},
							{indexed: true, internalType: 'address', name: 'owner', type: 'address'},
							{indexed: false, internalType: 'uint256', name: 'assets', type: 'uint256'},
							{indexed: false, internalType: 'uint256', name: 'shares', type: 'uint256'}
						],
						name: 'Deposit',
						type: 'event'
					}
				],
				fromBlock: i,
				toBlock: i + rangeLimit
			});
			for (const log of logs) {
				depositors.push({address: toAddress(log.args.owner), gauge: log.address, balance: zeroNormalizedBN});
			}
		}

		/* 🔵 - Yearn Finance **********************************************************************
		 ** Then, for each one of theses depositors, we need to check the current boostedBalance.
		 ******************************************************************************************/
		const allDepositorsBalances = await readContracts(retrieveConfig(), {
			contracts: depositors.map(({gauge, address}): any => ({
				address: gauge,
				abi: VEYFI_GAUGE_ABI,
				chainId: VEYFI_CHAIN_ID,
				functionName: 'boostedBalanceOf',
				args: [address]
			}))
		});
		for (let i = 0; i < depositors.length; i++) {
			depositors[i].balance = toNormalizedBN(decodeAsBigInt(allDepositorsBalances[i]), 18);
		}

		// Remove duplicates (on address and gauge)
		const seen = new Set();
		const depositorsWithoutDuplicates = depositors.filter((depositor): boolean => {
			const isDuplicate = seen.has(depositor.address + depositor.gauge);
			seen.add(depositor.address + depositor.gauge);
			return !isDuplicate;
		});

		// remove depositors with 0 balance
		const depositorsWithBalance = depositorsWithoutDuplicates.filter(
			(depositor): boolean => depositor.balance.raw > 0n
		);

		/* 🔵 - Yearn Finance **********************************************************************
		 ** Then, for each gauge we need to know the totalSupply and the rewardRate
		 ******************************************************************************************/
		const calls = [];
		for (const vault of vaultsWithGauges) {
			const gauge = toAddress(vault.staking.address);
			calls.push({address: gauge, abi: VEYFI_GAUGE_ABI, chainId: VEYFI_CHAIN_ID, functionName: 'totalSupply'});
			calls.push({address: gauge, abi: VEYFI_GAUGE_ABI, chainId: VEYFI_CHAIN_ID, functionName: 'rewardRate'});
			calls.push({address: gauge, abi: VEYFI_GAUGE_ABI, chainId: VEYFI_CHAIN_ID, functionName: 'periodFinish'});
		}
		const totalSupplyAndRewardRate = await readContracts(retrieveConfig(), {
			contracts: calls as any
		});

		/* 🔵 - Yearn Finance **********************************************************************
		 ** Then we can calculate the rate for each gauge
		 ******************************************************************************************/
		let rate = 0;
		let index = 0;
		for (const vault of vaultsWithGauges) {
			const gauge = toAddress(vault.staking.address);
			const supply = toNormalizedBN(decodeAsBigInt(totalSupplyAndRewardRate[index++]), 18);
			const initialRewardRate = decodeAsBigInt(totalSupplyAndRewardRate[index++]);
			const periodFinish = decodeAsBigInt(totalSupplyAndRewardRate[index++]);
			const {timestamp} = await publicClient.getBlock();
			if (periodFinish < timestamp) {
				continue;
			}

			let rewardScale = VE_YFI_GAUGESV1.includes(toAddress(gauge)) ? 18 : 36;
			if (toAddress(gauge) === toAddress('0x622fA41799406B120f9a40dA843D358b7b2CFEE3')) {
				rewardScale = 48;
			}
			const rewardRate = toNormalizedBN(initialRewardRate, rewardScale);

			let boosted = 0;
			for (const depositor of depositorsWithBalance) {
				if (toAddress(depositor.gauge) === toAddress(gauge)) {
					boosted += depositor.balance.normalized;
				}
			}
			if (supply.raw > 0n) {
				const newRateItem = (rewardRate.normalized * (supply.normalized - boosted)) / supply.normalized;
				rate += newRateItem;
			}
		}
		set_rate(rate);
		isRunning.current = false;
	}, [vaultsWithGauges]);

	const APY = useMemo((): number => {
		const apy =
			(rate * SECONDS_PER_YEAR * dYFIPrice) /
			Number(toNormalizedBN(toBigInt(veYFISupply), 18).normalized) /
			yfiPrice;
		return apy;
	}, [rate, dYFIPrice, yfiPrice, veYFISupply]);

	return APY;
}

export {useVeYFIAPY};
