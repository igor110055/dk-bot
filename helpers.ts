import * as _ from 'lodash';
import { v1 } from 'uuid';
import {
    DirectionType,
    Buy,
    Sell,
    OrderTypeType,
    OrderStatusType,
    OrderType,
    SymbolType,
    PairSymbolType,
    ETH
} from './types';

export const getLatestPrice = async ({
    client,
    pairSymbol,
    direction
}: {
    client: any;
    pairSymbol: PairSymbolType;
    direction: DirectionType;
}): Promise<number> => {
    console.log(`[GET LATEST PRICE...]`);

    let result = 0;
    try {
        const { data } = await client.bookTicker(pairSymbol);
        if (direction === Buy) {
            console.log(`Latest price is: ${data.bidPrice}\n`);
            result = parseFloat(data.bidPrice);
        } else if (direction === Sell) {
            console.log(`Latest price is: ${data.askPrice}\n`);
            result = parseFloat(data.askPrice);
        } else {
            throw Error('No direction found');
        }
    } catch (e) {
        console.log(e);
    } finally {
        return result;
    }
};

export const placeMarketOrder = async ({
    client,
    pairSymbol,
    direction,
    orderType,
    quantity
}: {
    client: any;
    pairSymbol: PairSymbolType;
    direction: DirectionType;
    orderType: OrderTypeType;
    quantity: number;
}): Promise<OrderType | undefined> => {
    console.log(`[PLACE MARKET ORDER...]`);
    try {
        const { data } = await client.newMarginOrder(pairSymbol, direction, orderType, {
            quantity,
            newClientOrderId: v1(),
            newOrderRespType: 'FULL'
        });

        console.log(
            `Placing ${quantity} of ${pairSymbol}, price${data.price}, orderId: ${data.orderId}\n`
        );
        return data;
    } catch (e) {
        console.log(
            `[placeMarketOrder] Error while placing order: ${JSON.stringify(
                (e as any)?.response?.data?.msg,
                null,
                4
            )}`
        );
    }
};

export const placeLimitOrder = async ({
    client,
    pairSymbol,
    direction,
    orderType,
    quantity,
    price
}: {
    client: any;
    pairSymbol: PairSymbolType;
    direction: DirectionType;
    orderType: OrderTypeType;
    quantity: number;
    price: number;
}): Promise<OrderType | undefined> => {
    console.log(`[PLACE LIMIT ORDER...]`);
    try {
        const { data } = await client.newMarginOrder(pairSymbol, direction, orderType, {
            quantity,
            price,
            newClientOrderId: v1(),
            newOrderRespType: 'FULL',
            timeInForce: 'GTC'
        });

        console.log(
            `Placing ${quantity} of ${pairSymbol}, price:${price}, orderId: ${data.orderId}\n`
        );
        return data;
    } catch (e) {
        console.log(
            `[placeLimitOrder] Error while placing order: ${JSON.stringify(
                (e as any)?.response?.data?.msg,
                null,
                4
            )}`
        );
    }
};

export const getOrdersByStatus = async ({
    client,
    statuses,
    pairSymbol
}: {
    client: any;
    statuses: OrderStatusType[];
    pairSymbol: PairSymbolType;
}): Promise<OrderType[]> => {
    let result: OrderType[] = [];

    try {
        const { data } = await client.marginAllOrders(pairSymbol);

        result = _.filter(data, (order: OrderType) => {
            return statuses.includes(order.status);
        });
    } catch (e) {
        console.log(
            `[getOrdersByStatus] Error while getting orders: ${JSON.stringify(
                (e as any)?.response?.data?.msg,
                null,
                4
            )}`
        );
    } finally {
        return result;
    }
};

export const getOrdersById = async ({
    client,
    orderId,
    pairSymbol
}: {
    client: any;
    orderId: number;
    pairSymbol: PairSymbolType;
}): Promise<OrderType | null> => {
    let result: OrderType | null = null;

    try {
        const { data } = await client.marginAllOrders(pairSymbol);

        result = _.find(data, (order: OrderType) => {
            return order.orderId === orderId;
        });
    } catch (e) {
        console.log(
            `[getOrdersById] Error while getting orders: ${JSON.stringify(
                (e as any)?.response?.data?.msg,
                null,
                4
            )}`
        );
    } finally {
        return result;
    }
};

export const cancelOrderById = async ({
    client,
    orderId,
    pairSymbol
}: {
    client: any;
    orderId: number;
    pairSymbol: PairSymbolType;
}): Promise<OrderType | null> => {
    console.log(`[CANCEL ORDER...]`);
    let result: OrderType | null = null;

    try {
        const { data } = await client.cancelMarginOrder(pairSymbol, { orderId });
        console.log(`Order Id: ${orderId} has been cancelled\n`);
        result = data;
    } catch (e) {
        console.log(
            `Error while cancelling order: ${JSON.stringify(
                (e as any)?.response?.data?.msg,
                null,
                4
            )}`
        );
    } finally {
        return result;
    }
};

export const borrowAsset = async ({
    client,
    symbol,
    amount
}: {
    client: any;
    symbol: SymbolType;
    amount: number;
}): Promise<number | undefined> => {
    console.log(`[BORROW ASSET...]`);

    try {
        const result = await client.marginMaxBorrowable(symbol);
        const maxLimit = result?.data?.amount;

        console.log(`Max to borrow is: ${maxLimit} for ${symbol}`);
        console.log(`Requested: ${amount}`);
        if (!maxLimit) {
            throw Error('Cannot get max borrow limit!');
        }

        const accountData = await client.marginAccount();
        const asset = accountData?.data?.userAssets.find((asset: any) => asset.asset === symbol);

        if (!asset) {
            throw Error('[borrowAsset] Cannot find user asset');
        }
        const borrowedAmount = parseFloat(asset.borrowed);
        const freeAmount = parseFloat(asset.free);

        console.log(`Already borrowed: ${borrowedAmount}`);
        console.log(`Free to use: ${freeAmount}`);

        if (amount <= freeAmount) {
            console.log(`Not need to borrow extra\n`);
            return amount;
        }

        const amountToBorrow = amount > maxLimit ? maxLimit : amount;
        const { data } = await client.marginBorrow(symbol, amountToBorrow);

        console.log(`Borrowing ${amountToBorrow}\n`);
        if (!data.tranId) {
            throw Error('[borrowAsset] Possibly error when borrowing asset');
        }
        return amountToBorrow;
    } catch (e) {
        console.log(
            `[borrowAsset] Error while borrowing asset: ${JSON.stringify(
                (e as any)?.response?.data?.msg,
                null,
                4
            )}`
        );
    }
};

export const repayAsset = async ({
    client,
    symbol,
    amount
}: {
    client: any;
    symbol: SymbolType;
    amount?: number;
}): Promise<number | undefined> => {
    console.log(`[REPAY ASSET...]`);

    try {
        const accountData = await client.marginAccount();
        const asset = accountData?.data?.userAssets.find((asset: any) => asset.asset === symbol);

        if (!asset) {
            throw Error('[repayAsset] Cannot find user asset');
        }
        const freeAmount = parseFloat(asset.free);
        const borrowedAmount = parseFloat(asset.borrowed);
        const toRepayAmount = borrowedAmount < freeAmount ? borrowedAmount : freeAmount;

        console.log(`Max to repay is: ${toRepayAmount} for ${symbol}`);
        console.log(`Borrowed is: ${borrowedAmount}`);
        console.log(`Free is: ${freeAmount}`);

        if (amount) {
            console.log(`Requested is: ${amount}`);
        }

        const amountToRepay = amount && amount < toRepayAmount ? amount : toRepayAmount;

        if (Math.round(amountToRepay * 10000) / 10000 === 0) {
            console.log(`Nothing to repay\n`);
            return 0;
        }

        console.log(`Repaying ${amountToRepay}\n`);
        const { data } = await client.marginRepay(symbol, amountToRepay);

        if (!data.tranId) {
            throw Error('[repayAsset] Possibly error when repaying asset');
        }
        return amountToRepay;
    } catch (e) {
        console.log(
            `[repayAsset] Error while repaying asset: ${JSON.stringify(
                (e as any)?.response?.data?.msg,
                null,
                4
            )}`
        );
    }
};
