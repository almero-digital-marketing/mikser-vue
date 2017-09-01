import Vue from 'vue'
import App from './app'
import routes from 'routes'

export { App, routes }
export default context => {

	Vue.mixin({
		beforeCreate() {
			const data = typeof this.$options.data === 'function'
			? this.$options.data.call(this)
			: this.$options.data || {};
			this.$options.data = Object.assign(data, context.initalData);				
		}
	})

	const { app, router, store, options } = App()

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
