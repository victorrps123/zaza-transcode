module.exports = {
	apps : [{
		name   : 'ZAZA-Transcode',
		script : './src/index.js',
		instances: 1,
		ignore_watch : ['node_modules'],
		max_memory_restart: '6G',
		log_date_format: 'DD-MM-YYYY HH:mm:ssTZ',
		env: {
			'TOKEN': '',
			'CLIENT_ID': '',
			'REDIS_IPV4': '127.0.0.1',
			'REDIS_PORT': '6380',
			'ENVIRONMENT': 'DEV',
			'WEBSITE': 'http://localhost',
		},
		env_production: {
			'TOKEN': '',
			'CLIENT_ID': '',
			'REDIS_IPV4': '127.0.0.1',
			'REDIS_PORT': '6379',
			'ENVIRONMENT': 'PROD',
			'WEBSITE': 'https://music.zaza.run',
			'IPV6_LIMIT': '110',
			'IPV6_BLOCK': '2a01:4ff:f0:c075::@ID',
		},
	}],
};