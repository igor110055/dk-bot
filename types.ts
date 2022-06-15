export const ETH = 'ETH';
export const BTC = 'BTC';
export type SymbolType = typeof ETH | typeof BTC;

export const ETHBUSD = 'ETHBUSD';
export const BTCBUSD = 'BTCBUSD';
export type PairSymbolType = typeof ETHBUSD | typeof BTCBUSD;

export const Buy = 'BUY';
export const Sell = 'SELL';
export type DirectionType = typeof Buy | typeof Sell;

export const Limit = 'LIMIT';
export const Market = 'MARKET';
export type OrderTypeType = typeof Limit | typeof Market;

export const New = 'NEW';
export const Filled = 'FILLED';
export const PartiallyFilled = 'PARTIALLY_FILLED';
export const Canceled = 'CANCELED';
export const PendingCancel = 'PENDING_CANCEL';
export const Rejected = 'REJECTED';
export const Expired = 'EXPIRED';
export type OrderStatusType =
    | typeof New
    | typeof Filled
    | typeof PartiallyFilled
    | typeof Canceled
    | typeof PendingCancel
    | typeof Rejected
    | typeof Expired;

export type OrderType = {
    pairSymbol: PairSymbolType;
    orderId: number;
    clientOrderId: string;
    price: string;
    origQty: string;
    executedQty: string;
    status: OrderStatusType;
    type: OrderTypeType;
    side: DirectionType;
    cummulativeQuoteQty: string;
    stopPrice: string;
    icebergQty: string;
    time: number;
    updateTime: number;
    isWorking: boolean;
    isIsolated: boolean;
};

export const NewInvest = 'NEW_INVEST';
export const PendingInvest = 'PENDING';
export const CLosedInvest = 'CLOSED';

export type InvestStatusType = typeof NewInvest | typeof PendingInvest | typeof CLosedInvest;
export type InvestType = {
    reinvestPrice: number;
    reinvestAmount: number;
    takeProfitPrice: number;
    takeProfitAmount: number;
};

export type TradingMachineType = {
    pairSymbol: PairSymbolType;
    direction: DirectionType;
    invests: InvestType[];
    maxNumberOfSteps: number;
    maxInvestValue: number;
    startPrice: number;
    initialAmount: number;
    averagePrice: number;
    endPrice: number | null;
    totalAmount: number;
    status: InvestStatusType;
    startData: string;
    endData: string | null;
};
