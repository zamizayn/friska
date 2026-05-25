import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:wstore_mobile/widgets/glass_scaffold.dart';
import 'package:provider/provider.dart';
import '../../providers/notifications_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsProvider>().fetchNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationsProvider>();
    return GlassScaffold(
      title: 'Notifications',
      actions: [
        if (provider.unreadCount > 0)
          TextButton(
            onPressed: () => provider.markAllRead(),
            child: Text('Mark all read',
                style: TextStyle(
                    fontFamily: 'Outfit',
                    color: AppColors.accent,
                    fontWeight: FontWeight.w600)),
          ),
      ],
      body: provider.isLoading
          ? const Center(
              child: CircularProgressIndicator(
                  valueColor:
                      AlwaysStoppedAnimation<Color>(AppColors.accent)))
          : provider.notifications.isEmpty
              ? Center(
                  child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.notifications_none,
                            size: 64,
                            color: AppColors.textMuted.withOpacity(0.3)),
                        const SizedBox(height: 16),
                        Text('No notifications',
                            style: TextStyle(
                                fontFamily: 'Inter',
                                color: AppColors.textMuted)),
                      ]),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: provider.notifications.length,
                  separatorBuilder: (_, __) => const Divider(
                      height: 1, color: AppColors.textPrimary10),
                  itemBuilder: (_, i) {
                    final n = provider.notifications[i];
                    final unread = n['isRead'] == false;
                    return GlassCard(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            margin: const EdgeInsets.only(top: 2),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: unread
                                  ? AppColors.accent.withOpacity(0.1)
                                  : AppColors.cardOpacityBg,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              unread
                                  ? Icons.circle_notifications
                                  : Icons.notifications_none,
                              color: unread
                                  ? AppColors.accent
                                  : AppColors.textMuted,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    n['title'] ?? 'Notification',
                                    style: TextStyle(
                                      fontFamily: 'Outfit',
                                      color: AppColors.textPrimary,
                                      fontSize: 14,
                                      fontWeight: unread
                                          ? FontWeight.bold
                                          : FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    n['body'] ?? '',
                                    style: TextStyle(
                                        fontFamily: 'Inter',
                                        color: AppColors.textSecondary,
                                        fontSize: 12),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    n['createdAt']
                                            ?.toString()
                                            .split('T')[0] ??
                                        '',
                                    style: TextStyle(
                                        fontFamily: 'Inter',
                                        color: AppColors.textMuted,
                                        fontSize: 10),
                                  ),
                                ]),
                          ),
                          if (unread)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                  color: AppColors.accent,
                                  shape: BoxShape.circle),
                            ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
