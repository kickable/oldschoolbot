import { KlasaMessage, KlasaClient, CommandStore } from 'klasa';
import { Items } from 'oldschooljs';
import { toKMB } from 'oldschooljs/dist/util/util';

import { BotCommand } from '../../lib/BotCommand';
import { UserSettings } from '../../lib/constants';

const options = {
	max: 1,
	time: 10000,
	errors: ['time']
};

export default class extends BotCommand {
	public constructor(
		client: KlasaClient,
		store: CommandStore,
		file: string[],
		directory: string
	) {
		super(client, store, file, directory, {
			cooldown: 1,
			aliases: ['clue'],
			usage: '<quantity:int{1}> <itemname:...string>',
			usageDelim: ' ',
			oneAtTime: true
		});
	}

	async run(msg: KlasaMessage, [quantity, itemName]: [number, string]) {
		const osItem = Items.get(itemName);
		if (!osItem) throw `That item doesnt exist.`;

		let priceOfItem = await this.client.fetchItemPrice(osItem.id);
		let totalPrice = priceOfItem * quantity;

		const hasItem = await msg.author.hasItem(osItem.id, quantity);
		if (!hasItem) {
			throw `You dont have ${quantity}x ${osItem.name}.`;
		}

		if (totalPrice > 3) {
			totalPrice = Math.floor(totalPrice * 0.8);
		}

		const sellMsg = await msg.channel.send(
			`${msg.author}, say \`confirm\` to sell ${quantity} ${
				osItem.name
			} for ${totalPrice.toLocaleString()} (${toKMB(totalPrice)}).`
		);

		try {
			const collected = await msg.channel.awaitMessages(
				_msg =>
					_msg.author.id === msg.author.id && _msg.content.toLowerCase() === 'confirm',
				options
			);
			if (!collected || !collected.first()) {
				throw "This shouldn't be possible...";
			}
		} catch (err) {
			return sellMsg.edit(`Cancelling sale of ${osItem.name}`);
		}

		await msg.author.removeItemFromBank(osItem.id, quantity);
		await msg.author.settings.update(
			UserSettings.GP,
			msg.author.settings.get(UserSettings.GP) + totalPrice
		);

		msg.author.log(`sold Quantity[${quantity}] ItemID[${osItem.id}] for ${totalPrice}`);

		return msg.send(
			`Sold ${quantity}x ${osItem.name} for ${totalPrice.toLocaleString()}gp (${toKMB(
				totalPrice
			)})`
		);
	}
}