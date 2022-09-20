const mineflayer = require('mineflayer')
const {Vec3} = require('vec3')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
let mcData
let mcLectern
let bruh = false

if (process.argv.length < 4 || process.argv.length > 6) {
	console.log('Usage : node file.js <host> <port> [<name>] [<password>]')
	process.exit(1)
}

console.log("Creating Bot and attemting to join world")
const bot = mineflayer.createBot({
	host: process.argv[2],
	port: parseInt(process.argv[3]),
	username: process.argv[4] ? process.argv[4] : 'trader', 
	password: process.argv[5]
})

bot.once('inject_allowed', () => {
	mcData = require('minecraft-data')(bot.version)
	mcLectern = mcData.blocksByName["lectern"];
})

bot.on('spawn', () => {
	console.log('\x1b[36m%s\x1b[0m', '====================================================================='); //cyan
	console.log('\x1b[36m%s\x1b[0m', 'Successfully Spawned into the world'); //cyan
	console.log('\x1b[36m%s\x1b[0m', '====================================================================='); //cyan
	mineflayerViewer(bot, { port: 8080, firstPerson: true }) // port is the minecraft server port, if first person is false, you get a bird's-eye view
})

bot.on('chat', (username, message) => {
	if (username === bot.username) return
	const command = message.split(' ')
	switch (true) {

		case command[0] === 'get':
		bot.chat("Finding Your Book for you!")
			master(command[1], command[2])
			break

		case command[0] === 'debug':
			debug()
			break

		case /^show trades [0-9]+$/.test(message):
			showTrades(command[2])
			break

		case /^trade [0-9]+ [0-9]+( [0-9]+)?$/.test(message):
			trade(command[1], command[2], command[3])
			break
	}
})

async function master(wantedBookName, wantedBookLevel) {
	
	console.log('\x1b[36m%s\x1b[0m', '===========================Waiting On Villager=============================');
	while(!await getVillagerStatus()) {
		await sleep(50)
	}

	await checkForBook(wantedBookName, wantedBookLevel)
	if(bruh) {
		bruh = false
		console.log('\x1b[32m%s\x1b[0m', "----------------------------Book Match Found!---------------------------") //green
		bot.chat("Book Found!")
		attemptTrade(wantedBookName, wantedBookLevel)
		return
	} 
	else {
		if(checkLecturnStock()) {
			await resetVillagerTrades()	
		} 
		else {
			bot.chat("Out of Stock. Unable to Continue")
			console.log('\x1b[31m%s\x1b[0m', 'OUT OF STOCK, PLEASE REFILL LECTURNES AND TRY AGAIN'); 
			return
		}
	}

	master(wantedBookName, wantedBookLevel)
}

function getVillagerStatus() {
	let villagers = Object.keys(bot.entities).map(id => bot.entities[id]).filter(e => e.entityType === mcData.entitiesByName.villager.id).filter(e => bot.entity.position.distanceTo(e.position) < 5)
	if(villagers[0].metadata.at(-1).villagerProfession != 9) { 
		return false
	}
	return true
}

async function checkForBook(wantedBookName, wantedBookLevel) {
	let villagers = Object.keys(bot.entities).map(id => bot.entities[id]).filter(e => e.entityType === mcData.entitiesByName.villager.id).filter(e => bot.entity.position.distanceTo(e.position) < 5)

	const villager = await bot.openVillager(villagers[0])
	console.log('\x1b[35m%s\x1b[0m', '=============================Looking For Book=============================='); //magenta

	villager.trades.forEach((trade, index) => {
		console.log("=============================Slot " + (index + 1) + "===============================")
		if (trade.outputItem.name == 'enchanted_book') {
			const bookLvl = trade.outputItem.nbt.value.StoredEnchantments.value.value[0].lvl.value
			const bookId = trade.outputItem.nbt.value.StoredEnchantments.value.value[0].id.value
			console.log('\x1b[32m%s\x1b[0m', "book Found!: " + bookId + " " + bookLvl + "in slot " + (index + 1)) //green

			if (wantedBookName.toLowerCase() == bookId.toLowerCase()) {
				console.log('\x1b[32m%s\x1b[0m', "Book Type Matches!") //green
				if(wantedBookLevel == bookLvl) {
					villager.close()
					console.log('\x1b[32m%s\x1b[0m', "Book level Matches!") //green
					console.log('\x1b[35m%s\x1b[0m', '==========================================================================='); //magenta
					bruh = true
					return true
				} else {
					console.log('\x1b[38;2;186;96;0m%s\x1b[0m', "Book level does not match") //orange
				}
			} else {
				console.log('\x1b[38;2;186;96;0m%s\x1b[0m', "Book does not match") //orange
			}
		} else {
			console.log('\x1b[38;2;186;96;0m%s\x1b[0m', "no book found in slot" + (index + 1)) //orange
		}
	})

	console.log('\x1b[35m%s\x1b[0m', '==========================================================================='); //magenta
	villager.close()
	return false
}

async function resetVillagerTrades() {
	console.log('\x1b[34m%s\x1b[0m', '=============================Resetting Trades=============================='); //magenta
	let block = bot.findBlock({
		matching: mcLectern.id,
		maxDistance: 5,
	});
	console.log('Lecturn Found at ', block.position)
	bot.setQuickBarSlot(0)
	await bot.dig(block, forceLook = true)
	console.log("Lecturn Broken")
	await sleep(100)

	bot.setQuickBarSlot(1)
	let reference = bot.blockAt(block.position.offset(-1, 0, 0))
	await bot.placeBlock(reference, new Vec3(1, 0, 0))
	console.log("Lecturn Replaced")

	console.log('\x1b[34m%s\x1b[0m', '==========================================================================='); //magenta
}

function checkLecturnStock() {
	let inventory = bot.inventory
	if(inventory.slots[37].count <= 1 ) return false
	if(inventory.slots[37].name != "lectern") return false
	return true
}

function attemptTrade(wantedBookName, wantedBookLevel) {
	
	console.log("test")
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function debug() {
	for (var i = 0; i <= 50; i++) {
		console.log('\x1b[' + i + 'm%s\x1b[0m', i)
	}
}
