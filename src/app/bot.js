const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const Redis = require('ioredis');
const winston = require('winston');

const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston.format.json());

const logger = winston.createLogger({
	level: 'info',
	format: logFormat,
	defaultMeta: { service: 'transcode-shard', env: process.env.ENVIRONMENT },
	transports: [
		new winston.transports.File({ filename: 'combined.log', timestamp: true, level: 'debug' }),
	],
});
let redis;

try {
	redis = new Redis(process.env.REDIS_PORT, process.env.REDIS_IPV4);
	logger.log({ level: 'info', message: `Redis instance (${process.env.REDIS_IPV4}) connected at port ${process.env.REDIS_PORT}` });
} catch (err) {
	logger.log({ error: err, level: 'error', message: `Error on connecting to Redis at ${process.env.REDIS_IPV4}:${process.env.REDIS_PORT}` });
	process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

client.on("debug", (e) => logger.log({ level: 'debug', event: e, message: 'New DEBUG event' })).on("warn", (e) => logger.log({ level: 'warn', event: e, message: 'New WARN event' }));

setEvents(redis);
setCommands();

client.login(process.env.TOKEN);

function setEvents(redisClient) {
	const path = `${__dirname}/events`;
	const eventFiles = fs.readdirSync(path).filter(file => file.endsWith('.js'));

	for (const file of eventFiles) {
		const event = require(`${path}/${file}`);
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args, client, redisClient, logger));
		} else {
			client.on(event.name, (...args) => event.execute(...args, client, redisClient, logger));
		}
	}
}

function setCommands() {
	client.commandArray = [];

	const path = `${__dirname}/commands`;

	const commandFilesClient = fs.readdirSync(path).filter(file => file.endsWith('.js'));
	for (const file of commandFilesClient) {
		const command = require(`${path}/${file}`);

		client.commands.set(command.data.name, command);
		client.commandArray.push(command.data.toJSON());
	}
}