'use strict'
import Vue from 'vue'
import Data from './data'
import App from 'app'

Vue.use(Data)
const app = new Vue(App)
console.log('Starting:', process.env.VUE_APP);
app.$mount('#' + process.env.VUE_APP)