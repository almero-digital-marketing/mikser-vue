import Vue from 'vue'
import layout from 'layout.vue'
import { sync } from 'vuex-router-sync'

export default () => {
	let info = {}
	if (typeof layout.init === 'function') {
		info = layout.init() || {}
		if (info.router && info.store) {
			sync(info.store, info.router)
		}
	}
	if (!info.app) {
		info.app = new Vue(layout)
	}
	info.layout = layout

	return info
}
