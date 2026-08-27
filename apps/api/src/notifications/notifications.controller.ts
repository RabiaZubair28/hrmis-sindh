import { Controller, Get, Header, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/auth.decorators';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() @Header('Cache-Control', 'no-store, no-cache, must-revalidate') list(@CurrentUser() user: any, @Query('limit') limit?: string) { return this.notifications.list(user.id, Number(limit) || 30); }
  @Patch('read-all') markAll(@CurrentUser() user: any) { return this.notifications.markAllRead(user.id); }
  @Patch(':id/read') mark(@CurrentUser() user: any, @Param('id') id: string) { return this.notifications.markRead(user.id, id); }
}
