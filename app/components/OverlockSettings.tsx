import {Fragment, useCallback} from 'react';
import {useOption} from 'app/contexts/useOption';
import {Settings} from 'lucide-react';
import {Popover, Switch, Transition} from '@headlessui/react';

import type {ReactElement} from 'react';

export function OverlockSettings(): ReactElement {
	const {isOverLockingAllowed, set_isOverLockingAllowed} = useOption();

	const onToggle = useCallback(
		(v: boolean): void => {
			set_isOverLockingAllowed(v);
		},
		[set_isOverLockingAllowed]
	);

	return (
		<Popover className={'relative'}>
			<Popover.Button
				className={'flex size-8 items-center justify-center rounded hover:bg-neutral-200'}
				title={'Settings'}>
				<Settings size={20} />
			</Popover.Button>
			<Transition
				as={Fragment}
				enter={'transition duration-100 ease-out'}
				enterFrom={'transform scale-95 opacity-0'}
				enterTo={'transform scale-100 opacity-100'}
				leave={'transition duration-75 ease-out'}
				leaveFrom={'transform scale-100 opacity-100'}
				leaveTo={'transform scale-95 opacity-0'}>
				<Popover.Panel
					className={
						'absolute right-0 z-50 mt-2 w-80 rounded-md border border-neutral-300 bg-neutral-0 p-4 shadow-lg'
					}>
					<div className={'flex items-center justify-between'}>
						<div>
							<p className={'m-0 font-bold'}>{'Allow overLocking'}</p>
						</div>
						<div className={'flex items-center gap-2'}>
							<span
								className={`${'text-xs font-medium'} ${isOverLockingAllowed ? 'text-neutral-900' : 'text-neutral-500'}`}>
								{isOverLockingAllowed ? 'On' : 'Off'}
							</span>
							<Switch
								checked={isOverLockingAllowed}
								onChange={onToggle}
								className={({checked}) =>
									[
										'relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors outline-none',
										checked ? 'bg-primary' : 'bg-neutral-300'
									].join(' ')
								}
								aria-label={'Allow overLocking'}>
								<span
									aria-hidden
									className={[
										'block size-4 rounded-full bg-white shadow transition-transform will-change-transform',
										isOverLockingAllowed ? 'translate-x-[18px]' : 'translate-x-0.5'
									].join(' ')}
								/>
							</Switch>
						</div>
					</div>
					<p className={'mt-3 text-left text-sm text-neutral-600'}>
						{
							'Selecting this will allow you to overLock your veYFI to up to 520 weeks. Overlocking has no benefit other than as a tool to maintain max lock. You can always relock an overlocked position by reseting the lock to 208 weeks.'
						}
					</p>
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}
