import {useOption} from 'app/contexts/useOption';
import {useVotingEscrow} from 'app/contexts/useVotingEscrow';
import {toBigInt, toNormalizedBN} from '@builtbymom/web3/utils';
import {getTimeUntil, toWeeks} from '@yearn-finance/web-lib/utils/time';

import {ClaimVeYFI} from './ViewClaimVeYFI';
import {EarlyExitVeYFI} from './ViewEarlyExitVeYFI';
import {ExtendLockVeYFI} from './ViewExtendLockVeYFI';
import {LockVeYFI} from './ViewLockVeYFI';
import {ModifyLockVeYFI} from './ViewModifyLockVeYFI';

import type {ReactElement} from 'react';

export function TabManageVeYFI(): ReactElement {
	const {positions} = useVotingEscrow();
	const {isOverLockingAllowed} = useOption();
	const hasLock = toNormalizedBN(toBigInt(positions?.deposit?.underlyingBalance), 18);
	const timeUntilUnlock = positions?.unlockTime ? getTimeUntil(positions?.unlockTime) : undefined;
	const weeksToUnlock = toWeeks(timeUntilUnlock);

	return (
		<div className={'grid gap-10'}>
			<LockVeYFI />
			<div className={hasLock && weeksToUnlock >= 0 ? 'grid gap-10' : 'grid gap-10 opacity-40'}>
				<div className={'h-px w-full bg-neutral-300'} />
				{isOverLockingAllowed ? <ModifyLockVeYFI /> : <ExtendLockVeYFI />}
				<div className={'h-px w-full bg-neutral-300'} />
				<EarlyExitVeYFI />
				<div className={'h-px w-full bg-neutral-300'} />
				<ClaimVeYFI />
			</div>
		</div>
	);
}
