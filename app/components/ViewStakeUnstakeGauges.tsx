import {useCallback, useMemo, useState} from 'react';
import Link from 'next/link';
import {approveAndStake, stake, unstake} from 'app/actions';
import {useGauge} from 'app/contexts/useGauge';
import {useYearn} from 'app/contexts/useYearn';
import {useQueryArguments} from 'app/hooks/useVeYFIQueryArgs';
import {VEYFI_CHAIN_ID} from 'app/utils';
import {erc20Abi} from 'viem';
import {useContractRead} from 'wagmi';
import {useWeb3} from '@builtbymom/web3/contexts/useWeb3';
import {
	formatAmount,
	formatPercent,
	isZero,
	toAddress,
	toBigInt,
	toNormalizedBN,
	truncateHex,
	zeroNormalizedBN
} from '@builtbymom/web3/utils';
import {defaultTxStatus} from '@builtbymom/web3/utils/wagmi';
import {Button} from '@yearn-finance/web-lib/components/Button';
import {SearchBar} from '@yearn-finance/web-lib/components/SearchBar';
import {IconLinkOut} from '@yearn-finance/web-lib/icons/IconLinkOut';

import {ImageWithFallback} from './common/ImageWithFallback';
import {Table} from './common/Table';

import type {ReactElement} from 'react';
import type {TAddress, TNormalizedBN} from '@builtbymom/web3/types';

type TGaugeData = {
	gaugeAddress: TAddress;
	vaultAddress: TAddress;
	decimals: number;
	vaultIcon: string;
	vaultName: string;
	vaultApy: number;
	vaultVersion: 2 | 3;
	vaultDeposited: TNormalizedBN;
	gaugeAPY: number;
	gaugeBoost: number;
	gaugeStaked: TNormalizedBN;
	actions: undefined;
};

function StakeUnstakeButtons({vaultAddress, gaugeAddress, vaultDeposited, gaugeStaked}: TGaugeData): ReactElement {
	const {provider, address, isActive} = useWeb3();
	const {refresh: refreshGauges} = useGauge();
	const {onRefresh: refreshBalances} = useYearn();
	const [approveAndStakeStatus, set_approveAndStakeStatus] = useState(defaultTxStatus);
	const [stakeStatus, set_stakeStatus] = useState(defaultTxStatus);
	const [unstakeStatus, set_unstakeStatus] = useState(defaultTxStatus);
	const userAddress = address as TAddress;
	const refreshData = useCallback(
		(): unknown => Promise.all([refreshGauges(), refreshBalances()]),
		[refreshGauges, refreshBalances]
	);

	const {data: allowance, refetch: refreshAllowances} = useContractRead({
		address: vaultAddress,
		abi: erc20Abi,
		chainId: VEYFI_CHAIN_ID,
		functionName: 'allowance',
		args: [toAddress(address), gaugeAddress]
	});

	const isApproved = useMemo((): boolean => {
		return toBigInt(allowance) >= toBigInt(vaultDeposited?.raw);
	}, [allowance, vaultDeposited]);

	const onApproveAndStake = useCallback(
		async (vaultAddress: TAddress, gaugeAddress: TAddress, amount: bigint): Promise<void> => {
			const response = await approveAndStake({
				connector: provider,
				chainID: VEYFI_CHAIN_ID,
				contractAddress: gaugeAddress,
				vaultAddress,
				amount,
				statusHandler: set_approveAndStakeStatus
			});

			if (response.isSuccessful) {
				await Promise.all([refreshData(), refreshAllowances()]);
			}
		},
		[provider, refreshAllowances, refreshData]
	);

	const onStake = useCallback(
		async (gaugeAddress: TAddress, amount: bigint): Promise<void> => {
			const response = await stake({
				connector: provider,
				chainID: VEYFI_CHAIN_ID,
				contractAddress: gaugeAddress,
				amount,
				statusHandler: set_stakeStatus
			});

			if (response.isSuccessful) {
				await refreshData();
			}
		},
		[provider, refreshData]
	);

	const onUnstake = useCallback(
		async (gaugeAddress: TAddress, amount: bigint): Promise<void> => {
			const response = await unstake({
				connector: provider,
				chainID: VEYFI_CHAIN_ID,
				contractAddress: gaugeAddress,
				accountAddress: userAddress,
				amount,
				statusHandler: set_unstakeStatus
			});

			if (response.isSuccessful) {
				await refreshData();
			}
		},
		[provider, refreshData, userAddress]
	);

	return (
		<div className={'flex flex-row justify-center space-x-2 md:justify-end'}>
			<Button
				variant={'outlined'}
				className={'h-8 w-full text-xs md:w-24'}
				onClick={async (): Promise<void> => onUnstake(gaugeAddress, toBigInt(gaugeStaked.raw))}
				isDisabled={!isActive || toBigInt(gaugeStaked.raw) == 0n}
				isBusy={unstakeStatus.pending}>
				{'Unstake'}
			</Button>
			{!isApproved && (
				<Button
					className={'h-8 w-full text-xs md:w-24'}
					onClick={async (): Promise<void> =>
						onApproveAndStake(vaultAddress, gaugeAddress, toBigInt(vaultDeposited?.raw))
					}
					isDisabled={!isActive || toBigInt(vaultDeposited?.raw) == 0n}
					isBusy={approveAndStakeStatus.pending}>
					{'Approve'}
				</Button>
			)}
			{isApproved && (
				<Button
					className={'h-8 w-full text-xs md:w-24'}
					onClick={async (): Promise<void> => onStake(gaugeAddress, toBigInt(vaultDeposited?.raw))}
					isDisabled={!isActive || toBigInt(vaultDeposited?.raw) == 0n}
					isBusy={stakeStatus.pending}>
					{'Stake'}
				</Button>
			)}
		</div>
	);
}

export function StakeUnstakeGauges(): ReactElement {
	const {gaugesMap, userPositionInGauge} = useGauge();
	const {vaults} = useYearn();
	const {getBalance} = useYearn();
	const [isLoadingGauges, set_isLoadingGauges] = useState(true);
	const {search, onSearch} = useQueryArguments();

	const gaugesData = useMemo((): TGaugeData[] => {
		if (!vaults || Object.values(vaults).length === 0 || !gaugesMap || Object.values(gaugesMap).length === 0) {
			return [];
		}

		const data: TGaugeData[] = [];
		for (const gauge of Object.values(gaugesMap)) {
			const vault = vaults[toAddress(gauge?.vaultAddress)];
			if (!gauge || !vault) {
				continue;
			}

			const vaultBalance = getBalance({address: vault.address, chainID: vault.chainID});
			const boost = Number(userPositionInGauge[gauge.address]?.boost || 1);
			const APYFor10xBoost = vault.apr.extra.stakingRewardsAPR * 100;
			const vaultMonthlyAPY = vault.apr.points.monthAgo;
			const vaultWeeklyAPY = vault.apr.points.weekAgo;
			data.push({
				gaugeAddress: gauge.address,
				vaultAddress: vault.address,
				decimals: gauge.decimals,
				vaultIcon: `${process.env.BASE_YEARN_ASSETS_URI}/1/${vault.token.address}/logo-128.png`,
				vaultName: vault?.name ?? `Vault ${truncateHex(vault.address, 4)}`,
				vaultApy: isZero(vaultMonthlyAPY) ? vaultWeeklyAPY : vaultMonthlyAPY,
				vaultDeposited: vaultBalance,
				vaultVersion: vault.version.startsWith('3') ? 3 : 2,
				gaugeAPY: APYFor10xBoost,
				gaugeBoost: boost,
				gaugeStaked: userPositionInGauge[gauge.address]?.deposit ?? zeroNormalizedBN,
				actions: undefined
			});
		}
		set_isLoadingGauges(false);
		return data;
	}, [vaults, gaugesMap, getBalance, userPositionInGauge]);

	const searchedGaugesData = useMemo((): TGaugeData[] => {
		if (!search) {
			return gaugesData;
		}
		return gaugesData.filter((gauge: TGaugeData): boolean => {
			const lowercaseSearch = search.toLowerCase();
			const allSearchWords = lowercaseSearch.split(' ');
			const currentVaultInfo = `${gauge.vaultName} ${gauge.gaugeAddress} ${gauge.vaultAddress}`
				.replaceAll('-', ' ')
				.replaceAll('+', ' ')
				.toLowerCase()
				.split(' ');
			return allSearchWords.every((word): boolean => currentVaultInfo.some((v): boolean => v.startsWith(word)));
		});
	}, [gaugesData, search]);

	return (
		<div className={'col-span-2 grid w-full'}>
			<div className={'flex flex-col gap-4'}>
				<h2 className={'m-0 text-2xl font-bold'}>{'Stake/Unstake'}</h2>
				<div className={'text-neutral-600'}>
					<p className={'w-2/3 whitespace-break-spaces'}>
						{
							'To earn rewards deposit into the Yearn Vault you want to vote for, and then stake that Vault token into its gauge below.\n'
						}
						<i className={'text-sm'}>
							{'e.g yETH into curve-yETH and then stake curve-yETH into its gauge.'}
						</i>
					</p>
				</div>
				<div>
					<p className={'text-neutral-600'}>{'Search'}</p>
					<SearchBar
						searchPlaceholder={'WETH yVault'}
						searchValue={search || ''}
						onSearch={onSearch}
					/>
				</div>
			</div>
			<div className={'relative -left-6 mt-10 w-[calc(100%+48px)]'}>
				<Table
					metadata={[
						{
							key: 'vaultName',
							label: 'Asset',
							columnSpan: 3,
							sortable: true,
							fullWidth: true,
							className: 'my-4 md:my-0',
							transform: ({vaultIcon, vaultName}): ReactElement => {
								return (
									<div className={'flex flex-row items-center space-x-4 md:space-x-6'}>
										<div className={'flex size-8 min-h-[32px] min-w-[32px] rounded-full'}>
											<ImageWithFallback
												alt={vaultName}
												width={32}
												height={32}
												src={vaultIcon}
											/>
										</div>
										<p>{vaultName}</p>
									</div>
								);
							}
						},
						{
							key: 'vaultApy',
							label: 'Vault APY',
							sortable: true,
							format: ({vaultApy}): string => formatPercent(vaultApy * 100, 2, 2, 500)
						},
						{
							key: 'vaultDeposited',
							label: 'Deposited in vault',
							columnSpan: 2,
							className: 'mr-0 md:mr-4',
							sortable: true,
							isDisabled: ({vaultDeposited}): boolean => toBigInt(vaultDeposited?.raw) === 0n,
							format: ({vaultDeposited}): string => formatAmount(vaultDeposited?.normalized || 0, 2, 6)
						},
						{
							key: 'gaugeAPY',
							label: 'Gauge APY',
							columnSpan: 2,
							sortable: true,
							className: 'whitespace-break text-right',
							transform: ({gaugeAPY}): ReactElement => (
								<div className={'font-number flex flex-col'}>
									<p className={'font-bold'}>
										{`${formatAmount(gaugeAPY / 10, 2, 2)}% → ${formatAmount(gaugeAPY, 2, 2)}%`}
									</p>
								</div>
							)
						},
						{
							key: 'gaugeStaked',
							label: 'Staked in Gauge',
							className: 'mr-0 md:mr-10',
							columnSpan: 2,
							sortable: true,
							isDisabled: ({gaugeStaked}): boolean => toBigInt(gaugeStaked?.raw) === 0n,
							format: ({gaugeStaked, ...a}): string => {
								if (
									toAddress(a.gaugeAddress) ===
									toAddress('0x622fA41799406B120f9a40dA843D358b7b2CFEE3')
								) {
									const staked = toNormalizedBN(gaugeStaked?.raw, 6);
									return formatAmount(staked?.normalized || 0, 2, 6);
								}
								return formatAmount(gaugeStaked?.normalized || 0, 2, 6);
							}
						},

						{
							key: 'gaugeBoost',
							label: 'Boost',
							className: 'mr-0 md:mr-10',
							columnSpan: 1,
							sortable: true,
							isDisabled: ({gaugeStaked}): boolean => toBigInt(gaugeStaked?.raw) === 0n,
							transform: ({gaugeBoost, gaugeStaked}): ReactElement => {
								if (toBigInt(gaugeStaked?.raw) === 0n) {
									return <p>{'N/A'}</p>;
								}
								return <p>{`${gaugeBoost.toFixed(2)}x`}</p>;
							}
						},

						{
							key: 'actions',
							label: '',
							columnSpan: 2,
							className: 'my-4 md:my-0',
							fullWidth: true,
							transform: (props): ReactElement => {
								if (
									toBigInt(props?.vaultDeposited?.raw) === 0n &&
									toBigInt(props?.gaugeStaked.raw) === 0n
								) {
									return (
										<Link
											target={'_blank'}
											rel={'noreferrer'}
											href={`${process.env.YEARN_BASE_URI}/${props.vaultVersion === 3 ? 'v3' : 'vaults'}/${VEYFI_CHAIN_ID}/${props.vaultAddress}`}>
											<Button className={'h-8 w-full cursor-alias text-xs'}>
												{'Deposit in vault'}
												<IconLinkOut className={'ml-2 size-4'} />
											</Button>
										</Link>
									);
								}
								return <StakeUnstakeButtons {...props} />;
							}
						}
					]}
					isLoading={isLoadingGauges}
					data={searchedGaugesData}
					columns={13}
					initialSortBy={'gaugeAPY'}
				/>
			</div>
		</div>
	);
}
