import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'

const discordToken = process.env.DISCORD_TOKEN as string
const clientId = process.env.DISCORD_CLIENT_ID as string
const guildId = process.env.DISCORD_GUILD_ID as string

const commands = [
  {
    name: 'sabatate',
    description: 'さばたてサーバー管理 Bot',
    options: [
      {
        name: 'start',
        description: 'サーバーを起動します',
        type: '1'
      },
      {
        name: 'restart',
        description: 'サーバーを再起動します',
        type: '1'
      },
      {
        name: 'metrics',
        description: 'サーバーのメトリクスを表示します',
        type: '1'
      }
    ]
  }
]

const rest = new REST({ version: '9' }).setToken(discordToken)
async function registerCommands() {
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands
    })
  } catch (error) {
    console.error(error)
  }
}

registerCommands()
