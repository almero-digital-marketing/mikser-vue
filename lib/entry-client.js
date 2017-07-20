import Vue from 'vue'
import 'es6-promise/auto'
import App from './app'

if (typeof Object.assign !== 'function') {
	Object.assign = function (target) {
		if (target == null) {
			throw new TypeError('Cannot convert undefined or null to object')
		}

		target = Object(target);
		for (let index = 1; index < arguments.length; index++) {
			const source = arguments[index]
			if (source != null) {
				for (const key in source) {
					if (Object.prototype.hasOwnProperty.call(source, key)) {
						target[key] = source[key]
					}
				}
			}
		}
		return target
	}
}

const initial = {
	data: window['VUE_INITIAL_DATA_' + process.env.VUE_APP.toUpperCase()],
	state: window['VUE_INITIAL_STATE_' + process.env.VUE_APP.toUpperCase()]
}
if (initial.data) {
	Vue.mixin({
		beforeCreate() {
			const data = typeof this.$options.data === 'function'
			? this.$options.data.call(this)
			: this.$options.data || {};
			this.$options.data = Object.assign(data, initial.data);				
		}
	})
}
if (initial.state) {
	Vue.mixin({
		beforeRouteUpdate (to, from, next) {
			const { asyncData } = this.$options
			if (asyncData) {
				asyncData({
					store: this.$store,
					route: to
				}).then(next).catch(next)
			} else {
				next()
			}
		}
	})
}

const { app, router, store } = App()

if (initial.state) {
	store.replaceSate(initial.state)
}

if (router) {
	router.onReady(() => {
		router.beforeResolve((to, from, next) => {
			const matched = router.getMatchedComponents(to)
			const prevMatched = router.getMatchedComponents(from)
			let diffed = false
			const activated = matched.filter((c, i) => {
			  return diffed || (diffed = (prevMatched[i] !== c))
			})
			const asyncDataHooks = activated.map(c => c.asyncData).filter(_ => _)
			if (!asyncDataHooks.length) {
			  return next()
			}

			Promise.all(asyncDataHooks.map(hook => hook({ store, route: to })))
				.catch(next)
		})

		app.$mount('#' + process.env.VUE_APP)
	})
} else {
	app.$mount('#' + process.env.VUE_APP)
}