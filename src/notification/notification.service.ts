import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  // ─── Internal: called by AppointmentService ───────────────────────────────

  async createNotification(
    patientId: string,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    const notification = this.notificationRepo.create({
      patientId,
      type,
      title,
      message,
      isRead: false,
    });
    await this.notificationRepo.save(notification);
  }

  // ─── GET /notifications ───────────────────────────────────────────────────

  async getNotifications(patient: User): Promise<object> {
    const notifications = await this.notificationRepo.find({
      where: { patientId: patient.id },
      order: { createdAt: 'DESC' },
    });

    if (notifications.length === 0) {
      return {
        success: true,
        message: 'No notifications found',
        unreadCount: 0,
        data: [],
      };
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      success: true,
      message: 'Notifications fetched successfully',
      unreadCount,
      total: notifications.length,
      data: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    };
  }

  // ─── GET /notifications/unread-count ─────────────────────────────────────

  async getUnreadCount(patient: User): Promise<object> {
    const count = await this.notificationRepo.count({
      where: { patientId: patient.id, isRead: false },
    });

    return {
      success: true,
      unreadCount: count,
    };
  }

  // ─── PATCH /notifications/:id/read ───────────────────────────────────────

  async markAsRead(patient: User, notificationId: string): Promise<object> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    if (notification.patientId !== patient.id) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
      // Intentionally same message as above — don't leak that it exists
    }

    if (notification.isRead) {
      throw new ConflictException(`Notification is already marked as read`);
    }

    await this.notificationRepo.update({ id: notificationId }, { isRead: true });

    return {
      success: true,
      message: 'Notification marked as read',
      data: {
        id: notificationId,
        isRead: true,
      },
    };
  }

  // ─── PATCH /notifications/read-all ───────────────────────────────────────

  async markAllAsRead(patient: User): Promise<object> {
    const unread = await this.notificationRepo.count({
      where: { patientId: patient.id, isRead: false },
    });

    if (unread === 0) {
      return {
        success: true,
        message: 'All notifications are already read',
        updatedCount: 0,
      };
    }

    await this.notificationRepo.update(
      { patientId: patient.id, isRead: false },
      { isRead: true },
    );

    return {
      success: true,
      message: `${unread} notification${unread > 1 ? 's' : ''} marked as read`,
      updatedCount: unread,
    };
  }
}