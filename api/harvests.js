// واجهة برمجية للتحصيلات
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
        return await getHarvests(req, res, user.id);
      case 'POST':
        return await createHarvest(req, res, user.id);
      case 'PUT':
        return await updateHarvest(req, res, user.id);
      case 'DELETE':
        return await deleteHarvest(req, res, user.id);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Harvests API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// دالة لجلب التحصيلات
async function getHarvests(req, res, userId) {
  try {
    const { limit = 50, offset = 0, start_date, end_date } = req.query;

    let query = supabase
      .from('harvests')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // إضافة فلتر حسب التاريخ إذا تم تحديده
    if (start_date) {
      query = query.gte('date', start_date);
    }

    if (end_date) {
      query = query.lte('date', end_date);
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
    console.error('Error fetching harvests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch harvests',
      error: error.message
    });
  }
}

// دالة لإنشاء تحصيل جديد
async function createHarvest(req, res, userId) {
  try {
    const { amount, date, description, customer_name, notes } = req.body;

    if (!amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Amount and date are required'
      });
    }

    const { data, error } = await supabase
      .from('harvests')
      .insert([{
        user_id: userId,
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        description: description || '',
        customer_name: customer_name || '',
        notes: notes || ''
      }])
      .select();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Harvest created successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating harvest:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create harvest',
      error: error.message
    });
  }
}

// دالة لتحديث تحصيل موجود
async function updateHarvest(req, res, userId) {
  try {
    const { id } = req.query;
    const { amount, date, description, customer_name, notes } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Harvest ID is required'
      });
    }

    // التحقق من أن التحصيل يعود للمستخدم الحالي
    const { data: existingHarvest, error: fetchError } = await supabase
      .from('harvests')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingHarvest) {
      return res.status(404).json({
        success: false,
        message: 'Harvest not found or access denied'
      });
    }

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (date !== undefined) updateData.date = new Date(date).toISOString();
    if (description !== undefined) updateData.description = description;
    if (customer_name !== undefined) updateData.customer_name = customer_name;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('harvests')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Harvest updated successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error updating harvest:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update harvest',
      error: error.message
    });
  }
}

// دالة لحذف تحصيل
async function deleteHarvest(req, res, userId) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Harvest ID is required'
      });
    }

    // التحقق من أن التحصيل يعود للمستخدم الحالي
    const { data: existingHarvest, error: fetchError } = await supabase
      .from('harvests')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingHarvest) {
      return res.status(404).json({
        success: false,
        message: 'Harvest not found or access denied'
      });
    }

    const { error } = await supabase
      .from('harvests')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Harvest deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting harvest:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete harvest',
      error: error.message
    });
  }
}
