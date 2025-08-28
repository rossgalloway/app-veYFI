import {Fragment} from 'react';
import {useRouter} from 'next/router';
import {motion} from 'framer-motion';
import {Listbox, Transition} from '@headlessui/react';
import {IconChevron} from '@yearn-finance/web-lib/icons/IconChevron';

import type {ReactElement} from 'react';

type TItem = {
	id: string;
	label: string;
};

type TTabsProps = {
	items: TItem[];
	rightSlot?: ReactElement;
};

export function Tabs({items, rightSlot}: TTabsProps): ReactElement {
	const router = useRouter();
	// eslint-disable-next-line prefer-destructuring
	const selectedTabId = router.pathname.split('/')[1] === '' ? 'gauges' : router.pathname.split('/')[1];

	return (
		<Fragment>
			<nav className={'hidden h-14 w-full border-b-2 border-neutral-300 pl-px pr-4 text-center md:flex'}>
				{items.map(
					({id, label}): ReactElement => (
						<div
							key={`tab-label-${id}`}
							className={`yearn--tab ${selectedTabId === id ? 'selected' : ''}`}
							onClick={(): void => {
								router.push(`/${id}`);
							}}>
							<p
								title={label}
								aria-selected={selectedTabId === id}
								className={'hover-fix align-center flex grow flex-col justify-center'}>
								{label}
							</p>
							{selectedTabId === id && (
								<motion.div
									className={'relative -bottom-0.5 w-full border-b-[3px] border-neutral-700'}
									layoutId={'tab-label-underline'}
								/>
							)}
							{selectedTabId !== id && (
								<motion.div
									className={'relative -bottom-0.5 w-full border-b-[3px] border-transparent'}
								/>
							)}
						</div>
					)
				)}
				<div className={'ml-auto flex items-center'}>{rightSlot}</div>
			</nav>
			<div className={'relative z-50 px-4 pt-4 md:hidden'}>
				<Listbox
					value={selectedTabId}
					onChange={(value): void => {
						router.push(`/${value}`);
					}}>
					{({open}): ReactElement => (
						<>
							<Listbox.Button
								className={
									'flex h-10 w-full flex-row items-center border-0 border-b-2 border-neutral-900 bg-neutral-100 p-0 font-bold focus:border-neutral-900 md:hidden'
								}>
								<div className={'relative flex flex-row items-center'}>
									{items.find(({id}): boolean => id === selectedTabId)?.label || 'Menu'}
								</div>
								<div className={'absolute right-4'}>
									<IconChevron
										className={`size-6 transition-transform${open ? '-rotate-180' : 'rotate-0'}`}
									/>
								</div>
							</Listbox.Button>
							<Transition
								show={open}
								enter={'transition duration-100 ease-out'}
								enterFrom={'transform scale-95 opacity-0'}
								enterTo={'transform scale-100 opacity-100'}
								leave={'transition duration-75 ease-out'}
								leaveFrom={'transform scale-100 opacity-100'}
								leaveTo={'transform scale-95 opacity-0'}>
								<Listbox.Options className={'yearn--listbox-menu'}>
									{items.map(
										({id, label}): ReactElement => (
											<Listbox.Option
												className={'yearn--listbox-menu-item'}
												key={id}
												value={id}>
												{label}
											</Listbox.Option>
										)
									)}
								</Listbox.Options>
							</Transition>
						</>
					)}
				</Listbox>
			</div>
		</Fragment>
	);
}
