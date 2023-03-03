module.exports = {
	name : 'ready',
	once: true,
	async execute(client, redis, logger) {
		if (process.env.ENVIRONMENT != 'DEV') {
			client.user.setActivity(`Beep Boop 🤖 - S:${client.shard.ids}`);
			logger.log({ level: 'info', message: `Shard ${client.shard.ids} ready.` });
		} else {
			client.user.setActivity('Beep Boop 🤖');
		}
	},
};