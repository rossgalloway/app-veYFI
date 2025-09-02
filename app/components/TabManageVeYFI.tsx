'use client';
import {useOption} from 'app/contexts/useOption';
import {useVotingEscrow} from 'app/contexts/useVotingEscrow';
import {toBigInt, toNormalizedBN} from '@builtbymom/web3/utils';

import {ClaimVeYFI} from './ViewClaimVeYFI';
import {EarlyExitVeYFI} from './ViewEarlyExitVeYFI';
import {ExtendLockVeYFI} from './ViewExtendLockVeYFI';
import {LockVeYFI} from './ViewLockVeYFI';
import {ModifyLockVeYFI} from './ViewModifyLockVeYFI';

import type {ReactElement} from 'react';

export function TabManageVeYFI(): ReactElement {
	const {positions} = useVotingEscrow();
	const {isOverLockingAllowed} = useOption();
	const lockData = toNormalizedBN(toBigInt(positions?.deposit?.underlyingBalance), 18);
	const hasLock = lockData && toBigInt(lockData.raw) > 0n;

	return (
		<div className={'grid gap-10'}>
			<LockVeYFI />
			<div className={hasLock ? 'grid gap-10' : 'grid gap-10 opacity-40'}>
				<div className={'h-px w-full bg-neutral-300'} />
				{isOverLockingAllowed && hasLock ? <ModifyLockVeYFI /> : <ExtendLockVeYFI />}
				<div className={'h-px w-full bg-neutral-300'} />
				<EarlyExitVeYFI />
				<div className={'h-px w-full bg-neutral-300'} />
				<ClaimVeYFI />
			</div>
		</div>
	);
}
