const mineflayer = require('mineflayer')
const {
    Vec3
} = require('vec3')

if (process.argv.length < 4 || process.argv.length > 6) {
    console.log('Usage : node file.js <host> <port> [<name>] [<password>]')
    process.exit(1)
}

const bot = mineflayer.createBot({
    host: process.argv[2],
    port: parseInt(process.argv[3]),
    username: process.argv[4] ? process.argv[4] : 'trader',
    password: process.argv[5]
})
let mcData
let mcLectern
bot.once('inject_allowed', () => {
    mcData = require('minecraft-data')(bot.version)
    mcLectern = mcData.blocksByName["lectern"];
})


bot.on('spawn', () => {
    console.log('\x1b[36m%s\x1b[0m', '====================================================================='); //cyan
    console.log('\x1b[36m%s\x1b[0m', 'Successfully Spawned into the world'); //cyan
    console.log('\x1b[36m%s\x1b[0m', '====================================================================='); //cyan
})

bot.on('chat', (username, message) => {
    if (username === bot.username) return
    const command = message.split(' ')
    switch (true) {

        case command[0] === 'get':
            master(command[1])
            break

        case message === 'show inventory':
            showInventory()
            break

        case /^show trades [0-9]+$/.test(message):
            showTrades(command[2])
            break

        case /^trade [0-9]+ [0-9]+( [0-9]+)?$/.test(message):
            trade(command[1], command[2], command[3])
            break
    }
})


async function master(bookName) {

    await checkForBook(bookName)
    while (tryagain) {
    	tryagain = false
    	await sleep(100)
    	await checkForBook(bookName)
    }
	if (bookFound == false) {
		await resetTrades(bookName)
    }
    master(bookName)
}

let tryagain = false
let bookFound = false

async function checkForBook(bookName) {
    let villagers = Object.keys(bot.entities).map(id => bot.entities[id]).filter(e => e.entityType === mcData.entitiesByName.villager.id)
    console.log(villagers[0].metadata.at(-1).villagerProfession);

    if(villagers[0].metadata.at(-1).villagerProfession != 9) {
    	tryagain = true
    	console.log('\x1b[36m%s\x1b[0m', '===================Waiting On Villager===================='); 
    	return
    }

    const villager = await bot.openVillager(villagers[0])
    console.log('\x1b[35m%s\x1b[0m', '=============================Looking For Book=============================='); //magenta

    villager.trades.forEach((trade, index) => {
        console.log("=============================Slot " + (index + 1) + "===============================")
        if (trade.outputItem.name == 'enchanted_book') {
            const bookLvl = trade.outputItem.nbt.value.StoredEnchantments.value.value[0].lvl.value
            const bookId = trade.outputItem.nbt.value.StoredEnchantments.value.value[0].id.value
            console.log("book Found!")
            console.log(bookId, bookLvl)

            if (bookName.toLowerCase() == bookId.toLowerCase()) {
                console.log("book Matches" + bookName)
                console.log("Stopping Search")
                bookFound = true
            } else {
                console.log("book does not match")
            }

        } else {
            console.log("no book found in this slot ")

        }
    })

    console.log('\x1b[35m%s\x1b[0m', '=========================================================================='); //magenta
    villager.close()
}

async function resetTrades() {
    console.log('\x1b[34m%s\x1b[0m', '=============================Resetting Trades=============================='); //magenta
    let block = bot.findBlock({
        matching: mcLectern.id,
        maxDistance: 5,
    });
    console.log("Lecturn Found")



    bot.setQuickBarSlot(0)
    await bot.dig(block, forceLook = true)
    console.log("Lecturn Broken")
    await sleep(500)

    bot.setQuickBarSlot(1)
    let reference = bot.blockAt(block.position.offset(0, -1, 0))
    await bot.placeBlock(reference, new Vec3(0, 1, 0))
    console.log("Lecturn Replaced")

    console.log('\x1b[34m%s\x1b[0m', '==========================================================================='); //magenta
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}