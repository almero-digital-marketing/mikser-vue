'use strict'
import Vue from 'vue'
import Data from './data'
import App from 'app'

Vue.use(Data)
const app = new Vue(App)
app.$mount('#app')