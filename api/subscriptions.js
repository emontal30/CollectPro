// واجهة برمجية للاشتراكات
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
        return await getSubscriptions(req, res, user.id);
      case 'POST':
        return await createSubscription(req, res, user.id);
      case 'PUT':
        return await updateSubscription(req, res, user.id);
      case 'DELETE':
        return await deleteSubscription(req, res, user.id);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Subscriptions API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// دالة لجلب الاشتراكات
async function getSubscriptions(req, res, userId) {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    let query = supabase
      .from('subscriptions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // إضافة فلتر حسب الحالة إذا تم تحديده
    if (status) {
      query = query.eq('status', status);
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
    console.error('Error fetching subscriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message
    });
  }
}

// دالة لإنشاء اشتراك جديد
async function createSubscription(req, res, userId) {
  try {
    const { plan_name, price, start_date, end_date, payment_method, payment_id } = req.body;

    if (!plan_name || !price || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Plan name, price, and start date are required'
      });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: userId,
        plan_name,
        price: parseFloat(price),
        start_date: new Date(start_date).toISOString(),
        end_date: end_date ? new Date(end_date).toISOString() : null,
        status: 'active',
        payment_method: payment_method || '',
        payment_id: payment_id || ''
      }])
      .select();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
      error: error.message
    });
  }
}

// دالة لتحديث اشتراك موجود
async function updateSubscription(req, res, userId) {
  try {
    const { id } = req.query;
    const { plan_name, price, start_date, end_date, status, payment_method, payment_id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    // التحقق من أن الاشتراك يعود للمستخدم الحالي
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingSubscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or access denied'
      });
    }

    const updateData = {};
    if (plan_name !== undefined) updateData.plan_name = plan_name;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (start_date !== undefined) updateData.start_date = new Date(start_date).toISOString();
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date).toISOString() : null;
    if (status !== undefined) updateData.status = status;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (payment_id !== undefined) updateData.payment_id = payment_id;

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: error.message
    });
  }
}

// دالة لحذف اشتراك
async function deleteSubscription(req, res, userId) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    // التحقق من أن الاشتراك يعود للمستخدم الحالي
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingSubscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or access denied'
      });
    }

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete subscription',
      error: error.message
    });
  }
}
