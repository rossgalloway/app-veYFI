import React from 'react';
import localFont from 'next/font/local';
import Head from 'next/head';
import AppHeader from 'app/components/common/Header';
import Meta from 'app/components/common/Meta';
import {Tabs} from 'app/components/common/Tabs';
import {HeadingData} from 'app/components/HeadingData';
import {OverlockSettings} from 'app/components/OverlockSettings';
import {GaugeContextApp} from 'app/contexts/useGauge';
import {OptionContextApp} from 'app/contexts/useOption';
import {VotingEscrowContextApp} from 'app/contexts/useVotingEscrow';
import {YearnContextApp} from 'app/contexts/useYearn';
import {WithMom} from '@builtbymom/web3/contexts/WithMom';
import {cl} from '@builtbymom/web3/utils/cl';
import {mainnet} from '@wagmi/chains';

import type {AppProps} from 'next/app';
import type {ReactElement} from 'react';
import type {Chain} from 'viem/chains';

import '../style.css';

const aeonik = localFont({
	variable: '--font-aeonik',
	display: 'swap',
	src: [
		{
			path: '../public/fonts/Aeonik-Regular.woff2',
			weight: '400',
			style: 'normal'
		},
		{
			path: '../public/fonts/Aeonik-Bold.woff2',
			weight: '700',
			style: 'normal'
		},
		{
			path: '../public/fonts/Aeonik-Black.ttf',
			weight: '900',
			style: 'normal'
		}
	]
});

function AppWrapper(props: AppProps & {supportedNetworks: Chain[]}): ReactElement {
	const {Component, pageProps} = props;
	const tabs = [
		{id: 'gauges', label: 'Manage Gauges'},
		{id: 'manage', label: 'Manage veYFI'},
		{id: 'rewards', label: 'Claim Rewards'},
		{id: 'redeem', label: 'Redeem dYFI'}
	].filter(Boolean);

	return (
		<div
			id={'app'}
			className={cl('mx-auto mb-0 flex font-aeonik w-full')}>
			<div className={'block size-full min-h-max'}>
				<AppHeader supportedNetworks={props.supportedNetworks} />
				<div className={'mx-auto my-0 w-full max-w-6xl pt-4 md:mb-0 md:!px-0'}>
					<h1 className={'w-full text-center text-8xl font-bold'}>{'veYFI'}</h1>

					<div className={'my-14 w-full'}>
						<HeadingData />
					</div>

					<div className={`w-full bg-neutral-100`}>
						<Tabs
							items={tabs}
							rightSlot={<OverlockSettings />}
						/>
						<div className={'w-full p-6'}>
							<Component
								router={props.router}
								{...pageProps}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/**** 🔵 - Yearn Finance ***************************************************************************
 ** The 'MyApp' function is a React functional component that returns a ReactElement. It is the main
 ** entry point of the application.
 **
 ** It uses the 'WithYearn' context provider to provide global state for Yearn. The 'WithYearn'
 ** component is configured with a list of supported chains and some options.
 **
 ** The 'App' component is wrapped with the 'WithYearn' component to provide it with the Yearn
 ** context.
 **
 ** The returned JSX structure is a main element with the 'WithYearn' and 'App' components.
 **************************************************************************************************/
function MyApp(props: AppProps): ReactElement {
	const supportedNetworks = [mainnet];
	return (
		<>
			<Head>
				<style
					jsx
					global>
					{`
						html {
							font-family: ${aeonik.style.fontFamily};
						}
					`}
				</style>
			</Head>
			<Meta />
			<WithMom
				supportedChains={supportedNetworks as any}
				tokenLists={['https://raw.githubusercontent.com/SmolDapp/tokenLists/main/lists/1/yearn.json']}>
				<YearnContextApp>
					<VotingEscrowContextApp>
						<GaugeContextApp>
							<OptionContextApp>
								<main className={cl('flex flex-col h-screen', aeonik.className)}>
									<main
										className={`relative mx-auto mb-0 flex min-h-screen w-full flex-col ${aeonik.variable}`}>
										<AppWrapper
											supportedNetworks={supportedNetworks}
											{...props}
										/>
									</main>
								</main>
							</OptionContextApp>
						</GaugeContextApp>
					</VotingEscrowContextApp>
				</YearnContextApp>
			</WithMom>
		</>
	);
}

export default MyApp;
