import App from './app'

export default context => {
	const { app, router, store } = App()
	
	if (context.provision) {
		console.log('Vue provision:', context.layout._id)
		return app
	}
	console.log('Vue render:', context.url)

	app.$mount('#' + process.env.VUE_APP)

	return new Promise((resolve, reject) => {
		if (!router) return resolve(app)

		const fullPath = router.resolve(context.url).route.fullPath

		if (fullPath !== context.url) {
			reject({ url: fullPath })
		}

		router.push(context.url)

		router.onReady(() => {
			const matchedComponents = router.getMatchedComponents()
			if (!matchedComponents.length) {
				reject({ code: 404 })
			}

			if (!store) return resolve(app)

			Promise.all(matchedComponents.map(({ asyncData }) => asyncData && asyncData({
				store,
				route: router.currentRoute
			}))).then(() => {
				context.state = store.state
				resolve(app)
			}).catch(reject)
		}, reject)
	})
}
