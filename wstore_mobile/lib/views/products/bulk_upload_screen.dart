import 'package:flutter/material.dart';
import 'package:wstore_mobile/config/theme_config.dart';
import 'package:google_fonts/google_fonts.dart';

class BulkUploadScreen extends StatelessWidget {
  const BulkUploadScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Bulk Upload Guide', style: GoogleFonts.outfit(color: AppColors.textPrimary)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Bulk Upload Products Catalog', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            Text(
              'Add hundreds of items to your wstore catalog in a single action by constructing a standardized CSV file.',
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B), height: 1.5),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('CSV Column Schema', style: GoogleFonts.outfit(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 12),
                  const Divider(color: AppColors.textPrimary10),
                  const SizedBox(height: 12),
                  _buildSchemaRow('name', 'Product title (Required)'),
                  _buildSchemaRow('price', 'Numeric retail price (Required)'),
                  _buildSchemaRow('stock', 'Initial units count (Default: 0)'),
                  _buildSchemaRow('categoryId', 'Database category ID (Required)'),
                  _buildSchemaRow('description', 'Detailed description (Optional)'),
                  _buildSchemaRow('retailerId', 'Merchant SKU index (Optional)'),
                ],
              ),
            ),
            const SizedBox(height: 30),
            Text('Sample CSV Construction', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.cardBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: const Text(
                'name,price,stock,categoryId,description\n'
                'Cotton Polo Tee,999,50,3,100% premium cotton shirt\n'
                'Blue Denim Jeans,1999,30,3,Classic stretchable slim fit jeans',
                style: TextStyle(color: Color(0xFF818CF8), fontFamily: 'Courier', fontSize: 11),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSchemaRow(String col, String desc) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(col, style: const TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Courier')),
          Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
        ],
      ),
    );
  }
}