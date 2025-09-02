'use client';
import {useCallback, useMemo, useState} from 'react';
import {extendVeYFILockTime} from 'app/actions';
import {AmountInputWithMin} from 'app/components/common/AmountInputWithMin';
import {useOption} from 'app/contexts/useOption';
import {useVotingEscrow} from 'app/contexts/useVotingEscrow';
import {useYearn} from 'app/contexts/useYearn';
import {getVotingPower, MAX_LOCK_TIME, OVERLOCK_TIME, validateAmount, VEYFI_CHAIN_ID} from 'app/utils';
import {useWeb3} from '@builtbymom/web3/contexts/useWeb3';
import {handleInputChangeValue, toBigInt, toNormalizedBN, zeroNormalizedBN} from '@builtbymom/web3/utils';
import {defaultTxStatus} from '@builtbymom/web3/utils/wagmi';
import {AmountInput} from '@yearn-finance/web-lib/components/AmountInput';
import {Button} from '@yearn-finance/web-lib/components/Button';
import {fromWeeks, getTimeUntil, toSeconds, toTime, toWeeks} from '@yearn-finance/web-lib/utils/time';

import type {ReactElement} from 'react';
import type {TNormalizedBN} from '@builtbymom/web3/types';

export function ModifyLockVeYFI(): ReactElement {
	const [newLockTime, set_newLockTime] = useState<TNormalizedBN>(toNormalizedBN(0, 0));
	const {provider, address, isActive} = useWeb3();
	const {onRefresh: refreshBalances} = useYearn();
	const {votingEscrow, positions, refresh: refreshVotingEscrow} = useVotingEscrow();
	const {isOverLockingAllowed} = useOption();
	const hasLockedAmount = toBigInt(positions?.deposit?.underlyingBalance) > 0n;
	const willModifyLock = toBigInt(newLockTime.raw) > 0n;
	const timeUntilUnlock = positions?.unlockTime ? getTimeUntil(positions?.unlockTime) : undefined;
	const weeksToUnlock = toNormalizedBN(toWeeks(timeUntilUnlock), 0);
	const currentLockWeeks = Number(weeksToUnlock?.normalized || 0);
	const targetUnlockTime = Date.now() + fromWeeks(toTime(newLockTime.normalized));
	const [modifyLockTimeStatus, set_modifyLockTimeStatus] = useState(defaultTxStatus);

	const onTxSuccess = useCallback(async (): Promise<void> => {
		await Promise.all([refreshVotingEscrow(), refreshBalances(), set_newLockTime(toNormalizedBN(0, 0))]);
	}, [refreshBalances, refreshVotingEscrow]);

	const onModifyLockTime = useCallback(async (): Promise<void> => {
		const result = await extendVeYFILockTime({
			connector: provider,
			chainID: VEYFI_CHAIN_ID,
			contractAddress: votingEscrow?.address,
			time: toBigInt(toSeconds(targetUnlockTime)),
			statusHandler: set_modifyLockTimeStatus
		});
		if (result.isSuccessful) {
			onTxSuccess();
		}
	}, [targetUnlockTime, onTxSuccess, provider, votingEscrow?.address]);

	const votingPower = useMemo((): TNormalizedBN => {
		if (!positions?.deposit || !targetUnlockTime) {
			return zeroNormalizedBN;
		}
		return toNormalizedBN(
			willModifyLock
				? getVotingPower(positions?.deposit?.underlyingBalance, targetUnlockTime)
				: toBigInt(positions?.deposit?.balance),
			18
		);
	}, [positions?.deposit, targetUnlockTime, willModifyLock]);

	// Determine minimum and maximum allowed lock times based on current lock duration
	const minAllowedWeeks = currentLockWeeks < MAX_LOCK_TIME ? currentLockWeeks + 1 : MAX_LOCK_TIME;
	const maxAllowedWeeks = isOverLockingAllowed ? OVERLOCK_TIME : MAX_LOCK_TIME;

	const {isValid: isValidLockTime, error: lockTimeError} = validateAmount({
		amount: newLockTime.normalized,
		minAmountAllowed: minAllowedWeeks,
		maxAmountAllowed: maxAllowedWeeks
	});

	const onMinClick = useCallback((): void => {
		set_newLockTime(toNormalizedBN(minAllowedWeeks, 0));
	}, []);

	const onMaxClick = useCallback((): void => {
		set_newLockTime(toNormalizedBN(maxAllowedWeeks, 0));
	}, [maxAllowedWeeks]);

	return (
		<div className={'grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-16'}>
			<div className={'col-span-1 w-full'}>
				<h2 className={'m-0 text-2xl font-bold'}>{'Modify lock'}</h2>
				<div className={'mt-6 text-neutral-600'}>
					<p>
						{
							'Set your lock duration directly. You can increase your lock period or maintain your maximum lock.'
						}
					</p>
				</div>
			</div>

			<div className={'col-span-1 grid w-full gap-6'}>
				<div className={'mt-0 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-2'}>
					<AmountInput
						label={'Current lock period (weeks)'}
						amount={weeksToUnlock}
						disabled
					/>
					<AmountInputWithMin
						label={'New lock period (weeks)'}
						amount={newLockTime}
						onAmountChange={(v: string): void => {
							const input = handleInputChangeValue(v, 0);
							const inputValue = Number(input.normalized);

							// Apply constraints when value is set (e.g., on blur)
							// Allow empty values during editing
							if (v === '' || inputValue === 0) {
								set_newLockTime(toNormalizedBN(0, 0));
							} else if (inputValue > maxAllowedWeeks) {
								set_newLockTime(toNormalizedBN(maxAllowedWeeks, 0));
							} else if (inputValue < minAllowedWeeks) {
								set_newLockTime(toNormalizedBN(minAllowedWeeks, 0));
							} else {
								set_newLockTime(toNormalizedBN(Math.floor(toTime(v)), 0));
							}
						}}
						maxAmount={toNormalizedBN(maxAllowedWeeks, 0)}
						onMaxClick={onMaxClick}
						onMinClick={onMinClick}
						disabled={!hasLockedAmount}
						error={lockTimeError}
						legend={`Min: ${minAllowedWeeks} weeks, Max: ${maxAllowedWeeks} weeks`}
					/>
				</div>
				<div className={'grid grid-cols-1 gap-6 md:grid-cols-2 md:pb-5'}>
					<AmountInput
						label={'Total veYFI'}
						amount={votingPower}
						disabled
					/>
					<Button
						className={'w-full md:mt-7'}
						onClick={onModifyLockTime}
						isBusy={modifyLockTimeStatus.pending}
						isDisabled={
							!isActive || !isValidLockTime || modifyLockTimeStatus.pending || !votingEscrow || !address
						}>
						{'Modify'}
					</Button>
				</div>
			</div>
		</div>
	);
}
