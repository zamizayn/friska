import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/support_provider.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SupportProvider>().fetchTickets();
    });
  }

  void _showTicketChatDialog(Map<String, dynamic> ticket) {
    final id = ticket['id'] ?? 0;
    final subject = ticket['subject'] ?? 'Help Desk Ticket';
    final issue = ticket['message'] ?? 'Details';
    final replies = ticket['replies'] as List<dynamic>? ?? [];
    final replyController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> sendReply() async {
              if (replyController.text.trim().isEmpty) return;

              setDialogState(() => isSubmitting = true);
              final success = await context.read<SupportProvider>().replyToTicket(
                    id,
                    replyController.text.trim(),
                  );

              if (success && mounted) {
                replyController.clear();
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Reply sent successfully!'), backgroundColor: Color(0xFF10B981)),
                );
              } else {
                setDialogState(() => isSubmitting = false);
              }
            }

            Future<void> resolve() async {
              setDialogState(() => isSubmitting = true);
              final success = await context.read<SupportProvider>().resolveTicket(id);
              if (success && mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Ticket marked as resolved!'), backgroundColor: Color(0xFF10B981)),
                );
              } else {
                setDialogState(() => isSubmitting = false);
              }
            }

            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      subject,
                      style: GoogleFonts.outfit(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (ticket['status'] != 'resolved')
                    IconButton(
                      icon: const Icon(Icons.check_circle_outline, color: Color(0xFF10B981)),
                      tooltip: 'Mark as Resolved',
                      onPressed: isSubmitting ? null : resolve,
                    ),
                ],
              ),
              content: SizedBox(
                width: double.maxFinite,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Initial Issue Description
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.cardBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Text(
                        'Issue: $issue',
                        style: GoogleFonts.inter(color: const Color(0xFFE2E8F0), fontSize: 13, height: 1.4),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Chat/Replies list
                    if (replies.isNotEmpty) ...[
                      Text(
                        'Discussion History',
                        style: GoogleFonts.outfit(color: const Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Flexible(
                        child: Container(
                          constraints: const BoxConstraints(maxHeight: 180),
                          child: ListView.separated(
                            shrinkWrap: true,
                            itemCount: replies.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final rep = replies[index];
                              final isMerchant = rep['isAdmin'] == true || rep['role'] == 'admin';
                              return Align(
                                alignment: isMerchant ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: isMerchant ? const Color(0xFF6366F1).withOpacity(0.12) : AppColors.cardOpacityBg,
                                    borderRadius: BorderRadius.only(
                                      topLeft: const Radius.circular(10),
                                      topRight: const Radius.circular(10),
                                      bottomLeft: isMerchant ? const Radius.circular(10) : Radius.zero,
                                      bottomRight: isMerchant ? Radius.zero : const Radius.circular(10),
                                    ),
                                    border: Border.all(color: isMerchant ? const Color(0xFF6366F1).withOpacity(0.3) : AppColors.cardBorder),
                                  ),
                                  child: Text(
                                    rep['message'] ?? '',
                                    style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 12),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    if (ticket['status'] != 'resolved') ...[
                      TextField(
                        controller: replyController,
                        style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Type administrative reply...',
                          hintStyle: const TextStyle(color: AppColors.textPrimary24, fontSize: 13),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close', style: TextStyle(color: AppColors.textPrimary54)),
                ),
                if (ticket['status'] != 'resolved')
                  TextButton(
                    onPressed: isSubmitting ? null : sendReply,
                    child: isSubmitting
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)))
                        : const Text('Send Reply', style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold)),
                  ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SupportProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Support Tickets', style: GoogleFonts.outfit(color: AppColors.textPrimary)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: provider.isLoading
          ? const Center(
              child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1))),
            )
          : provider.tickets.isEmpty
              ? Center(
                  child: Text(
                    'No help desk tickets pending',
                    style: GoogleFonts.inter(color: const Color(0xFF475569)),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: provider.tickets.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final ticket = provider.tickets[index];
                    final subject = ticket['subject'] ?? 'Support Request';
                    final customer = ticket['customer']?['name'] ?? ticket['customerName'] ?? 'Shopper';
                    final status = ticket['status'] ?? 'pending';

                    Color stateColor = const Color(0xFFF59E0B);
                    if (status == 'resolved') {
                      stateColor = const Color(0xFF10B981);
                    }

                    return InkWell(
                      onTap: () => _showTicketChatDialog(ticket),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.cardBg,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        subject,
                                        style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: stateColor.withOpacity(0.12),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          status.toUpperCase(),
                                          style: GoogleFonts.outfit(color: stateColor, fontWeight: FontWeight.bold, fontSize: 9),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Submitted by: $customer',
                                    style: GoogleFonts.inter(color: const Color(0xFF64748B), fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios, color: AppColors.textPrimary24, size: 14),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}