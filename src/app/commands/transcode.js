const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const ytdl = require('ytdl-core');
const fs = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('transcode')
		.setDescription('Transcode YouTube video to .MP3 file')
		.addStringOption(option => option.setName('video-url')
			.setDescription('Paste a YouTube video link.')
			.setRequired(true)),
	async execute(interaction, redisInstance, logger) {
		await interaction.deferReply();

		const ytVideoUrl = interaction.options.getString('video-url');

		if (!ytVideoUrl ||
			!ytdl.validateURL(ytVideoUrl) ||
			!ytdl.validateID(ytdl.getVideoID(ytVideoUrl))) {

			logger.log({ level: 'warn', message: 'User provided invalid link', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
			return await interaction.editReply('Provide a valid YouTube link.');
		}

		logger.log({ level: 'info', message: 'Received request to transcode', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });

		try {
			const videoInfo = await ytdl.getInfo(ytVideoUrl, { requestOptions: getRequestOptions() });
			const videoDetails = videoInfo.videoDetails;

			if (videoDetails.isLiveContent && videoDetails.liveBroadcastDetails?.isLiveNow) {
				logger.log({ level: 'warn', message: 'It\'s not possible to transcode a running live video.', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
				return await interaction.editReply('It\'s not possible to transcode a running live video.');
			}

			if (!videoDetails.availableCountries.includes('US')) {
				logger.log({ level: 'warn', message: 'Video not available in United States.', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
				return await interaction.editReply('Video not available in United States.');
			}

			if (videoDetails.age_restricted) {
				logger.log({ level: 'warn', message: 'Video is age restricted.', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
				return await interaction.editReply('Video is age restricted.');
			}

			if (videoDetails.isPrivate) {
				logger.log({ level: 'warn', message: 'Video is private.', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
				return await interaction.editReply('Video is private.');
			}

			if (videoDetails.lengthSeconds > 3600) {
				logger.log({ level: 'warn', message: 'It\'s not possible to transcode a video with more than 1 hour.', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
				return await interaction.editReply('It\'s not possible to transcode a video with more than 1 hour.');
			}

			if (await videoExists(videoDetails.videoId)) {
				logger.log({ level: 'info', message: 'Video already downloaded', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
				return await interaction.editReply({ embeds: [generateEmbed(videoInfo, interaction)] });
			}

			const download = ytdl.downloadFromInfo(videoInfo, {
				quality: 'lowestaudio',
				filter: 'audioonly',
				requestOptions: getRequestOptions(),
				dlChunkSize: 90048,
			});

			download.on('progress', (chu, downloaded, size) => {
				logger.log({ level: 'info', message: 'Downloading video', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id, videoChunkSize: chu, videoDownloaded: downloaded, videoSize: size });
			});

			const writeStream = fs.createWriteStream(`${__dirname}/../audios/${ytdl.getVideoID(ytVideoUrl)}.mp3`);
			logger.log({ level: 'info', message: 'Downloading video', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
			download.pipe(writeStream);

			writeStream.on('close', async () => {
				await redisInstance
					.multi()
					.set(`${videoDetails.videoId}:video`, true)
					.set(`${videoDetails.videoId}:time`, new Date())
					.exec();

				try {
					logger.log({ level: 'info', message: 'Video saved to redis', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
					await interaction.editReply({ embeds: [generateEmbed(videoInfo, interaction)] });
				} catch (e) {
					logger.log({ error: e, level: 'error', message: 'Oops, we had a problem on our side. Try again in a few seconds.', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
					interaction.editReply(`Oops, we had a problem on our side. Try again in a few seconds. (${e.message})`);
				}
			});
		} catch (error) {
			logger.log({ error: error, level: 'error', message: 'Oops, we had a problem on our side. Try again in a few seconds.', interactionId: interaction.id, videoData: ytVideoUrl, guild: interaction.guild_id });
			return await interaction.editReply(`Oops, we had a problem on our side. Try again in a few seconds. (${JSON.stringify(error, Object.getOwnPropertyNames(error))})`);
		}

		async function videoExists(videoId) {
			const redisResult = await redisInstance.get(`${videoId}:video`);
			return !!redisResult;
		}

		function getRequestOptions() {
			if (process.env.ENVIRONMENT === 'DEV') {
				return {};
			}

			return {
				family: 6,
				localAddress: getIp(),
			};
		}

		function getIp() {
			const ipBase = process.env.IPV6_BLOCK;

			return ipBase.replace('@ID', generateRandomIntegerInRange(1, process.env.IPV6_LIMIT));
		}

		function generateRandomIntegerInRange(min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}

		function generateEmbed(videoInfoParam, interactionData) {
			let myDate = videoInfoParam.videoDetails.publishDate;

			try {
				myDate = myDate.split('-');
				myDate = new Date(myDate[0], myDate[1] - 1, myDate[2]);
			} catch (e) {
				logger.log({ error: e, level: 'error', message: 'Error generating embed', interactionId: interactionData.id, videoData: videoInfoParam.videoDetails.video_url, guild: interactionData.guild_id });
				myDate = new Date().getTime();
			}

			const exampleEmbed = new EmbedBuilder()
				.setColor(Math.floor(Math.random() * 16777215).toString(16))
				.setTitle('MP3 Link')
				.setURL(`${process.env.WEBSITE}/${ytdl.getVideoID(videoInfoParam.videoDetails.video_url)}.mp3`)
				.setAuthor({ name: videoInfoParam.videoDetails.author.name, iconURL: videoInfoParam.videoDetails.author?.thumbnails[0]?.url, url: videoInfoParam.videoDetails.author.channel_url })
				.setDescription(videoInfoParam.videoDetails.title)
				.setThumbnail(videoInfoParam.videoDetails.thumbnails.slice(-1).pop().url)
				.setTimestamp(myDate.getTime());

			return exampleEmbed;
		}
	},
};