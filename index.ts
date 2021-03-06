import {
    getLatestPrice,
    getOrdersById,
    placeLimitOrder,
    cancelOrderById,
    borrowAsset,
    placeMarketOrder,
    repayAsset
} from './helpers';
import { Buy, ETHBUSD, Filled, Canceled, Limit, Sell, ETH, Market } from './types';
import { buildTradingMachine, getOppositeDirection, sleep } from './logic';
import { getWhatsAppCLient } from './bot';

const { Spot } = require('@binance/connector');

/*
 *  IP RESTRICTED KEY! 185.48.129.23
 */
const apiKey = 'eqRKfannsmXfod4nvs9gEcjgNWQ3OXDu6JRxUVlbjirTlYPJsPtuGIENa8Y52lEF';
const apiSecret = 'xD1NXMXtDxmlUfgU3jxLgqMLKg0ALQRWZrCYLpo4OpqjJN5n01OaTwbeIuHrUlXP';
const client = new Spot(apiKey, apiSecret);

// screen cleanup
process.stdout.write('\x1Bc');

(async () => {
    const whatsAppClient = await getWhatsAppCLient('530720390');
    const printAndNotify = (msg: string) => {
        console.log(msg);
        whatsAppClient.send(msg);
    };

    const pairSymbol = ETHBUSD;
    const reinvestIndex = 0.055;
    const takeProfitIndex = 0.01;
    const initialAmount = 0.5;
    const direction = Sell;
    const maxNumberOfSteps = 4;
    const amountIndex = 0.5;
    const maxInvestValue = 18000;
    const numberOfStepsForRiskInvestmentsWarning = 5;

    while (true) {
        printAndNotify(`WARNING! NEW INVEST HAS STARTED!\n`);

        /*
         * Repay debt if exists
         */
        await repayAsset({ client, symbol: ETH });

        /*
         * Get the latest price
         */
        const latestPrice = await getLatestPrice({
            client,
            pairSymbol,
            direction
        });

        if (!latestPrice) {
            printAndNotify('Cannot reach latest price! Algo break!');
            break;
        }

        /*
         * Build Trading Machine
         */
        const machine = buildTradingMachine({
            pairSymbol,
            initialAmount,
            reinvestIndex,
            takeProfitIndex,
            price: latestPrice,
            direction,
            maxNumberOfSteps,
            amountIndex,
            maxInvestValue
        });

        printAndNotify(
            `Algo params: {\n    symbol: ${pairSymbol}\n` +
                `    direction: ${direction}\n    start price: ${latestPrice}\n` +
                `    start amount: ${initialAmount}\n    reinvest index: ${reinvestIndex}\n    take profit index: ${takeProfitIndex}\n` +
                `    amount index: ${amountIndex}\n    max steps: ${maxNumberOfSteps}\n}\n`
        );

        /*
         * Make first order (MARKET!) and borrow if needed
         */
        if (machine.direction === Sell) {
            await borrowAsset({ client, symbol: ETH, amount: machine.initialAmount });
        }

        const firstOrder = await placeMarketOrder({
            client,
            pairSymbol: machine.pairSymbol,
            direction: machine.direction,
            orderType: Market,
            quantity: machine.initialAmount
        });
        printAndNotify(
            `New Market Order Created ${machine.pairSymbol}: ${machine.direction}, ${latestPrice}, ${machine.initialAmount}\n`
        );

        let step = 0;

        do {
            /*
             * GET NEW INVEST
             */
            console.log(`[GET INVEST...]`);

            const invest = machine.invests[step];
            console.log(`Invest step is: ${step}`);
            console.log(`Invest is ${JSON.stringify(invest, null, 4)}\n`);

            /*
             * WARNING IF INVESTMENTS GET RISKY
             */
            if (step + 1 >= numberOfStepsForRiskInvestmentsWarning) {
                console.log(`WARNING! Invests are getting risky! number of steps: ${step}`);
            }

            step++;

            /*
             * PLACE REINVEST ORDER
             */
            if (machine.direction === Sell) {
                await borrowAsset({ client, symbol: ETH, amount: invest.reinvestAmount });
            }
            const reinvestOrder = await placeLimitOrder({
                client,
                price: invest.reinvestPrice,
                pairSymbol: machine.pairSymbol,
                direction: machine.direction,
                orderType: Limit,
                quantity: invest.reinvestAmount
            });
            printAndNotify(
                `New Reinvest Order Created ${machine.pairSymbol}: ${invest.reinvestPrice}, ${invest.reinvestAmount}\n`
            );

            /*
             * PLACE TAKE PROFIT ORDER
             */
            const takeProfitOrder = await placeLimitOrder({
                client,
                price: invest.takeProfitPrice,
                pairSymbol: machine.pairSymbol,
                direction: getOppositeDirection({ direction: machine.direction }),
                orderType: Limit,
                quantity: invest.takeProfitAmount
            });
            printAndNotify(
                `New Take Profit Order Created ${machine.pairSymbol}: ${invest.takeProfitPrice}, ${invest.takeProfitAmount}\n`
            );

            let reinvest;
            let takeProfit;

            do {
                /*
                 * WAIT
                 */
                await sleep(10000);

                /*
                 * CHECK REINVEST AND TAKE PROFIT ORDERS IF FILLED
                 */
                reinvest = await getOrdersById({
                    client,
                    pairSymbol: ETHBUSD,
                    orderId: reinvestOrder?.orderId || -1
                });

                takeProfit = await getOrdersById({
                    client,
                    pairSymbol: ETHBUSD,
                    orderId: takeProfitOrder?.orderId || -1
                });

                if (reinvest?.status === Canceled || takeProfit?.status === Canceled) {
                    printAndNotify(`Error! One of limit order has been canceled!\n`);
                    break;
                }
            } while (reinvest?.status !== Filled && takeProfit?.status !== Filled);

            if (reinvest?.status === Filled) {
                /*
                 * CANCEL TAKE PROFIT ORDER
                 */
                const status = await cancelOrderById({
                    client,
                    pairSymbol: ETHBUSD,
                    orderId: takeProfitOrder?.orderId || -1
                });
                printAndNotify(`Reinvest!\n`);
            }
            if (takeProfit?.status === Filled) {
                /*
                 * TAKE PROFIT
                 */
                console.log(`[TAKE PROFIT...]`);
                console.log(
                    `Profit amount is ${invest.takeProfitAmount}, close price is ${
                        invest.takeProfitPrice
                    }, an average price is ${0}\n`
                );
                printAndNotify(`Take Profit!\n`);

                /*
                 * CANCEL REINVEST ORDER
                 */
                const status = await cancelOrderById({
                    client,
                    pairSymbol: ETHBUSD,
                    orderId: reinvest?.orderId || -1
                });
                break;
            }

            if (step >= machine.maxNumberOfSteps) {
                printAndNotify(`ATTENTION ALGO REACHED MAX NUMBER OF STEPS!\n`);
                break;
            }
        } while (true);
    }
})();
