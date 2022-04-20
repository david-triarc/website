import { Body, Controller, Param, Post, Query, Sse, UseGuards } from '@nestjs/common'
import { Observable } from 'rxjs'
import { ChatMessage, ChatService } from './chat.service'
import { SlackGuard } from './slack.guard'

@Controller('chat')
export class ChatController {
  constructor(private chat: ChatService) {}

  @Post('/send')
  async send(@Query('thread') thread: string, @Body('message') message: string): Promise<void> {
    await this.chat.postMessage(thread, message)
  }

  @Sse('/:thread/receive')
  receive(@Param('thread') thread: string): Observable<{ data: ChatMessage }> {
    return this.chat.subscribeToThread(thread)
  }

  @Post('/slack')
  @UseGuards(SlackGuard)
  async webhook(
    @Body()
    body:
      | { type: 'url_verification'; challenge: string; token: string }
      | {
          type: 'event_callback'
          event: { ts: string; bot_id?: string; thread_ts: string; text: string; user: string }
        }
  ): Promise<string> {
    if (body.type === 'url_verification') {
      return body.challenge
    } else if (body.type === 'event_callback') {
      if (body.event.bot_id) {
        return
      }

      this.chat.pushMessageToThread(body.event.thread_ts, {
        message: body.event.text,
        name: await this.chat.getUsername(body.event.user),
        time: new Date(),
      })
    }
  }
}
