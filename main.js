const mineflayer = require('mineflayer')
const { Vec3 } = require('vec3')
// const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
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
	// mineflayerViewer(bot, { port: 8080, firstPerson: true }) // port is the minecraft server port, if first person is false, you get a bird's-eye view
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
	while (true) {
		console.log("Locating Villager");
		while (!await getVillagerStatus()) {
			await sleep(50)
		}
		
		console.log("Checking Villager Trades");
		let bookFound = await checkForBook(wantedBookName, wantedBookLevel)
		if (bookFound) {
			console.log('\x1b[32m%s\x1b[0m', "----------------------------Book Match Found!---------------------------") //green
			bot.chat("Book Found!")
			attemptTrade(wantedBookName, wantedBookLevel)
			return
		}

		if (!checkLecturnStock()) {
			bot.chat("Out of Stock. Unable to Continue")
			console.log('\x1b[31m%s\x1b[0m', 'OUT OF STOCK, PLEASE REFILL LECTURNES AND TRY AGAIN');
			return
		}

		let success = await resetVillagerTrades();
		if (!success) {
			return
		}


	}

	master(wantedBookName, wantedBookLevel)
}
async function getVillagerStatus() {
	const villagers = Object.values(bot.entities)
		.filter(e => e.entityType === mcData.entitiesByName.villager.id)
		.filter(e => bot.entity.position.distanceTo(e.position) < 5);

	if (villagers.length === 0) return false;

	const villager = villagers[0];
	if (!villager.metadata[18]) return false

	const profession = villager.metadata[18].villagerProfession;
	return profession === 9;
}

async function checkForBook(wantedBookName, wantedBookLevel) {
	let villagers = Object.keys(bot.entities).map(id => bot.entities[id]).filter(e => e.entityType === mcData.entitiesByName.villager.id).filter(e => bot.entity.position.distanceTo(e.position) < 5)

	const villager = await bot.openVillager(villagers[0])

	let bookFound = false

	villager.trades.forEach((trade, index) => {
		console.log(trade)
		console.log("Checking Slot " + (index + 1))
		return
		if (trade.outputItem.name == 'enchanted_book') {

			const book = trade.outputItem.components[0].data.enchantments[0]
			const bookLvl = book.level
			const bookId = book.id
			console.log("Book found in slot " + (index + 1) + ": " + bookId + " " + bookLvl )

			if (wantedBookName.toLowerCase() == bookId.toLowerCase()) {
				console.log('\x1b[32m%s\x1b[0m', "Book Type Matches!") //green
				if (wantedBookLevel == bookLvl) {
					villager.close()
					console.log('\x1b[32m%s\x1b[0m', "Book level Matches!") //green
					console.log('\x1b[35m%s\x1b[0m', '==========================================================================='); //magenta
					bookFound = true
					return
				} else {
					console.log('\x1b[38;2;186;96;0m%s\x1b[0m', "Book level does not match") //orange
				}
			} else {
				console.log('\x1b[38;2;186;96;0m%s\x1b[0m', "Book does not match") //orange
			}
		} else {
			console.log('\x1b[38;2;186;96;0m%s\x1b[0m', "No book found in slot" + (index + 1)) //orange
		}
	})

	return bookFound
}

async function resetVillagerTrades() {
	console.log('Finding lectern');
	let block = bot.findBlock({
		matching: mcLectern.id,
		maxDistance: 5,
	});
	if (!block) {
		console.error('Failed to find lectern');
		bot.chat("Unable to reset villagers profession. Aborting...")
		return false
	}

	console.log('Lectern Found at ', block.position)
	bot.setQuickBarSlot(0)

	console.log('Breaking lectern');
	await bot.dig(block, forceLook = true)

	await sleep(1000)

	bot.setQuickBarSlot(1)

	new Promise(async (resolve, reject) => {
		try {
			console.log("Replacing lectern")

			await bot.placeBlock(block, new Vec3(1, 0, 0))
		} catch (err) {
			if (err.message.includes('Event') && err.message.includes('did not fire within timeout')) {
				console.log('Timeout error occured.');
				resolve();
			} else {
				console.log(err);
				reject();
			}
		}
	})

	return true
}

function checkLecturnStock() {
	let inventory = bot.inventory
	if (inventory.slots[37] == null) return false
	if (inventory.slots[37].name != "lectern") return false
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
