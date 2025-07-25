<script setup>
import { ref, watch } from 'vue'

const searchQuery = new URLSearchParams(window.location.search)

const searchValue = ref(searchQuery.get('search') || '')

// Update the window search param when the searchValue changes
// this allows the user to bookmark / return to a specific search
// and also allows the browser to handle back/forward navigation
// without losing the search state
watch(searchValue, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    searchQuery.set('search', newValue)
    window.history.replaceState({}, '', `?${searchQuery.toString()}`)
  }
})
</script>

<template>
  <template v-if="$route.path === '/'">
    <input
      class="w-full p-3 my-3 focus:outline-none border-b"
      type="search"
      placeholder="Search for a demo..."
      autofocus
      v-model="searchValue"
    />
    <ul>
      <li
        class="p-5 border-b-2 border-black"
        v-for="route in $router.options.routes.filter(route =>
          searchValue === '' ? true : route.props.name.toLowerCase().includes(searchValue.toLowerCase()),
        )"
        :key="route.path"
      >
        <router-link class="block mb-2 font-medium" :to="route.path">
          {{ route.props.name }}
        </router-link>

        <div class="flex">
          <a
            class="mr-4 text-sm text-gray-300 font-medium"
            v-for="(tab, index) in route.props.tabs"
            :key="index"
            :href="`/src/${route.props.name}/${tab.name}/`"
          >
            {{ tab.name }}
          </a>
        </div>
      </li>
    </ul>
  </template>
  <router-view v-else />
</template>

<script>
export default {
  methods: {
    fromString(value) {
      if (value === null) {
        return true
      }

      if (value.match(/^\d*(\.\d+)?$/)) {
        return Number(value)
      }

      if (value === 'true') {
        return true
      }

      if (value === 'false') {
        return false
      }

      if (value === 'null') {
        return null
      }

      return value
    },
  },

  computed: {
    query() {
      return Object.fromEntries(Object.entries(this.$route.query).map(([key, value]) => [key, this.fromString(value)]))
    },
  },
}
</script>
