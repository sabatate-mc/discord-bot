import 'dotenv/config'
import './registerSlashCommands'
import { Client, Intents, MessageAttachment, TextChannel } from 'discord.js'
import {
  StartInstancesCommand,
  DescribeInstancesCommand,
  EC2Client
} from '@aws-sdk/client-ec2'
import {
  CloudWatchClient,
  GetMetricWidgetImageCommand
} from '@aws-sdk/client-cloudwatch'

const serverInstanceId = process.env.SERVER_INSTANCE_ID as string
const discordToken = process.env.DISCORD_TOKEN as string
const discordBotChannelId = process.env.DISCORD_BOT_CHANNEL_ID as string

const client = new Client({
  intents: [Intents.FLAGS.GUILDS]
})
let channel: TextChannel | null = null
client.once('ready', async () => {
  console.log(client.user?.tag)
  channel = (await client.channels.fetch(discordBotChannelId)) as TextChannel
})
const ec2Client = new EC2Client({ region: 'ap-northeast-1' })
const cwClient = new CloudWatchClient({ region: 'ap-northeast-1' })

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return
  if (interaction.commandName !== 'sabatate') return
  if (interaction.channelId !== discordBotChannelId) {
    await interaction.reply('コマンドはBot用チャンネルで利用してください。')
    return
  }
  if (interaction.options.data[0].name === 'start') {
    const data = await ec2Client.send(
      new DescribeInstancesCommand({
        InstanceIds: [serverInstanceId]
      })
    )
    const item = data.Reservations ? data.Reservations[0] : null
    const instance = item?.Instances ? item.Instances[0] : null
    const state = instance?.State ? instance.State.Code : null

    if (state === 80) {
      // stopped
      await interaction.reply('Minecraft サーバーを起動します......。')
      await ec2Client.send(
        new StartInstancesCommand({
          InstanceIds: [serverInstanceId]
        })
      )
    } else {
      await interaction.reply(
        'Minecraft サーバーが停止済みではありません。\n' +
          'サーバーが停止してから再度実行してください。'
      )
    }
  } else if (interaction.options.data[0].name === 'metrics') {
    try {
      interaction.reply('Minecraft サーバーのメトリクスを表示します。')
      const data = await cwClient.send(
        new GetMetricWidgetImageCommand({
          MetricWidget: JSON.stringify({
            sparkline: true,
            metrics: [
              [
                'AWS/EC2',
                'CPUUtilization',
                'InstanceId',
                'i-0b12104c6bf5f2fdb'
              ],
              ['CWAgent', 'mem_used_percent', '.', '.'],
              ['.', 'disk_used_percent', '.', '.']
            ],
            view: 'singleValue',
            stacked: false,
            region: 'ap-northeast-1',
            stat: 'Average',
            period: 300
          })
        })
      )
      const image = data.MetricWidgetImage
      if (data.MetricWidgetImage === undefined) {
        channel?.send('メトリクスの取得に失敗しました。')
      } else {
        const buffer = Buffer.from(image!)
        const attach = new MessageAttachment(buffer, 'metrics.png')
        channel?.send({
          content: 'メトリクスを表示します。',
          files: [attach]
        })
      }
    } catch {
      channel?.send('メトリクスの取得に失敗しました。')
    }
  }
})

client.login(discordToken)
