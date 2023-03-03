const { ShardingManager, REST, Routes } = require('discord.js');
const manager = new ShardingManager('./src/app/bot.js', { token: process.env.TOKEN, respawn: true, timeout: -1 });
const Redis = require('ioredis');
const fs = require('node:fs');
const winston = require('winston');

const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston.format.json());

const logger = winston.createLogger({
	level: 'info',
	format: logFormat,
	defaultMeta: { service: 'transcode-index', env: process.env.ENVIRONMENT },
	transports: [
		new winston.transports.File({ filename: 'combined.log', timestamp: true, level: 'debug' }),
	],
});

logger.log({ level: 'info', message: 'Initiating BOT' });

manager.on('shardCreate', shard => {
	logger.log({ level: 'info', message: `Created shard number ${shard.id}` });
});

try {
	const redis = new Redis(process.env.REDIS_PORT, process.env.REDIS_IPV4);
	logger.log({ level: 'info', message: `ShardingManager connected to redis (${process.env.REDIS_IPV4}:${process.env.REDIS_PORT})` });

	setInterval(async () => {
		const keys = await redis.keys('*:time');

		for (const key of keys) {
			const splittedKey = key.split(':')[0];

			const sevenDaysAgoDate = new Date();
			sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);

			const createdDate = new Date(await redis.get(key));

			if (sevenDaysAgoDate < createdDate) {
				continue;
			}

			try {
				fs.unlink(`./src/app/audios/${splittedKey}.mp3`, async () => {
					await redis.del(key);
				});
			} catch (error) {
				console.error('Failed to delete music.');
				console.error(error);
			}
		}

	}, 3000);

} catch (err) {
	logger.log({ error: err, level: 'error', message: `ShardingManager failed to connect to Redis at ${process.env.REDIS_IPV4}:${process.env.REDIS_PORT}` });
	process.exit(1);
}

const dir = './src/app/audios';
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir);
	logger.log({ level: 'info', message: 'Created audios dir.' });
}

setCommands();

manager.spawn({ delay: 15500, timeout: 60000 });

function setCommands() {
	const commands = [];
	const path = `${__dirname}/app/commands`;

	const commandFiles = fs.readdirSync(path).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`${path}/${file}`);
		commands.push(command.data.toJSON());
	}

	const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

	rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
		.then(() => logger.log({ level: 'info', message: 'Refreshed application (/) commands' }))
		.catch((e) => logger.log({ error: e, level: 'error', message: 'Error refreshing (/) commands' }));
}
