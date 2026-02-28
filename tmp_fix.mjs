import fs from 'fs';

const content = fs.readFileSync('controllers/adminController.js', 'utf8');

const oldExport = `export {
  getDashboardStats,
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getUsers,
  getContacts,
  updateContactStatus,
  replyContact,
  deleteContact,
  getSettings,
  updateSettings,
  getSalesAnalytics,
  getActivityLogs,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  testEmailConfig,
  checkNewOrders,
  getAdminOverview
};`;

const newExport = `export {
  getDashboardStats,
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getUsers,
  getContacts,
  updateContactStatus,
  replyContact,
  deleteContact,
  getSettings,
  updateSettings,
  getSalesAnalytics,
  getActivityLogs,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  testEmailConfig,
  checkNewOrders,
  getAdminOverview,
  getAbandonedCartsReport,
  getPaymentsReport,
  getCustomersReport,
  getInventoryReport,
  getCouponsReport,
  exportOrdersCSV,
  exportCustomersCSV
};`;

// The file has mixed line endings — normalize search
const normalised = content.replace(/\r\n/g, '\n');
if (!normalised.includes(oldExport.replace(/\r\n/g, '\n'))) {
    console.error('Could not find export block to replace!');
    console.log('Looking for:\n', oldExport.slice(0, 100));
    // Try line-by-line search
    const lines = normalised.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === 'export {') {
            console.log('Found export { at line', i + 1);
            // Find closing
            let end = i;
            while (end < lines.length && !lines[end].includes('};')) end++;
            console.log('Closing }; at line', end + 1);
            console.log('Block:\n', lines.slice(i, end + 1).join('\n'));
        }
    }
    process.exit(1);
}

const newContent = normalised.replace(oldExport.replace(/\r\n/g, '\n'), newExport);
fs.writeFileSync('controllers/adminController.js', newContent, 'utf8');
console.log('✅ Exports fixed! Size:', newContent.length);
