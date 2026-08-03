// src/services/emailService.ts

/**
 * এই ফাইলটি ওয়েবসাইটের সমস্ত ইমেইল নোটিফিকেশন কন্ট্রোল করবে।
 * টার্গেট ইমেইল: kon497733@gmail.com
 */

const TARGET_EMAIL = 'kon497733@gmail.com';

// মেইন ইমেইল পাঠানোর ফাংশন
export const sendEmailNotification = async (subject: string, message: string) => {
  // EmailJS Configuration (পরবর্তীতে .env ফাইলে আসল Key বসালে রিয়েল ইমেইল যাবে)
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'dummy_service';
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'dummy_template';
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'dummy_public_key';

  const templateParams = {
    to_email: TARGET_EMAIL,
    subject: subject,
    message: message,
  };

  try {
    // যদি API Key না থাকে, তবে আপাতত কনসোলে মেইলটি দেখাবে (টেস্টিংয়ের জন্য)
    if (serviceId === 'dummy_service') {
      console.log(`%c 📧 [EMAIL NOTIFICATION SENT TO: ${TARGET_EMAIL}]`, 'color: #D4AF37; font-weight: bold; font-size: 14px;');
      console.log(`📌 Subject: ${subject}`);
      console.log(`📝 Message: \n${message}`);
      console.log(`--------------------------------------------------\n`);
      return true;
    }

    // রিয়েল ইমেইল পাঠানোর API Call
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      }),
    });

    if (!response.ok) throw new Error("Failed to send email");
    return true;
  } catch (error) {
    console.error("Email Sending Error:", error);
    return false;
  }
};

// ১. নতুন অর্ডারের ইমেইল নোটিফিকেশন
export const notifyNewOrder = async (orderId: string, customerName: string, totalAmount: number) => {
  const subject = `New Order Received! (${orderId})`;
  const message = `Hello Admin,\n\nA new order has been placed on your website.\n\nOrder ID: ${orderId}\nCustomer Name: ${customerName}\nTotal Amount: ৳${totalAmount.toFixed(2)}\n\nPlease check the admin panel for more details.`;
  
  await sendEmailNotification(subject, message);
};

// ২. সেটিংস পরিবর্তনের ইমেইল নোটিফিকেশন
export const notifySettingsChange = async (sectionName: string) => {
  const subject = `Security Alert: Website Settings Changed`;
  const message = `Hello Admin,\n\nWe noticed that the "${sectionName}" settings were recently updated in your admin panel.\n\nIf this was you, no further action is needed. If you did not make this change, please check your admin account immediately.`;
  
  await sendEmailNotification(subject, message);
};

// ৩. প্রোডাক্ট পরিবর্তনের ইমেইল নোটিফিকেশন
export const notifyProductChange = async (action: 'Added' | 'Updated' | 'Deleted', productName: string) => {
  const subject = `Product Inventory Update: ${action}`;
  const message = `Hello Admin,\n\nA product has been ${action.toLowerCase()} in your store.\n\nProduct Name: ${productName}\nAction: ${action}\n\nCheck your Products Management page for current inventory status.`;
  
  await sendEmailNotification(subject, message);
};