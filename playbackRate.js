const MAX_RATE = 4
const MIN_RATE = 0.5
const INCREMENT = 0.25

const MENU_ITEM_HIGHLIGHT = 'rgb(236, 82, 82)'

let currentVideo
let currentMenu
let keyListenerAdded = false
let lastVideo = 'last'
let videoToAdd = false
let menuToAdd = false
let rateBtnToAdd = false

function initialize() {
	const video = videoToAdd
	const menu = menuToAdd
	lastVideo = videoToAdd
	videoToAdd = menuToAdd = false

	function getPlaybackRate() {
		currentVideo = video
		currentMenu = menu
		chrome.storage.sync.get({ udemy_playback_rate: 1 }, obj => {
			// gotta love algebra
			const itemIndexPosition =
				(obj.udemy_playback_rate - MAX_RATE) / INCREMENT / -1
			setMenuItemsHTML(menu.children[itemIndexPosition], menu)
			video.playbackRate = obj.udemy_playback_rate
		})
	}

	function populateItems() {
		const iterations = 1 + (MAX_RATE - MIN_RATE) / INCREMENT
		// give us an array of length iterations to run reduce on
		const menuItems = Array(iterations).fill()
		// construct a chunk of HTML to give to innerHTML of menu
		const menuHtml = menuItems.reduce(
			(acc, curr, index) => (acc += renderListItem(index)),
			'',
		)

		menu.innerHTML = menuHtml
		Object.keys(menu.children).forEach((val, index) => {
			const element = menu.children[val]
			// menu item will change playback rate to its value when clicked
			element.addEventListener('click', () => {
				setPlaybackRate(MAX_RATE - index * INCREMENT, video, menu)
				// make item clicked the selected item
				setMenuItemsHTML(element, menu)
			})
		})
	}

	video.addEventListener('loadeddata', getPlaybackRate)
	video.addEventListener('play', getPlaybackRate)
	video.addEventListener('ended', getPlaybackRate)

	if (!keyListenerAdded) addKeyListener()

	populateItems()
}

function setPlaybackRate(rate, video, menu) {
	// no rate passed means default value case, which is to increment rate by INCREMENT
	if (rate === 'increase' || rate === 'decrease') {
		chrome.storage.sync.get({ udemy_playback_rate: 1 }, obj => {
			let newRate
			if (rate === 'increase') newRate = obj.udemy_playback_rate + INCREMENT
			if (rate === 'decrease') newRate = obj.udemy_playback_rate - INCREMENT
			if (newRate > MAX_RATE) newRate = MIN_RATE
			if (newRate < MIN_RATE) newRate = MAX_RATE
			const itemIndexPosition = (newRate - MAX_RATE) / INCREMENT / -1
			setMenuItemsHTML(menu.children[itemIndexPosition], menu)
			chrome.storage.sync.set({ udemy_playback_rate: newRate }, () => {
				video.playbackRate = newRate
			})
		})
	} else
		chrome.storage.sync.set({ udemy_playback_rate: rate }, () => {
			video.playbackRate = rate
		})
}

function renderListItem(index) {
	const playbackNumber = MAX_RATE - INCREMENT * index
	const listItem = `
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">
			${playbackNumber}x
			<span class="vjs-control-text"></span>
		</li>`
	return listItem
}

function setMenuItemsHTML(element, menu) {
	// set all menu items to be unselected
	Object.keys(menu.children).forEach(val => {
		const el = menu.children[val]
		el.setAttribute('aria-checked', false)
		el.setAttribute('title', '')
		el.children[0].innerHTML = ''
		el.style.background = ''
	})
	// adjust click event menu item to be selected
	element.setAttribute('aria-checked', true)
	element.setAttribute('title', ', selected')
	element.children[0].innerHTML = ', selected'
	element.style.background = MENU_ITEM_HIGHLIGHT
}

function checkForClass(node, classCheck, type) {
	if (type === 'video') {
		if (!node.target.classList) return
		if (node.target.classList.contains(classCheck)) {
			const firstChild = node.target.children[0]
			if (firstChild) {
				if (firstChild.classList.contains('vjs-tech')) {
					videoToAdd = firstChild
					return
				}
			}
			return
		}
	}

	if (node.children) {
		const children = Array.from(node.children)
		children.forEach(child => {
			if (child.classList.contains(classCheck)) {
				if (type === 'menu') {
					if (!child.firstChild) {
						return
					}
					if (
						child.firstChild.textContent === '0.5' ||
						child.firstChild.textContent === '0.5, selected'
					) {
						menuToAdd = child
						return
					}
					return
				}
				rateBtnToAdd = child
				return
			}
			return checkForClass(child, classCheck, type)
		})
	} else return
}

const Observer = new MutationObserver(mutations => {
	mutations.forEach(mutation => {
		checkForClass(mutation, 'video-player--video-player--1sfof', 'video')

		if (mutation.addedNodes.length > 0) {
			const addedNodes = Array.from(mutation.addedNodes)
			addedNodes.forEach(node => {
				checkForClass(node, 'vjs-menu-content', 'menu')
				checkForClass(node, 'vjs-playback-rate-value', 'rateBtn')
			})
		}
		if (videoToAdd && menuToAdd && rateBtnToAdd) {
			if (videoToAdd !== lastVideo) {
				initialize()
			}
		}
	})
})

function addKeyListener() {
	document.addEventListener('keyup', () => {
		if (event.code === 'ArrowRight' && event.shiftKey) {
			if (currentVideo && currentMenu) {
				setPlaybackRate('increase', currentVideo, currentMenu)
			}
		}
		if (event.code === 'ArrowLeft' && event.shiftKey) {
			if (currentVideo && currentMenu) {
				setPlaybackRate('decrease', currentVideo, currentMenu)
			}
		}
	})
	keyListenerAdded = true
}

Observer.observe(document, { childList: true, subtree: true })
