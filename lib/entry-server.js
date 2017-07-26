import App from './app'
import routes from 'routes'

export { App }
export default context => {
	const { app, router, store } = App()

	if (router) {
		router.addRoutes(routes)
	}

	console.log('Vue render:', context.url)

	app.$mount('#' + process.env.VUE_APP)

	return new Promise((resolve, reject) => {
		if (!router) return resolve(app)

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
