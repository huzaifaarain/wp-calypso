/**
 * @format
 * @jest-environment jsdom
 */

/**
 * External dependencies
 */
import React from 'react';
import { shallow } from 'enzyme';
import { identity } from 'lodash';
import { isEnabled } from 'config';

/**
 * Internal dependencies
 */
import { Checkout } from '../checkout';
import { hasPendingPayment } from 'lib/cart-values';

jest.mock( 'lib/upgrades/actions', () => ( {
	resetTransaction: jest.fn(),
} ) );
jest.mock( 'lib/signup/step-actions', () => ( {} ) );
jest.mock( 'lib/analytics', () => ( {
	tracks: {
		recordEvent: jest.fn(),
	},
} ) );
jest.mock( 'lib/analytics/ad-tracking', () => ( {
	recordViewCheckout: jest.fn(),
} ) );
jest.mock( 'lib/store-transactions', () => ( {
	hasDomainDetails: jest.fn(),
} ) );
jest.mock( 'page', () => ( {
	redirect: jest.fn(),
} ) );
jest.mock( 'lib/abtest', () => ( {
	abtest() {},
	getABTestVariation() {},
} ) );
jest.mock( 'lib/abtest/active-tests', () => ( {} ) );
jest.mock( 'lib/cart-values', () => ( {
	cartItems: {
		getAll: jest.fn(),
		hasFreeTrial: jest.fn(),
		hasGoogleApps: jest.fn(),
		hasDomainRegistration: jest.fn(),
		hasRenewalItem: jest.fn(),
		hasOnlyRenewalItems: jest.fn(),
		hasTransferProduct: jest.fn(),
	},
	hasPendingPayment: jest.fn(),
	isPaymentMethodEnabled: jest.fn(),
	paymentMethodName: jest.fn(),
	getEnabledPaymentMethods: jest.fn(),
} ) );

jest.mock( 'config', () => {
	const mock = () => 'development';
	mock.isEnabled = jest.fn();
	return mock;
} );

//jsdom doesn't properly mock scrollTo
global.scrollTo = () => {};

describe( 'Checkout', () => {
	const defaultProps = {
		cards: [],
		cart: {
			products: [],
		},
		translate: identity,
		loadTrackingTool: identity,
		recordApplePayStatus: identity,
		transaction: {
			step: {},
		},
	};

	beforeAll( () => {
		global.window = {
			scrollTo: identity,
			document: {
				documentElement: {},
			},
		};
	} );

	test( 'should render and not blow up', () => {
		const checkout = shallow( <Checkout { ...defaultProps } /> );
		expect( checkout.find( '.checkout' ) ).toHaveLength( 1 );
	} );

	test( 'should set state.cartSettled to false', () => {
		let checkout;

		checkout = shallow(
			<Checkout { ...defaultProps } cart={ { hasLoadedFromServer: false, products: [] } } />
		);
		expect( checkout.state().cartSettled ).toBe( false );

		checkout = shallow(
			<Checkout { ...defaultProps } cart={ { hasLoadedFromServer: true, products: [] } } />
		);

		expect( checkout.state().cartSettled ).toBe( false );
	} );

	test( 'should set state.cartSettled to true after cart has loaded', () => {
		const checkout = shallow(
			<Checkout { ...defaultProps } cart={ { hasLoadedFromServer: false, products: [] } } />
		);
		expect( checkout.state().cartSettled ).toBe( false );

		checkout.setProps( { cart: { hasLoadedFromServer: true, products: [] } } );
		expect( checkout.state().cartSettled ).toBe( true );
	} );

	test( 'should keep state.cartSettled as true even after cart reloads', () => {
		const checkout = shallow(
			<Checkout { ...defaultProps } cart={ { hasLoadedFromServer: false, products: [] } } />
		);
		expect( checkout.state().cartSettled ).toBe( false );

		checkout.setProps( { cart: { hasLoadedFromServer: true, products: [] } } );
		expect( checkout.state().cartSettled ).toBe( true );

		checkout.setProps( { cart: { hasLoadedFromServer: false, products: [] } } );
		expect( checkout.state().cartSettled ).toBe( true );
	} );

	test( 'checkout blocked on pending payment', () => {
		isEnabled.mockImplementation( flag => flag === 'async-payments' );
		hasPendingPayment.mockImplementation( cart => cart && cart.has_pending_payment );

		const wrapper = shallow( <Checkout { ...defaultProps } /> );

		// Need to generate a prop update in order to set cartSettled correctly.
		// cartSettled isn't derived from props on init so setting the cart above
		// does nothing.
		wrapper.setProps( {
			cart: { hasLoadedFromServer: true, products: [], has_pending_payment: true },
		} );

		expect( wrapper.find( 'Localized(PendingPaymentBlocker)' ) ).toHaveLength( 1 );
	} );
} );
