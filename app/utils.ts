import {isAddress} from 'viem';
import {isZero, toAddress, toBigInt} from '@builtbymom/web3/utils';
import {allowanceKey} from '@yearn-finance/web-lib/utils/helpers';
import {roundToWeek, toSeconds, YEAR} from '@yearn-finance/web-lib/utils/time';

import type {TMilliseconds, TSeconds, TWeeks} from '@yearn-finance/web-lib/utils/time';
import type {TAddress, TDict} from '@builtbymom/web3/types';

export const MAX_LOCK: TSeconds = toSeconds(roundToWeek(YEAR * 4));
export const VEYFI_CHAIN_ID = 1;
export const VEYFI_REGISTRY_ADDRESS: TAddress = toAddress(''); // TODO: update once deployed
export const VEYFI_OPTIONS_ADDRESS = toAddress('0x4707C855323545223fA2bA4150A83950F6F53b6E');
export const VEYFI_DYFI_ADDRESS = toAddress('0x41252E8691e964f7DE35156B68493bAb6797a275');
export const VEYFI_ADDRESS = toAddress('0x90c1f9220d90d3966FbeE24045EDd73E1d588aD5');
export const VEYFI_POSITION_HELPER_ADDRESS = toAddress('0x5A70cD937bA3Daec8188E937E243fFa43d6ECbe8');
export const VEYFI_YFI_REWARD_POOL = toAddress('0xb287a1964AEE422911c7b8409f5E5A273c1412fA');
export const VEYFI_DYFI_REWARD_POOL = toAddress('0x2391Fc8f5E417526338F5aa3968b1851C16D894E');

export const SNAPSHOT_DELEGATE_REGISTRY_ADDRESS = toAddress('0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446');
export const YEARN_SNAPSHOT_SPACE = 'veyfi.eth';

export const SECONDS_PER_YEAR = 31556952;
export const MAX_LOCK_TIME: TWeeks = 208;
export const OVERLOCK_TIME: TWeeks = 519;
export const MIN_LOCK_TIME: TWeeks = 1;
export const MIN_LOCK_AMOUNT: TWeeks = 1;

export const VE_YFI_GAUGESV1 = [
	toAddress('0x7Fd8Af959B54A677a1D8F92265Bd0714274C56a3'), // YFI/ETH yVault
	toAddress('0x28da6dE3e804bDdF0aD237CFA6048f2930D0b4Dc'), // dYFI/ETH yVault
	toAddress('0x107717C98C8125A94D3d2Cc82b86a1b705f3A27C'), // yCRV/CRV yVault
	toAddress('0x81d93531720d86f0491DeE7D03f30b3b5aC24e59'), // yETH/ETH yVault
	toAddress('0x6130E6cD924a40b24703407F246966D7435D4998') // yPrisma/Prisma yVault
];
export const VE_YFI_GAUGESV2 = [
	toAddress('0x622fA41799406B120f9a40dA843D358b7b2CFEE3'), // yvUSDC-1
	toAddress('0x128e72DfD8b00cbF9d12cB75E846AC87B83DdFc9'), // yvDAI-1
	toAddress('0x5943F7090282Eb66575662EADf7C60a717a7cE4D'), // yvWETH-1
	toAddress('0xB61F8fff8Dd8C438E0d61C07b5536cE3d728f660'), //
	toAddress('0xf719B2d3925CC445D2Bb67FA12963265E224Fa11') //
];
export const VE_YFI_GAUGES = [...VE_YFI_GAUGESV1, ...VE_YFI_GAUGESV2];

export function getVotingPower(lockAmount: bigint, unlockTime: TMilliseconds): bigint {
	const duration = toSeconds(roundToWeek(unlockTime)) - toSeconds(Date.now());
	if (duration <= 0) {
		return 0n;
	}
	if (duration >= MAX_LOCK) {
		return lockAmount;
	}
	return (lockAmount / toBigInt(MAX_LOCK)) * toBigInt(duration);
}

export const isNumberable = (value: unknown): boolean => !isNaN(value as number);

export const isString = (value: unknown): value is string => typeof value === 'string';

export const keyBy = <T1, T2 extends keyof T1 & string>(array: T1[], key: T2): TDict<T1 | undefined> =>
	(array || []).reduce((r, x): TDict<T1> => ({...r, [x[key] as string]: x}), {});

export const sort = <T>(data: T[], by: Extract<keyof T, string>, order?: 'asc' | 'desc'): T[] => {
	const compare = (a: T, b: T): number => {
		const elementA = a[by];
		const elementB = b[by];
		if (isNumberable(elementA) && isNumberable(elementB)) {
			return order === 'desc' ? Number(elementA) - Number(elementB) : Number(elementB) - Number(elementA);
		}
		if (isString(elementA) && isString(elementB)) {
			return order === 'desc'
				? elementA.toLowerCase().localeCompare(elementB.toLowerCase())
				: elementB.toLowerCase().localeCompare(elementA.toLowerCase());
		}
		return 0;
	};

	return [...data].sort(compare);
};

export function formatDateShort(value: number): string {
	let locale = 'fr-FR';
	if (typeof navigator !== 'undefined') {
		locale = navigator.language || 'fr-FR';
	}

	return new Intl.DateTimeFormat([locale, 'en-US'], {
		year: 'numeric',
		month: 'short',
		day: '2-digit'
	}).format(value);
}

export type TValidationResponse = {
	isValid?: boolean;
	error?: string;
};

export type TValidateAllowanceProps = {
	ownerAddress: TAddress;
	tokenAddress: TAddress;
	spenderAddress: TAddress;
	chainID: number;
	allowances: TDict<bigint>;
	amount: bigint;
};

export function validateAllowance(props: TValidateAllowanceProps): TValidationResponse {
	const {tokenAddress, spenderAddress, allowances, amount, ownerAddress, chainID} = props;

	if (!tokenAddress || !spenderAddress) {
		return {isValid: false};
	}

	// TODO: return valid when is native token
	const allowance = allowances[allowanceKey(chainID, tokenAddress, spenderAddress, ownerAddress)];
	const isApproved = allowance >= amount;

	return {isValid: isApproved};
}

export type TValidateAmountProps = {
	amount: string | number;
	balance?: string | number;
	minAmountAllowed?: string | number;
	maxAmountAllowed?: string | number;
	shouldDisplayMin?: boolean;
};

export function validateAmount(props: TValidateAmountProps): TValidationResponse {
	const {amount, balance, minAmountAllowed, maxAmountAllowed, shouldDisplayMin} = props;
	const amountNumber = Number(amount);

	if (isZero(amountNumber)) {
		return {};
	}

	if (amountNumber < 0) {
		return {isValid: false, error: 'Invalid amount'};
	}

	if (maxAmountAllowed !== undefined && amountNumber > Number(maxAmountAllowed)) {
		return {isValid: false, error: 'Exceeded max amount'};
	}

	if (minAmountAllowed !== undefined && amountNumber < Number(minAmountAllowed)) {
		return {
			isValid: false,
			error: `Amount under minimum allowed ${
				shouldDisplayMin && minAmountAllowed !== undefined ? `(min ${minAmountAllowed})` : ''
			}`
		};
	}

	if (balance !== undefined && amountNumber > Number(balance)) {
		return {isValid: false, error: 'Insufficient balance'};
	}

	return {isValid: true};
}

export type TValidateNetworkProps = {
	supportedNetwork: number;
	walletNetwork?: number;
};

export type TValidateAddressProps = {
	address?: string;
};

export function validateAddress(props: TValidateAddressProps): TValidationResponse {
	const {address} = props;

	if (!address) {
		return {isValid: false};
	}

	if (!isAddress(address)) {
		return {isValid: false, error: 'Invalid Address'};
	}

	return {isValid: true};
}
