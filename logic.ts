import * as _ from 'lodash';
import {
    NewInvest,
    TradingMachineType,
    InvestType,
    DirectionType,
    Buy,
    Sell,
    PairSymbolType
} from './types';

export const roundTo = (value: number, precision: number): number => {
    return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
};
export const printDate = ({ date }: { date: Date }): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${day}-${month}-${year}`;
};

export const getDirectionValue = ({ direction }: { direction: DirectionType }) => {
    if (direction === Buy) {
        return -1;
    } else if (direction === Sell) {
        return 1;
    }
    throw new Error('Not specified direction');
};

export const getOppositeDirection = ({
    direction
}: {
    direction: DirectionType;
}): DirectionType => {
    if (direction === Buy) {
        return Sell;
    } else if (direction === Sell) {
        return Buy;
    }

    throw new Error('Not specified direction');
};

export const sleep = async (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const buildTradingMachine = ({
    pairSymbol,
    direction,
    price,
    initialAmount,
    maxNumberOfSteps,
    maxInvestValue,
    takeProfitIndex,
    reinvestIndex,
    amountIndex
}: {
    pairSymbol: PairSymbolType;
    direction: DirectionType;
    price: number;
    initialAmount: number;
    maxInvestValue: number;
    maxNumberOfSteps: number;
    reinvestIndex: number;
    takeProfitIndex: number;
    amountIndex: number;
}): TradingMachineType => {
    console.log(`[BUILD TRADING MACHINE...]`);

    const machine: TradingMachineType = {
        pairSymbol,
        direction,
        invests: [],
        maxNumberOfSteps,
        maxInvestValue,
        startData: printDate({ date: new Date() }),
        startPrice: price,
        initialAmount,
        status: NewInvest,
        endPrice: null,
        totalAmount: 0,
        averagePrice: price,
        endData: null
    };

    let totalAmount = machine.initialAmount;
    let reinvestAmount = roundTo(totalAmount * (1 + amountIndex), 2);

    for (let index = 0; index < maxNumberOfSteps; index++) {
        const lastInvest = _.last(machine.invests);
        const prevReinvest = roundTo(lastInvest ? lastInvest.reinvestPrice : price, 2);
        const reinvestPrice = roundTo(
            prevReinvest * (1 + getDirectionValue({ direction }) * reinvestIndex),
            2
        );

        let takeProfitMulti = 1;
        switch (index) {
            case 0:
                takeProfitMulti = 3;
                break;
            case 1:
                takeProfitMulti = 2;
                break;
            default:
                break;
        }

        const prevTakeProfit = lastInvest ? lastInvest.takeProfitPrice : price;
        let takeProfitPrice = roundTo(
            prevTakeProfit *
                (1 - getDirectionValue({ direction }) * takeProfitIndex * takeProfitMulti),
            2
        );

        const invest: InvestType = {
            reinvestPrice,
            takeProfitPrice,
            reinvestAmount: reinvestAmount,
            takeProfitAmount: totalAmount
        };

        totalAmount = roundTo(totalAmount + reinvestAmount, 2);
        reinvestAmount = roundTo(reinvestAmount * (1 + amountIndex), 2);

        machine.invests.push(invest);
    }

    console.log(
        `Trading machine is: ${JSON.stringify(
            {
                pairSymbol,
                direction,
                reinvestIndex,
                takeProfitIndex,
                amountIndex
            },
            null,
            4
        )}\n`
    );

    return machine;
};
