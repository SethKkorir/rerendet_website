import os
import re

def replace_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Context-aware replacements
    # 1. Rerendet Coffee Estate -> Rerendet Coffee
    content = re.sub(r'Rerendet Coffee Estate', 'Rerendet Coffee', content, flags=re.IGNORECASE)
    # 2. Rerendet Estate -> Rerendet Coffee
    content = re.sub(r'Rerendet Estate', 'Rerendet Coffee', content, flags=re.IGNORECASE)
    # 3. highland estates -> highland farms
    content = re.sub(r'highland estates', 'highland farms', content, flags=re.IGNORECASE)
    # 4. estate taxes -> local taxes
    content = re.sub(r'estate taxes', 'local taxes', content, flags=re.IGNORECASE)
    # 5. any remaining "Estate" (if it looks like a proper noun)
    content = re.sub(r'Estate Associate', 'Associate', content, flags=re.IGNORECASE)
    
    # Generic "estate" (be careful with code variables, but let's see)
    # For now, let's only do the ones above which are likely user-facing strings.
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# List of files from grep (cleaned up)
files = [
    r'client\src\pages\Signup.jsx',
    r'client\src\pages\Login.jsx',
    r'client\src\pages\OrderConfirmation.js',
    r'client\src\pages\Orders.jsx',
    r'client\src\context\PaymentContext.js',
    r'client\src\components\Testimonials\Testimonials.jsx',
    r'client\src\components\Profile\Profile.jsx',
    r'client\src\context\AppContext.js',
    r'client\src\components\Product\ProductDetail.jsx',
    r'client\src\components\PaymentProcessingModal\PaymentProcessingModal.jsx',
    r'client\src\components\Payment\PaymentMethodSelect.js',
    r'client\src\components\Payment\MpesaPayment.js',
    r'client\src\components\Payment\MobileMoneyPayment.js',
    r'client\src\components\OrderTracking\OrderTracking.jsx',
    r'client\src\components\OrderConfirmation\OrderConfirmation.jsx',
    r'client\src\components\Newsletter\Newsletter.jsx',
    r'client\src\components\Navbar\Navbar.jsx',
    r'client\src\components\Contact\Contact.jsx',
    r'client\src\components\Modals\PaymentModal.jsx',
    r'client\src\components\CoffeeShop\CoffeeShop.jsx',
    r'client\src\components\Checkout\OrderReceipt.jsx',
    r'client\src\components\Checkout\Confirmation.jsx',
    r'client\src\components\Checkout\Checkout.jsx',
    r'client\src\components\BackToTop\BackToTop.jsx',
    r'client\src\components\Auth\SessionLock.jsx',
    r'client\src\components\Auth\Register.jsx',
    r'client\src\components\Auth\AuthModal.jsx',
    r'client\src\components\Auth\Login.jsx',
    r'client\src\components\Auth\ReauthModal.jsx',
    r'client\src\components\Admin\AdminLogin.jsx',
    r'client\src\components\Admin\AdminLayout.jsx',
    r'client\src\components\Admin\ActivityLogs.jsx',
    r'client\src\components\Admin\UsersManagement.jsx',
    r'utils\emailTemplates.js',
    r'client\src\components\Admin\Settings.jsx',
    r'client\src\components\Admin\ProductsManagement.jsx',
    r'client\src\components\Admin\OrdersManagement.jsx',
    r'client\src\components\Admin\Marketing.jsx',
    r'client\src\components\Admin\Orders.jsx',
    r'client\src\components\Admin\ContactsManagement.jsx',
    r'client\src\components\Account\WalletTab.jsx',
    r'client\src\components\Admin\Dashboard.jsx',
    r'client\src\components\Account\SecurityTab.jsx',
    r'client\src\components\Admin\CommandPalette.jsx'
]

base_dir = r'c:\Users\Kipchumba\Documents\rerendet_website-1'

for f in files:
    full_path = os.path.join(base_dir, f)
    if os.path.exists(full_path):
        print(f"Processing {f}...")
        replace_in_file(full_path)
    else:
        print(f"Skipping {f} (not found)")
