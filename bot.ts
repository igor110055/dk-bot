import { WhatsappClientType } from './whatsappClientTypes';

const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const isPi = require('detect-rpi');

export const getWhatsAppCLient = async (_number: string) => {
    return new Promise<WhatsappClientType>((resolve, reject) => {
        const number = _number;
        const extraParams = isPi() ? { executablePath: '/usr/bin/chromium-browser' } : undefined;
        const whatsappClient = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                handleSIGINT: false,
                ...extraParams
            }
        });

        const bot: WhatsappClientType = {
            send: async (msg: string) => {
                const sanitized_number = number.toString().replace(/[- )(]/g, '');
                const final_number = `48${sanitized_number.substring(
                    sanitized_number.length - 10
                )}`;

                const number_details = await whatsappClient.getNumberId(final_number);

                if (number_details) {
                    const sendMessageData = await whatsappClient.sendMessage(
                        number_details._serialized,
                        msg
                    );
                } else {
                    console.log(final_number, 'Mobile number is not registered');
                }
            }
        };

        whatsappClient.on('ready', () => {
            resolve(bot);
        });

        whatsappClient.on('qr', (qr: any) => {
            qrcode.generate(qr, { small: true });
        });

        whatsappClient.on('message', (msg: any) => {
            if (msg.body == '!ping') {
                msg.reply('pong');
            }
        });

        process.on('SIGINT', async () => {
            await whatsappClient.destroy();
            console.log('client destroyed');
            process.exit(0);
        });

        whatsappClient.initialize();
    });
};
