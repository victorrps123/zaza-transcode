module.exports = {
	name: 'interactionCreate',
	async execute(interaction, client, redisInstance, logger) {
		if (!interaction.isChatInputCommand()) return;

		const command = client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction, redisInstance, logger);
		} catch (error) {
			logger.log({ error: error, level: 'error', message: 'Error running command', interactionId: interaction.id, interactionData: interaction.data, guild: interaction.guild_id });
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	},
};