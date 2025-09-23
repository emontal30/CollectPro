// واجهة برمجية للمدفوعات
const { createClient } = require('@supabase/supabase-js');

// استخدام Supabase من الكائن العام
const supabase = global.supabase;

module.exports = async function handler(req, res) {
  // تعيين رؤوس CORS للسماح بالطلبات من مصادر مختلفة
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // التعامل مع طلبات OPTIONS المسبقة
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // التحقق من صلاحية المستخدم
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided'
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token'
      });
    }

    const { action } = req.query;

    switch (req.method) {
      case 'GET':
        return await getPayments(req, res, user.id);
      case 'POST':
        return await createPayment(req, res, user.id);
      case 'PUT':
        return await updatePayment(req, res, user.id);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Payments API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// دالة لجلب المدفوعات
async function getPayments(req, res, userId) {
  try {
    const { limit = 50, offset = 0, status, subscription_id } = req.query;

    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('payment_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // إضافة فلتر حسب الحالة إذا تم تحديده
    if (status) {
      query = query.eq('status', status);
    }

    // إضافة فلتر حسب معرف الاشتراك إذا تم تحديده
    if (subscription_id) {
      query = query.eq('subscription_id', subscription_id);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      data,
      count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
}

// دالة لإنشاء مدفوعة جديدة
async function createPayment(req, res, userId) {
  try {
    const { amount, payment_method, transaction_id, status, subscription_id } = req.body;

    if (!amount || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Amount and payment method are required'
      });
    }

    // التحقق من وجود الاشتراك إذا تم تحديده
    if (subscription_id) {
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscription_id)
        .eq('user_id', userId)
        .single();

      if (subscriptionError || !subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found or access denied'
        });
      }
    }

    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        amount: parseFloat(amount),
        payment_method,
        transaction_id: transaction_id || '',
        status: status || 'completed',
        subscription_id: subscription_id || null
      }])
      .select();

    if (error) {
      throw error;
    }

    // تحديث حالة الاشتراك إذا تم تحديده وكانت المدفوعة مكتملة
    if (subscription_id && status === 'completed') {
      await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', subscription_id);
    }

    return res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: error.message
    });
  }
}

// دالة لتحديث مدفوعة موجودة
async function updatePayment(req, res, userId) {
  try {
    const { id } = req.query;
    const { amount, payment_method, transaction_id, status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    // التحقق من أن المدفوعة تعود للمستخدم الحالي
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or access denied'
      });
    }

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (transaction_id !== undefined) updateData.transaction_id = transaction_id;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }

    // تحديث حالة الاشتراك إذا تغيرت حالة المدفوعة
    if (status !== undefined && existingPayment.subscription_id) {
      if (status === 'completed') {
        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', existingPayment.subscription_id);
      } else if (status === 'failed' || status === 'cancelled') {
        await supabase
          .from('subscriptions')
          .update({ status: 'inactive' })
          .eq('id', existingPayment.subscription_id);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payment',
      error: error.message
    });
  }
}
