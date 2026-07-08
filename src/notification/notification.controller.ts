import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../common/guards/auth.guards';
import { User, Role } from '../auth/user.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // GET /notifications
  @Get()
  getNotifications(@CurrentUser() user: User) {
    return this.notificationService.getNotifications(user);
  }

  // GET /notifications/unread-count
  // Must be declared BEFORE /:id/read so NestJS doesn't treat "unread-count" as an :id
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationService.getUnreadCount(user);
  }

  // PATCH /notifications/read-all
  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationService.markAllAsRead(user);
  }

  // PATCH /notifications/:id/read
  @Patch(':id/read')
  markAsRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notificationService.markAsRead(user, id);
  }
}